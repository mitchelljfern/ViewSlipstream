// Slipstream transactional emails (Supabase Edge Function, Deno).
//
// Called two ways:
//   { rsvp_id }      by a database trigger right after an RSVP is created or changes status:
//                    sends "You're in", "You're on the waiting list" or "A seat opened up".
//   { sweep: true }  every 5 minutes by pg_cron: "It's showtime" (with the access code if the
//                    client chose email), the day-before reminder for in-person shows, and the
//                    thank-you the morning after.
// Every send is recorded in public.email_log, and nothing is ever sent twice for the same
// RSVP and type, so calling this again is always safe.
//
// Secrets (Supabase > Edge Functions > Secrets): RESEND_API_KEY (required),
// EMAIL_FROM (e.g. "Slipstream <hello@viewslipstream.com>"), SITE_URL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("EMAIL_FROM") ?? "Slipstream <hello@dashboard.socialupgrades.com>";
const SITE = (Deno.env.get("SITE_URL") ?? "https://viewslipstream.netlify.app").replace(/\/$/, "");
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

type Show = Record<string, any>;
type Rsvp = Record<string, any>;
type Kind = "rsvp" | "waitlist" | "promoted" | "live" | "reminder" | "thanks";

const TZ = "America/Los_Angeles";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(new Date(iso));
const day = (iso: string) => fmt(iso, { weekday: "long", month: "long", day: "numeric" });
const time = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit" }).replace(":00", "").replace("12 AM", "midnight");
const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const isStreaming = (s: Show) => ["streaming", "paid", "live"].includes(s.kind);
const endOf = (s: Show) => new Date(s.ends_at ?? new Date(new Date(s.starts_at).getTime() + 3 * 3600e3).toISOString());

// ---------- templates (same look as the site's email previews) ----------
const FONT = "'Outfit','Helvetica Neue',Helvetica,Arial,sans-serif";
const P = (h: string, last = false) => `<p style="margin:0 0 ${last ? 0 : 14}px;font-size:15px;line-height:1.55;color:#333">${h}</p>`;
const box = (title: string, body: string, tint = false) =>
  `<div style="border:1px solid #E3E6EA;border-radius:12px;padding:14px 16px;font-size:14px;color:#333;margin:0 0 14px;${tint ? "background:#F5F7FA;" : ""}"><b style="display:block;color:#141414;margin-bottom:6px">${title}</b>${body}</div>`;
const btn = (label: string, href: string, dark = false) =>
  `<a href="${href}" style="display:block;text-align:center;line-height:50px;border-radius:12px;background:${dark ? "#141414" : "#1E73BE"};color:#fff;font-weight:600;font-size:16px;text-decoration:none;margin:0 0 14px">${label}</a>`;
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

async function build(kind: Kind, show: Show, r: Rsvp, code: string | null, hasAccount: boolean) {
  const page = `${SITE}/${show.slug}/`;
  const t = esc(show.title);
  const seats = r.seats > 1 ? `${r.seats} seats` : "seat";
  const when = show.starts_at
    ? isStreaming(show) && show.ends_at
      ? `It streams ${day(show.starts_at)} at ${time(show.starts_at)} through ${day(show.ends_at)} at ${time(show.ends_at)}, Pacific time.`
      : `It screens ${day(show.starts_at)} at ${time(show.starts_at)}${show.venue_name ? `, ${esc(show.venue_name)}` : ""}.`
    : "";
  const account = hasAccount ? "" : isStreaming(show)
    ? box("Set up your free account to watch", `You'll need a free Slipstream account to watch. Your name and email are already in, so you only pick a password.<br><a href="${SITE}/sign-in/?mode=create&next=/${show.slug}/" style="color:#1E73BE;font-weight:600">Create my free account</a>`, true)
    : box("Want one-tap RSVPs next time?", `Create a free Slipstream account. Your name and email are already in, so you only pick a password.<br><a href="${SITE}/sign-in/?mode=create" style="color:#1E73BE;font-weight:600">Create my free account</a>`, true);
  const checkIn = r.seats === 2 ? " for both seats" : r.seats > 2 ? ` for all ${r.seats} seats` : "";

  switch (kind) {
    case "rsvp":
    case "promoted":
      return {
        subject: kind === "promoted" ? `A seat opened up: you're in for ${show.title}` : `You're in: ${show.title} on Slipstream`,
        html: layout(show, "RSVP confirmed",
          h1(kind === "promoted" ? `Good news, ${esc(r.first_name)}. You're in.` : `You're in, ${esc(r.first_name)}.`) +
          P(`Your ${seats} for <strong>${t}</strong> ${r.seats > 1 ? "are" : "is"} saved. ${when}`) +
          box("What happens next", show.kind === "in-person" ? `Bring this email to check in${checkIn}. We'll send a reminder the day before.` : "We'll email you the moment it goes live, with your viewing link and access code. Nothing to do until then.") +
          btn("Add to calendar", `${page}calendar.ics`) + account +
          small(`Can't make it? <a href="${SITE}/sign-in/?next=/${show.slug}/" style="color:#1E73BE">Release your ${seats}</a> so someone else can have ${r.seats > 1 ? "them" : "it"}.`)),
      };
    case "waitlist":
      return {
        subject: `You're on the waiting list: ${show.title}`,
        html: layout(show, "Waiting list",
          h1(`You're on the waiting list, ${esc(r.first_name)}.`) +
          P(`<strong>${t}</strong> is full right now. You're on the waiting list for ${r.seats > 1 ? `${r.seats} seats` : "1 seat"}.`) +
          box("What happens next", `If ${r.seats > 1 ? "seats open" : "a seat opens"} up, we'll email you right away with your confirmation. Nothing to do until then.`) +
          small(`Plans changed? <a href="${SITE}/sign-in/?next=/${show.slug}/" style="color:#1E73BE">Leave the waiting list</a>.`)),
      };
    case "reminder":
      return {
        subject: `Tomorrow: ${show.title}`,
        html: layout(show, "See you tomorrow",
          h1(`See you tomorrow, ${esc(r.first_name)}.`) +
          P(`<strong>${t}</strong> screens ${day(show.starts_at)} at ${time(show.starts_at)}.`) +
          (show.venue_name ? box("Where", `${esc(show.venue_name)}<br>${esc(show.venue_address ?? "")}`) : "") +
          box("Checking in", `Show this email at the door${checkIn}.`) +
          btn("Show details", page) +
          small(`Can't make it after all? <a href="${SITE}/sign-in/?next=/${show.slug}/" style="color:#1E73BE">Release your ${seats}</a>.`)),
      };
    case "live":
      return {
        subject: `It's showtime: ${show.title} is streaming now`,
        html: layout(show, "Now showing",
          h1(`${t} is live.`) +
          P(`${show.ends_at ? `Watch any time before <strong>${day(show.ends_at)} at ${time(show.ends_at)} PT</strong>. ` : ""}The button below takes you to the screening room. Sign in with your Slipstream account to watch.${hasAccount ? "" : " RSVP'd without one? Create it there with this email. It only takes a password."}`) +
          (show.conversation_line ? P(`The film and the conversation are both in the screening room, and the same code works for each.`) : "") +
          btn("Watch now", `${page}#player`) +
          (code ? box("Your access code", `<span style="display:block;font:600 20px/1.2 ${FONT};letter-spacing:.16em;color:#141414;margin-bottom:6px">${esc(code)}</span><span style="color:#6B7280">Tap play, then paste this into the player.</span>`, true)
                : box("Your access code", "It's waiting above the player when you open the screening room. Tap play, then paste it in.")) +
          small("Works on phone, tablet and laptop, and casts to a TV. Any trouble? Just reply to this email.")),
      };
    case "thanks":
      return {
        subject: `Thank you for watching ${show.title}`,
        html: layout(show, "Thank you",
          h1("Thanks for joining us.") +
          P(show.kind === "in-person" ? `We hope you enjoyed <strong>${t}</strong>.` : `The window for <strong>${t}</strong> has closed.`) +
          small(`Have 30 seconds? <a href="${SITE}/" style="color:#1E73BE">Tell us how it went</a>.`)),
      };
  }
}

const plain = (html: string) => html.replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, "$2: $1").replace(/<br\s*\/?>/g, "\n").replace(/<\/(p|div|h1|td)>/g, "\n\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();

async function send(kind: Kind, show: Show, r: Rsvp, code: string | null) {
  // Never twice.
  const { data: seen } = await db.from("email_log").select("id").eq("rsvp_id", r.id).eq("type", kind).limit(1);
  if (seen?.length) return "skipped";
  const hasAccount = Boolean(r.user_id);
  const mail = await build(kind, show, r, code, hasAccount);
  if (!mail) return "skipped";
  const { data: log } = await db.from("email_log").insert({ rsvp_id: r.id, show_slug: show.slug, email: r.email, type: kind, status: "queued" }).select("id").single();
  if (!RESEND) return "no-key";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": `${r.id}-${kind}` },
    body: JSON.stringify({ from: FROM, to: [r.email], subject: mail.subject, html: mail.html, text: plain(mail.html), tags: [{ name: "type", value: kind }, { name: "show", value: show.slug.slice(0, 250) }] }),
  });
  const out = await res.json().catch(() => ({}));
  await db.from("email_log").update(res.ok ? { status: "sent", provider_id: out.id ?? null } : { status: "failed" }).eq("id", log!.id);
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

async function sweep() {
  const now = Date.now();
  const H = 3600e3;
  const { data: shows } = await db.from("shows").select("*").in("status", ["published", "archived"])
    .gte("starts_at", new Date(now - 30 * 24 * H).toISOString()).lte("starts_at", new Date(now + 30 * H).toISOString());
  const out: string[] = [];
  for (const show of shows ?? []) {
    const start = new Date(show.starts_at).getTime();
    const end = endOf(show).getTime();
    const jobs: Kind[] = [];
    if (isStreaming(show) && now >= start && now < end) jobs.push("live");
    if (show.kind === "in-person" && start - now <= 26 * H && start - now > 2 * H) jobs.push("reminder");
    if (now >= end + 10 * H && now < end + 3 * 24 * H) jobs.push("thanks");
    if (!jobs.length) continue;
    const { data: rsvps } = await db.from("rsvps").select("*").eq("show_slug", show.slug).eq("status", "confirmed");
    const code = jobs.includes("live") ? await accessCode(show.slug) : null;
    for (const kind of jobs) for (const r of rsvps ?? []) out.push(`${show.slug} ${kind} ${await send(kind, show, r, code)}`);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const body = await req.json().catch(() => ({}));
  try {
    if (body.sweep) return Response.json({ results: await sweep() });
    if (body.rsvp_id) {
      const { data: r } = await db.from("rsvps").select("*").eq("id", body.rsvp_id).maybeSingle();
      if (!r || r.status === "cancelled") return Response.json({ result: "nothing to send" });
      const { data: show } = await db.from("shows").select("*").eq("slug", r.show_slug).maybeSingle();
      if (!show) return Response.json({ result: "no show" });
      const kind: Kind = r.status === "waitlisted" ? "waitlist" : body.previous_status === "waitlisted" ? "promoted" : "rsvp";
      return Response.json({ result: await send(kind, show, r, null) });
    }
    return Response.json({ result: "nothing to do" });
  } catch (e) {
    console.error(e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
