"use client";
import Link from "next/link";
import { initials, usePreview } from "./Preview";
import { allShows } from "@/lib/data";
import { clock, monthDay, shortWhen } from "@/lib/time";
import { IconChevron } from "./Icons";
import PasswordInput from "./PasswordInput";

export default function AccountView() {
  const ctx = usePreview();
  if (!ctx.ready) return <div className="wrap section" />;
  if (!ctx.guest) {
    // RSVP'd without an account: their name and email are on file, so a password is all it takes.
    const c = ctx.contact;
    return (
      <div className="wrap section stack g16" style={{ maxWidth: 520 }}>
        <h1 className="h1" style={{ fontSize: 36 }}>Your account</h1>
        {c ? (
          <>
            <p className="muted">You RSVP'd as {c.first} {c.last} ({c.email}) without an account. Your RSVPs and emails are all set. To watch a show you'll need a free account: just set a password. You'll also see all your RSVPs here and RSVP in one tap next time.</p>
            <form className="stack g12" onSubmit={(e) => { e.preventDefault(); ctx.createAccount(); ctx.say("Account created. You're signed in."); }}>
              <label className="label" htmlFor="acct-pw">Create a password</label>
              <PasswordInput id="acct-pw" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
              <button className="btn btn-primary">Create free account</button>
            </form>
            <Link href="/sign-in/?next=/account/" className="small" style={{ textAlign: "center" }}>Already have an account? Sign in</Link>
          </>
        ) : (
          <>
            <p className="muted">Sign in to see your RSVPs, your viewing links and your email settings. You don't need an account to RSVP.</p>
            <Link href="/sign-in/?next=/account/" className="btn btn-primary">Sign in</Link>
          </>
        )}
      </div>
    );
  }
  const g = ctx.guest;
  const mine = allShows().filter((s) => ctx.rsvps[s.slug]);
  return (
    <div className="wrap section stack g32" style={{ paddingTop: 28 }}>
      <section className="row g14">
        <span className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initials(g)}</span>
        <div className="stack" style={{ flex: 1, minWidth: 0 }}><h1 className="h2">{g.first} {g.last}</h1><span className="muted small" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{g.email}</span></div>
        <button className="btn btn-secondary btn-sm" onClick={() => ctx.say("Review build: profile editing comes with accounts in phase 2.")}>Edit</button>
      </section>

      <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(420px, 100%), 1fr))", alignItems: "start", gap: 32 }}>
        <section className="stack g12" aria-labelledby="rsvps-h">
          <div className="section-head"><h2 id="rsvps-h" className="h3">Your RSVPs</h2><span className="muted small">{mine.length} total</span></div>
          {mine.length ? (
            <div className="card list-rows" style={{ overflow: "hidden" }}>
              {mine.map((s) => {
                const p = ctx.phaseFor(s);
                const live = p === "live" && s.kind !== "in-person" && s.kind !== "giveaway" && ctx.rsvps[s.slug] !== "waitlisted";
                return (
                  <Link key={s.slug} href={`/${s.slug}/${live ? "#player" : ""}`} className="list-row" style={live ? { background: "rgba(30,115,190,.12)" } : undefined}>
                    <img src={s.poster} alt="" style={{ width: 56, height: 84, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }} />
                    <div className="stack g4" style={{ flex: 1, minWidth: 0 }}>
                      {live ? <span className="chip chip-white" style={{ alignSelf: "flex-start" }}><span className="live-dot" />Now showing</span>
                        : <span className="chip chip-outline" style={{ alignSelf: "flex-start" }}>{rsvpLabel(s.kind, p, ctx.rsvps[s.slug], ctx.seats[s.slug] ?? 1)}</span>}
                      <b style={{ fontWeight: 600, lineHeight: 1.3 }}>{s.title}</b>
                      <span className="muted small">{live && s.endsAt ? `Available until ${monthDay(s.endsAt)} · ${clock(s.endsAt)}` : s.startsAt ? shortWhen(s.startsAt) : ""}{s.venue ? ` · ${s.venue.name}` : ""}</span>
                    </div>
                    {live ? <span className="btn btn-primary btn-sm">Watch</span> : <IconChevron size={18} />}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="card stack g10" style={{ padding: 18 }}><p className="muted">No RSVPs yet.</p><Link href="/" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }}>See what's showing</Link></div>
          )}
        </section>

        <div className="stack g32">
          <section className="stack g12" aria-labelledby="email-h">
            <h2 id="email-h" className="h3">Email</h2>
            <div className="card list-rows" style={{ overflow: "hidden" }}>
              <div className="list-row"><div style={{ flex: 1 }}><b style={{ fontWeight: 600 }}>Show emails</b><p className="muted small">Confirmations, "it's showtime" and thank-yous</p></div><span className="chip chip-outline">Always on</span></div>
              {([["closingReminder", "Reminder before a show closes", "24 hours before the window ends"], ["newsletter", "Newsletter", "New screenings, conversations and giveaways"]] as const).map(([k, t, d]) => (
                <div className="list-row" key={k}><div style={{ flex: 1 }}><b style={{ fontWeight: 600 }}>{t}</b><p className="muted small">{d}</p></div>
                  <button className="switch" role="switch" aria-checked={ctx[k]} aria-label={t} onClick={() => ctx.setPref(k, !ctx[k])} /></div>
              ))}
            </div>
          </section>
          <section className="stack g12" aria-labelledby="acct-h">
            <h2 id="acct-h" className="h3">Account</h2>
            <div className="card list-rows" style={{ overflow: "hidden" }}>
              {["Change password", "Receipts for paid shows", "Delete my account"].map((t) => (
                <button key={t} className="list-row" style={{ width: "100%", background: "none", border: 0, cursor: "pointer", textAlign: "left", color: t.startsWith("Delete") ? "var(--muted)" : "var(--text)" }}
                  onClick={() => ctx.say("Review build: this arrives with accounts in phase 2.")}><span style={{ flex: 1, fontWeight: 600 }}>{t}</span><IconChevron size={18} /></button>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={() => { ctx.signOut(); ctx.say("Signed out"); }}>Sign out</button>
          </section>
        </div>
      </div>
    </div>
  );
}

function rsvpLabel(kind: string, phase: string, status: string | undefined, seats: number) {
  if (kind === "giveaway") return "Entered";
  if (phase === "closed") return "Closed";
  const n = seats > 1 ? ` · ${seats} seats` : "";
  if (status === "waitlisted") return `Waiting list${n}`;
  return kind === "in-person" ? `In person · confirmed${n}` : "Confirmed";
}
