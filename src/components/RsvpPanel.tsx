"use client";
/**
 * The RSVP card, in every state a guest can meet:
 *   open + signed out  -> create an account and RSVP in one step
 *   open + signed in   -> one tap (seats for in-person, enter for giveaways, buy for paid)
 *   RSVP'd             -> confirmation, calendar, invite, release seat
 *   live + RSVP'd      -> watch now
 *   at capacity        -> no seats left
 *   closed             -> no longer available, conversation and what's next
 * `forced` lets the review gallery show any state without changing the session.
 */
import Link from "next/link";
import { useState } from "react";
import type { Conversation, Phase, Show } from "@/lib/types";
import { clock, longDay } from "@/lib/time";
import { icsHref } from "@/lib/ics";
import { initials, usePreview, type RsvpStatus } from "./Preview";
import { IconCheck, IconLock, IconPlay } from "./Icons";

type Forced = { phase?: Phase; status?: RsvpStatus | null; signedIn?: boolean };

export default function RsvpPanel({ show, conversation, forced }: { show: Show; conversation?: Conversation; forced?: Forced }) {
  const ctx = usePreview();
  const phase = forced?.phase ?? ctx.phaseFor(show);
  const status = forced ? forced.status ?? null : ctx.rsvps[show.slug] ?? null;
  const guest = forced ? (forced.signedIn ? ctx.guest ?? { first: "Alex", last: "Rivera", email: "alex@example.com" } : null) : ctx.guest;
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const isGiveaway = show.kind === "giveaway";
  const isPaid = show.kind === "paid";
  // The review gallery shows many cards on one page: only the real one owns the #rsvp anchor.
  const sid = forced ? undefined : "rsvp";
  const hid = forced ? undefined : "rsvp-h";
  const fid = (k: string) => (forced ? `g-${show.slug}-${k}` : `r-${k}`);
  const done: RsvpStatus = isGiveaway ? "entered" : isPaid ? "paid" : "confirmed";

  const act = (fn: () => void) => {
    if (forced) { ctx.say("Preview only: this card is showing a fixed state."); return; }
    setBusy(true);
    window.setTimeout(() => { fn(); setBusy(false); }, 450);
  };

  const confirmMsg = isGiveaway ? "You're entered. Check your email for confirmation." : isPaid ? "Ticket confirmed. Your receipt is on its way." : "You're in. Your confirmation email is on its way.";

  // Closed
  if (phase === "closed" || (show.kind === "in-person" && phase === "live" && !status)) {
    const closedLine = phase === "live" ? `Happening now at ${show.venue?.name ?? "the theater"}. RSVPs are closed.`
      : isGiveaway ? `Entries closed${show.endsAt ? ` ${longDay(show.endsAt)}` : ""}. Winners were notified by email.`
      : show.kind === "in-person" && show.startsAt ? `This screening took place ${longDay(show.startsAt)}.`
      : show.endsAt ? `This show closed ${longDay(show.endsAt)} at ${clock(show.endsAt)}.` : "This show has closed.";
    return (
      <section id={sid} className="card stack g14" style={{ padding: "22px 20px 24px" }} aria-labelledby={hid}>
        <h2 id={hid} className="h2">No longer available</h2>
        <p className="muted">{closedLine}{conversation ? " The conversation with the filmmakers is still here to watch." : ""}</p>
        {conversation ? <a href="#conversation" className="btn btn-secondary">Watch the conversation</a> : null}
        <Link href="/" className="btn btn-primary">See what's showing next</Link>
      </section>
    );
  }

  // RSVP'd
  if (status) {
    const cal = icsHref(show, "start");
    const watchNow = phase === "live" && (show.kind === "streaming" || show.kind === "paid" || show.kind === "live");
    return (
      <section id={sid} className="panel-deep stack g14" aria-labelledby={hid}>
        <div className="row g12">
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", color: "var(--deep)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><IconCheck size={24} /></span>
          <h2 id={hid} className="h2">{isGiveaway ? "You're entered" : "You're in"}</h2>
        </div>
        <p>
          {isGiveaway
            ? `We'll email ${guest?.email ?? "you"} if you win. Winners are drawn ${show.giveaway?.drawOn ?? "when entries close"}.`
            : watchNow
              ? "The show is live. Your viewing password is above the player and in your email."
              : show.kind === "in-person"
                ? `Your seat${seats > 1 ? "s are" : " is"} saved. Bring the confirmation email to check in at ${show.venue?.name ?? "the theater"}.`
                : `Confirmation sent to ${guest?.email ?? "your email"}. We'll email again the moment the show is live.`}
        </p>
        {watchNow ? (
          <a href="#player" className="btn btn-light"><IconPlay size={18} />Watch now</a>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {cal && !isGiveaway ? <a href={cal} download={`${show.slug}.ics`} className="btn btn-light" style={{ minHeight: 48, fontSize: 15 }}>Add to calendar</a> : null}
            <button className="btn btn-secondary" style={{ minHeight: 48, fontSize: 15, gridColumn: cal && !isGiveaway ? undefined : "span 2" }}
              onClick={async () => {
                const url = `${location.origin}/${show.slug}/`;
                try { if (navigator.share) { await navigator.share({ title: show.title, url }); return; } await navigator.clipboard.writeText(url); ctx.say("Link copied"); } catch { /* cancelled */ }
              }}>Invite a friend</button>
          </div>
        )}
        <Link href={`/emails/${isGiveaway ? "rsvp" : "rsvp"}/?show=${show.slug}`} className="small" style={{ color: "rgba(255,255,255,.8)", textAlign: "center" }}>Preview the confirmation email</Link>
        {!isPaid ? (
          <button className="small" style={{ background: "none", border: 0, color: "rgba(255,255,255,.7)", textDecoration: "underline", cursor: "pointer" }}
            onClick={() => act(() => { ctx.cancel(show.slug); ctx.say(isGiveaway ? "Entry withdrawn" : "Your seat was released"); })}>
            {isGiveaway ? "Withdraw my entry" : "Can't make it? Release your seat"}
          </button>
        ) : null}
      </section>
    );
  }

  // At capacity
  if (show.atCapacity) {
    return (
      <section id={sid} className="card stack g14" style={{ padding: "22px 20px 24px" }} aria-labelledby={hid}>
        <div className="row between"><h2 id={hid} className="h2">RSVP</h2><span className="chip chip-outline">At capacity</span></div>
        <p className="muted">This event has reached capacity and seats are no longer available.</p>
        <Link href="/" className="btn btn-primary">See what's showing next</Link>
      </section>
    );
  }

  const heading = isGiveaway ? "Enter to win" : isPaid ? "Get a ticket" : "RSVP";
  const badge = isGiveaway ? `${show.giveaway?.winners ?? 5} winners` : isPaid ? `$${show.price}` : show.kind === "in-person" ? "Limited seats" : "Free";
  const verb = isGiveaway ? "Enter the giveaway" : isPaid ? `Buy ticket · $${show.price}` : show.kind === "in-person" ? "Save my seat" : "RSVP";
  const blurb = isGiveaway
    ? show.giveaway?.prize ?? "Enter for a chance to win."
    : isPaid ? "One ticket covers every device on your account for the full streaming window."
    : show.kind === "in-person" ? `${show.startsAt ? `${longDay(show.startsAt)} at ${clock(show.startsAt)}` : ""}${show.venue ? `, ${show.venue.name}` : ""}. Seats are first come, first served.`
    : show.endsAt && show.startsAt ? `Streams ${longDay(show.startsAt)} at ${clock(show.startsAt)} through ${longDay(show.endsAt)} at ${clock(show.endsAt)} PT. Watch any time in that window.` : "";

  const SeatPicker = show.kind === "in-person" && show.maxSeats > 1 ? (
    <div className="field">
      <span className="label" id="seats-l">Seats</span>
      <div className="seg" role="radiogroup" aria-labelledby="seats-l" style={{ background: "rgba(0,0,0,.25)", borderColor: "rgba(255,255,255,.25)" }}>
        {[1, 2].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={seats === n} aria-selected={seats === n} onClick={() => setSeats(n)}>{n} seat{n > 1 ? "s" : ""}</button>
        ))}
      </div>
    </div>
  ) : null;

  // Open, signed in: one tap
  if (guest) {
    return (
      <section id={sid} className="panel-deep on-deep stack g14" aria-labelledby={hid}>
        <div className="row between"><h2 id={hid} className="h2">{heading}</h2><span className="chip" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>{badge}</span></div>
        <p>{blurb}</p>
        <div className="row g10" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,.25)" }}>
          <span className="avatar" style={{ width: 34, height: 34 }}>{initials(guest)}</span>
          <span className="stack small"><b style={{ fontWeight: 600 }}>{guest.first} {guest.last}</b><span style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{guest.email} · <Link href="/sign-in/" style={{ color: "#fff" }}>not you?</Link></span></span>
        </div>
        {SeatPicker}
        <button className="btn btn-light" style={{ fontSize: 17 }} disabled={busy}
          onClick={() => act(() => { if (isPaid) ctx.say("On the live site, Stripe Checkout opens here."); ctx.rsvp(show.slug, done); ctx.say(confirmMsg); })}>
          {busy ? "One moment…" : verb}
        </button>
        {isPaid ? <p className="tiny row g6" style={{ justifyContent: "center", color: "rgba(255,255,255,.7)" }}><IconLock size={14} />Secure checkout by Stripe · Apple Pay · Google Pay · card</p> : null}
        {isGiveaway && show.giveaway ? <p className="tiny" style={{ color: "rgba(255,255,255,.65)" }}>{show.giveaway.rules}</p> : null}
      </section>
    );
  }

  // Open, signed out: the RSVP creates the account
  return (
    <section id={sid} className="panel-deep on-deep stack g14" aria-labelledby={hid}>
      <div className="row between"><h2 id={hid} className="h2">{heading}</h2><span className="chip" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>{badge}</span></div>
      <p>{blurb}</p>
      <p className="small">Create a free Slipstream account to {isGiveaway ? "enter" : isPaid ? "buy your ticket" : "save your seat"}. It takes one step.</p>
      <form className="stack g14" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const g = { first: String(f.get("first") || "").trim(), last: String(f.get("last") || "").trim(), email: String(f.get("email") || "").trim() };
        act(() => { ctx.signIn(g); ctx.rsvp(show.slug, done); ctx.say(`Account created. ${confirmMsg}`); });
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div className="field"><label className="label" htmlFor={fid("first")}>First name</label><input id={fid("first")} name="first" className="input" autoComplete="given-name" required /></div>
          <div className="field"><label className="label" htmlFor={fid("last")}>Last name</label><input id={fid("last")} name="last" className="input" autoComplete="family-name" required /></div>
        </div>
        <div className="field"><label className="label" htmlFor={fid("email")}>Email</label><input id={fid("email")} name="email" type="email" inputMode="email" className="input" autoComplete="email" placeholder="you@example.com" required /></div>
        <div className="field"><label className="label" htmlFor={fid("pw")}>Create a password</label><input id={fid("pw")} name="password" type="password" className="input" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required /></div>
        {SeatPicker}
        <button className="btn btn-light" style={{ fontSize: 17 }} disabled={busy}>{busy ? "One moment…" : isGiveaway ? "Create account and enter" : isPaid ? "Create account and continue" : "Create account and RSVP"}</button>
      </form>
      <p className="small" style={{ textAlign: "center" }}>Already have an account? <Link href={`/sign-in/?next=/${show.slug}/`} style={{ color: "#fff", fontWeight: 600, textDecoration: "underline" }}>Sign in to {isGiveaway ? "enter" : "RSVP"}</Link></p>
      <p className="tiny" style={{ color: "rgba(255,255,255,.65)", lineHeight: 1.5 }}>We never share your personal information. You'll get three emails: a confirmation now, a note when the show is live, and a thank-you when it closes.</p>
    </section>
  );
}
