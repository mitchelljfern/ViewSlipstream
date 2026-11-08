// Slipstream transactional emails (Supabase Edge Function, Deno).
//
// Called five ways:
//   { rsvp_id }      by a database trigger right after an RSVP is created or changes status:
//                    "You're in", "You're on the waiting list" or "A seat opened up".
//   { sweep: true }  every 5 minutes by pg_cron: "It's showtime" (with the access code if the
//                    client chose email), the day-before reminder for in-person shows, and the
//                    thank-you the morning after.
//   { type: "email.*", data: { email_id } }   Resend delivery events (opened, clicked, bounced…),
//                    written onto the matching email_log row.
//   { preview } / { test }   from the Client Hub only (x-hub-token header = settings.hub_token):
//                    render an email for the editor, or send one test copy to the editor.
//
// The words come from public.email_templates, with per-show changes in public.email_overrides
// (different words, a different send time, or cancelled). Automatic parts (access code, venue,
// calendar link, account box) stay here.
//
// Every send is recorded in public.email_log, and nothing is ever sent twice for the same
// RSVP and type, so calling this again is always safe.
//
// Secrets: RESEND_API_KEY (required), EMAIL_FROM, SITE_URL. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Going live: set settings.email_recipients to "everyone" (it's "test" until then).
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("EMAIL_FROM") ?? "View Slipstream <hello@viewslipstream.com>";
const SITE = (Deno.env.get("SITE_URL") ?? "https://viewslipstream.netlify.app").replace(/\/$/, "");
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

type Show = Record<string, any>;
type Rsvp = Record<string, any>;
type Kind = "rsvp" | "waitlist" | "promoted" | "live" | "reminder" | "thanks";
type Words = { subject: string; heading: string; message: string; button: string | null };
type Override = Partial<Words> & { send_at?: string | null; cancelled?: boolean };
const KINDS: Kind[] = ["rsvp", "waitlist", "promoted", "live", "reminder", "thanks"];

const TZ = "America/Los_Angeles";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(new Date(iso));
const day = (iso: string) => fmt(iso, { weekday: "long", month: "long", day: "numeric" });
const time = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace("12 AM", "midnight");
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const isStreaming = (s: Show) => ["streaming", "paid", "live"].includes(s.kind);
const endOf = (s: Show) => new Date(s.ends_at ?? new Date(new Date(s.starts_at).getTime() + 3 * 3600e3).toISOString());

// Built-in words, used when a template row is missing.
const DEFAULTS: Record<Kind, Words> = {
  rsvp: { subject: "You're in: {title} on Slipstream", heading: "You're in, {first_name}.", message: "Your {seats} for {title} is saved. {schedule}", button: "Add to calendar" },
  promoted: { subject: "A seat opened up: you're in for {title}", heading: "Good news, {first_name}. You're in.", message: "A seat opened up for {title}. {schedule}", button: "Add to calendar" },
  waitlist: { subject: "You're on the waiting list: {title}", heading: "You're on the waiting list, {first_name}.", message: "{title} is full right now. You're on the waiting list for {seats}.", button: null },
  live: { subject: "It's showtime: {title} is streaming now", heading: "{title} is live.", message: "Watch any time before {ends} PT. The button below takes you to the screening room. Sign in with your Slipstream account to watch.", button: "Watch now" },
  reminder: { subject: "Tomorrow: {title}", heading: "See you tomorrow, {first_name}.", message: "{title} screens {date} at {time}.", button: "Show details" },
  thanks: { subject: "Thank you for watching {title}", heading: "Thanks for joining us.", message: "We hope you enjoyed {title}.", button: null },
};

async function wordsFor(kind: Kind, slug: string, draft?: Partial<Words>): Promise<{ words: Words; override: Override | null }> {
  const [{ data: t }, { data: o }] = await Promise.all([
    db.from("email_templates").select("subject,heading,message,button").eq("type", kind).maybeSingle(),
    db.from("email_overrides").select("*").eq("show_slug", slug).eq("type", kind).maybeSingle(),
  ]);
  const base: Words = { ...DEFAULTS[kind], ...(t ?? {}) };
  const pickSet = (x: any) => Object.fromEntries(["subject", "heading", "message", "button"].filter((k) => x && x[k] != null && x[k] !== "").map((k) => [k, x[k]]));
  return { words: { ...base, ...pickSet(o), ...pickSet(draft) } as Words, override: o ?? null };
}

// {placeholders} → values. Unknown ones are left as typed so a typo is visible in the preview.
function vars(show: Show, r: Rsvp) {
  const seatsWord = r.seats > 1 ? `${r.seats} seats` : show.kind === "in-person" ? "1 seat" : "spot";
  const schedule = show.starts_at
    ? isStreaming(show) && show.ends_at
      ? `It streams ${day(show.starts_at)} at ${time(show.starts_at)} through ${day(show.ends_at)} at ${time(show.ends_at)}, Pacific time.`
      : `It screens ${day(show.starts_at)} at ${time(show.starts_at)}${show.venue_name ? `, ${show.venue_name}` : ""}.`
    : "";
  return {
    first_name: r.first_name || "there", title: show.title, seats: seatsWord, schedule,
    date: show.starts_at ? day(show.starts_at) : "", time: show.starts_at ? time(show.starts_at) : "",
    ends: show.ends_at ? `${day(show.ends_at)} at ${time(show.ends_at)}` : "", venue: show.venue_name ?? "",
  } as Record<string, string>;
}
const fill = (s: string, v: Record<string, string>) => String(s ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
// Plain text in the editor: a blank line starts a paragraph, **bold** is bold.
const paras = (s: string) => esc(s).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>"));

// ---------- layout (same look as the site's email previews) ----------
const FONT = "'Outfit','Helvetica Neue',Helvetica,Arial,sans-serif";
const P = (h: string, last = false) => `<p style="margin:0 0 ${last ? 0 : 14}px;font-size:15px;line-height:1.55;color:#333">${h}</p>`;
const box = (title: string, body: string, tint = false) =>
  `<div style="border:1px solid #E3E6EA;border-radius:12px;padding:14px 16px;font-size:14px;color:#333;margin:0 0 14px;${tint ? "background:#F5F7FA;" : ""}"><b style="display:block;color:#141414;margin-bottom:6px">${title}</b>${body}</div>`;
const btn = (label: string, href: string, dark = false) =>
  `<a href="${href}" style="display:block;text-align:center;line-height:50px;border-radius:12px;background:${dark ? "#141414" : "#1E73BE"};color:#fff;font-weight:600;font-size:16px;text-decoration:none;margin:0 0 14px">${esc(label)}</a>`;
const small = (h: string) => `<p style="margin:0;font-size:13px;line-height:1.55;color:#6B7280">${h}</p>`;

function layout(show: Show, label: string, inner: string) {
  const hero = show.hero_image ? `<img src="${show.hero_image}" alt="" style="display:block;width:100%;height:auto">` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#000;font-family:${FONT}"><div style="max-width:600px;margin:0 auto">
<div style="background:#fff;color:#141414;border-radius:16px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000"><tr>
<td style="padding:22px 28px"><img src="${SITE}/slipstream-logo.png" alt="Slipstream" style="height:11px;width:auto"></td>
<td align="right" style="padding:22px 28px;font:600 11px/1 ${FONT};letter-spacing:.1em;text-transform:uppercase;color:#A9AFB7">${label}</td></tr></table>
${hero}<div style="padding:26px 28px 28px">${inner}</div>
<div style="padding:18px 28px 24px;border-top:1px solid #E3E6EA;font-size:12px;color:#6B7280;line-height:1.5">Slipstream c/o Satiated Productions, Los Angeles, CA · You're receiving this because you RSVP'd with this address. <a href="${SITE}/account/" style="color:#1E73BE">Email preferences</a></div>
</div></div></body></html>`;
}
const h1 = (t: string) => `<h1 style="margin:0 0 14px;font:600 26px/1.15 ${FONT};letter-spacing:-.02em;color:#141414">${t}</h1>`;

function build(kind: Kind, show: Show, r: Rsvp, code: string | null, hasAccount: boolean, w: Words) {
  const v = vars(show, r);
  const page = `${SITE}/${show.slug}/`;
  const seats = r.seats > 1 ? `${r.seats} seats` : "seat";
  const head = h1(esc(fill(w.heading, v)));
  const body = paras(fill(w.message, v)).map((p) => P(p)).join("");
  const label = w.button ? fill(w.button, v) : "";
  const account = hasAccount ? "" : isStreaming(show)
    ? box("Set up your free account to watch", `You'll need a free Slipstream account to watch. Your name and email are already in, so you only pick a password.<br><a href="${SITE}/sign-in/?mode=create&next=/${show.slug}/" style="color:#1E73BE;font-weight:600">Create my free account</a>`, true)
    : box("Want one-tap RSVPs next time?", `Create a free Slipstream account. Your name and email are already in, so you only pick a password.<br><a href="${SITE}/sign-in/?mode=create" style="color:#1E73BE;font-weight:600">Create my free account</a>`, true);
  const checkIn = r.seats === 2 ? " for both seats" : r.seats > 2 ? ` for all ${r.seats} seats` : "";
  const subject = fill(w.subject, v);

  switch (kind) {
    case "rsvp":
    case "promoted":
      return { subject, html: layout(show, "RSVP confirmed", head + body +
        box("What happens next", show.kind === "in-person" ? `Bring this email to check in${checkIn}. We'll send a reminder the day before.` : "We'll email you the moment it goes live, with your viewing link and access code. Nothing to do until then.") +
        (label ? btn(label, `${page}calendar.ics`) : "") + account +
        small(`Can't make it? <a href="${SITE}/sign-in/?next=/${show.slug}/" style="color:#1E73BE">Release your ${seats}</a> so someone else can have ${r.seats > 1 ? "them" : "it"}.`)) };
    case "waitlist":
      return { subject, html: layout(show, "Waiting list", head + body +
        box("What happens next", `If ${r.seats > 1 ? "seats open" : "a seat opens"} up, we'll email you right away with your confirmation. Nothing to do until then.`) +
        small(`Plans changed? <a href="${SITE}/sign-in/?next=/${show.slug}/" style="color:#1E73BE">Leave the waiting list</a>.`)) };
    case "reminder":
      return { subject, html: layout(show, "See you tomorrow", head + body +
        (show.venue_name ? box("Where", `${esc(show.venue_name)}<br>${esc(show.venue_address ?? "")}`) : "") +
        box("Checking in", `Show this email at the door${checkIn}.`) +
        (label ? btn(label, page) : "") +
        small(`Can't make it after all? <a href="${SITE}/sign-in/?next=/${show.slug}/" style="color:#1E73BE">Release your ${seats}</a>.`)) };
    case "live":
      return { subject, html: layout(show, "Now showing", head + body +
        (hasAccount ? "" : P("RSVP'd without an account? Create it in the screening room with this email. It only takes a password.")) +
        (show.conversation_line ? P(`The film and the conversation are both in the screening room, and the same code works for each.`) : "") +
        btn(label || "Watch now", `${page}#player`) +
        (code ? box("Your access code", `<span style="display:block;font:600 20px/1.2 ${FONT};letter-spacing:.16em;color:#141414;margin-bottom:6px">${esc(code)}</span><span style="color:#6B7280">Tap play, then paste this into the player.</span>`, true)
              : box("Your access code", "It's waiting above the player when you open the screening room. Tap play, then paste it in.")) +
        small("Works on phone, tablet and laptop, and casts to a TV. Any trouble? Just reply to this email.")) };
    case "thanks":
      return { subject, html: layout(show, "Thank you", head + body +
        (label ? btn(label, `${SITE}/`) : "") +
        small(`Have 30 seconds? <a href="${SITE}/" style="color:#1E73BE">Tell us how it went</a>.`)) };
  }
}

const plain = (html: string) => html.replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2: $1").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|div|h1|td)>/g, "\n\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&quot;/g, "'").replace(/\n{3,}/g, "\n\n").trim();

// Test mode: until settings.email_recipients is "everyone", only Social Upgrades addresses get email.
// Anything else is skipped and not logged, so it still sends once the site goes live.
const TEST_DOMAINS = ["@socialupgrades.com"];
async function testOnly() {
  const { data } = await db.from("settings").select("value").eq("key", "email_recipients").maybeSingle();
  return data?.value !== "everyone";
}

async function resend(payload: Record<string, unknown>, key?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: JSON.stringify({ from: FROM, ...payload }),
  });
  return { ok: res.ok, status: res.status, out: await res.json().catch(() => ({})) };
}

async function send(kind: Kind, show: Show, r: Rsvp, code: string | null) {
  if (await testOnly() && !TEST_DOMAINS.some((d) => String(r.email).toLowerCase().endsWith(d))) return "test-mode";
  // Never twice. A failed send doesn't count, so the next sweep tries it again.
  const { data: seen } = await db.from("email_log").select("id").eq("rsvp_id", r.id).eq("type", kind).neq("status", "failed").limit(1);
  if (seen?.length) return "skipped";
  const { words, override } = await wordsFor(kind, show.slug);
  if (override?.cancelled) return "cancelled";
  const mail = build(kind, show, r, code, Boolean(r.user_id), words);
  if (!mail) return "skipped";
  if (!RESEND) return "no-key";
  const { data: log } = await db.from("email_log").insert({ rsvp_id: r.id, show_slug: show.slug, email: r.email, type: kind, status: "queued", subject: mail.subject }).select("id").single();
  const res = await resend({ to: [r.email], subject: mail.subject, html: mail.html, text: plain(mail.html), tags: [{ name: "type", value: kind }, { name: "show", value: show.slug.slice(0, 250) }] }, `${r.id}-${kind}`);
  await db.from("email_log").update(res.ok ? { status: "sent", provider_id: res.out.id ?? null, last_event: "sent" } : { status: "failed" }).eq("id", log!.id);
  return res.ok ? "sent" : `failed ${res.status}`;
}

async function accessCode(slug: string) {
  const [{ data: mode }, { data: a }] = await Promise.all([
    db.from("settings").select("value").eq("key", "access_mode").maybeSingle(),
    db.from("show_access").select("access_code").eq("show_slug", slug).maybeSingle(),
  ]);
  const m = (mode?.value as string) ?? "email";
  return m === "page" ? null : a?.access_code ?? null;
}

// When each scheduled email is due. A send_at on the show's override replaces the default.
function due(kind: Kind, show: Show, o: Override | undefined, now: number) {
  const H = 3600e3;
  const start = new Date(show.starts_at).getTime(), end = endOf(show).getTime();
  const at = o?.send_at ? new Date(o.send_at).getTime() : null;
  if (kind === "live") return isStreaming(show) && now < end && now >= (at ?? start);
  if (kind === "reminder") return show.kind === "in-person" && start - now > 2 * H && (at != null ? now >= at : start - now <= 26 * H);
  if (kind === "thanks") { const from = at ?? end + 10 * H; return now >= from && now < from + 3 * 24 * H; }
  return false;
}

async function sweep() {
  const now = Date.now();
  const H = 3600e3;
  const { data: shows } = await db.from("shows").select("*").in("status", ["published", "archived"])
    .gte("starts_at", new Date(now - 30 * 24 * H).toISOString()).lte("starts_at", new Date(now + 60 * 24 * H).toISOString());
  const slugs = (shows ?? []).map((s) => s.slug);
  const { data: ovs } = slugs.length ? await db.from("email_overrides").select("*").in("show_slug", slugs) : { data: [] as Override[] };
  const ov = (slug: string, k: Kind) => (ovs as any[] ?? []).find((o) => o.show_slug === slug && o.type === k) as Override | undefined;
  const out: string[] = [];
  for (const show of shows ?? []) {
    const jobs = (["live", "reminder", "thanks"] as Kind[]).filter((k) => !ov(show.slug, k)?.cancelled && due(k, show, ov(show.slug, k), now));
    if (!jobs.length) continue;
    const { data: rsvps } = await db.from("rsvps").select("*").eq("show_slug", show.slug).eq("status", "confirmed");
    const code = jobs.includes("live") ? await accessCode(show.slug) : null;
    for (const kind of jobs) for (const r of rsvps ?? []) out.push(`${show.slug} ${kind} ${await send(kind, show, r, code)}`);
  }
  return out;
}

// ---------- Resend delivery events ----------
// The provider id is only known to Resend and our own log, so an event for an id we never sent is ignored.
async function track(ev: any) {
  const id = ev?.data?.email_id;
  if (!id) return "no id";
  const at = ev.created_at ?? new Date().toISOString();
  const { data: row } = await db.from("email_log").select("id,opened_at,clicked_at,delivered_at").eq("provider_id", id).maybeSingle();
  if (!row) return "unknown";
  const t = String(ev.type).replace(/^email\./, "");
  const patch: Record<string, unknown> = { last_event: t };
  if (t === "delivered" && !row.delivered_at) patch.delivered_at = at;
  if (t === "opened" && !row.opened_at) patch.opened_at = at;
  if (t === "clicked") { if (!row.clicked_at) patch.clicked_at = at; if (!row.opened_at) patch.opened_at = at; }
  if (t === "bounced") { patch.bounced_at = at; patch.status = "bounced"; }
  if (t === "complained") { patch.complained_at = at; patch.status = "complained"; }
  await db.from("email_log").update(patch).eq("id", row.id);
  return t;
}

// ---------- Client Hub: preview and test ----------
async function hubAllowed(req: Request) {
  const token = req.headers.get("x-hub-token") ?? "";
  if (!token) return false;
  const { data } = await db.from("settings").select("value").eq("key", "hub_token").maybeSingle();
  return Boolean(data?.value) && data!.value === token;
}
async function render(p: any) {
  const kind = p.type as Kind;
  if (!KINDS.includes(kind)) throw new Error("Unknown email type.");
  const { data: show } = p.show_slug ? await db.from("shows").select("*").eq("slug", p.show_slug).maybeSingle() : { data: null };
  const sample: Show = show ?? { slug: "sample-show", title: "Sample Show", kind: kind === "reminder" ? "in-person" : "streaming",
    starts_at: new Date(Date.now() + 7 * 864e5).toISOString(), ends_at: new Date(Date.now() + 13 * 864e5).toISOString(), venue_name: "The Culver Theater", venue_address: "9500 Culver Blvd, Culver City, CA" };
  const r: Rsvp = { id: "preview", first_name: p.first_name || "Alex", email: p.to || "guest@example.com", seats: sample.kind === "in-person" ? 2 : 1, user_id: null };
  const { words } = await wordsFor(kind, sample.slug, p.fields);
  return build(kind, sample, r, kind === "live" ? "SAMPLE1" : null, false, words)!;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const body = await req.json().catch(() => ({}));
  try {
    if (typeof body.type === "string" && body.type.startsWith("email.")) return Response.json({ result: await track(body) });
    if (body.preview || body.test) {
      if (!(await hubAllowed(req))) return Response.json({ error: "Not allowed." }, { status: 403 });
      const p = body.preview ?? body.test;
      const mail = await render(p);
      if (body.preview) return Response.json({ subject: mail.subject, html: mail.html });
      if (!p.to || !/^[^@\s]+@[^@\s]+$/.test(p.to)) return Response.json({ error: "No address to send the test to." }, { status: 400 });
      const res = await resend({ to: [p.to], subject: "[Test] " + mail.subject, html: mail.html, text: plain(mail.html), tags: [{ name: "type", value: "test" }] });
      return Response.json(res.ok ? { result: "sent" } : { error: "Resend said " + res.status }, { status: res.ok ? 200 : 502 });
    }
    if (body.sweep) return Response.json({ results: await sweep() });
    if (body.rsvp_id) {
      const { data: r } = await db.from("rsvps").select("*").eq("id", body.rsvp_id).maybeSingle();
      if (!r || r.status === "cancelled") return Response.json({ result: "nothing to send" });
      const { data: show } = await db.from("shows").select("*").eq("slug", r.show_slug).maybeSingle();
      if (!show) return Response.json({ result: "no show" });
      // RSVP'd while it's already streaming: skip "we'll email you when it goes live" and send the showtime email now
      // (unless the showtime email is cancelled for this show).
      const now = Date.now();
      const { data: lo } = await db.from("email_overrides").select("cancelled,send_at").eq("show_slug", show.slug).eq("type", "live").maybeSingle();
      const liveNow = r.status === "confirmed" && !lo?.cancelled && due("live", show, lo ?? undefined, now);
      if (liveNow) return Response.json({ result: await send("live", show, r, await accessCode(show.slug)) });
      const kind: Kind = r.status === "waitlisted" ? "waitlist" : body.previous_status === "waitlisted" ? "promoted" : "rsvp";
      return Response.json({ result: await send(kind, show, r, null) });
    }
    return Response.json({ result: "nothing to do" });
  } catch (e) {
    console.error(e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
