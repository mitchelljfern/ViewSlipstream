"use client";
/**
 * The RSVP card, in every state a guest can meet:
 *   open + signed out  -> name and email, no account needed (like the old site)
 *   open + signed in   -> one tap
 *   in person          -> pick how many seats (up to the show's limit, usually 2)
 *   in person, full    -> join the waiting list
 *   RSVP'd             -> confirmation, calendar, invite, release seat
 *                         + "create a free account": just a password, optional
 *   waiting list       -> on the list, leave it
 *   live + RSVP'd      -> watch now
 *   at capacity        -> no seats left (non in-person shows)
 *   closed             -> no longer available, conversation and what's next
 * `forced` lets the review gallery show any state without changing the session.
 * `demoPhase` keeps the card working but pretends the show is at that point
 * (review page: try an in-person RSVP even when no in-person show is coming up).
 */
import Link from "next/link";
import { useState } from "react";
import PasswordInput from "./PasswordInput";
import type { Conversation, Phase, Show } from "@/lib/types";
import { clock, longDay } from "@/lib/time";
import { calEvent } from "@/lib/ics";
import AddToCalendar from "./AddToCalendar";
import { initials, usePreview, type Guest, type RsvpStatus } from "./Preview";
import { IconCheck, IconLock, IconPlay } from "./Icons";
import CheckEmail from "./CheckEmail";

type Forced = { phase?: Phase; status?: RsvpStatus | null; signedIn?: boolean; seats?: number; guestRsvp?: boolean };

const SAMPLE: Guest = { first: "Alex", last: "Rivera", email: "alex@example.com" };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default function RsvpPanel({ show, conversation, forced, demoPhase, rsvpKey }: {
  show: Show; conversation?: Conversation; forced?: Forced; demoPhase?: Phase; rsvpKey?: string;
}) {
  const ctx = usePreview();
  const key = rsvpKey ?? show.slug;
  const phase = forced?.phase ?? demoPhase ?? ctx.phaseFor(show);
  const status = forced ? forced.status ?? null : ctx.rsvps[key] ?? null;
  const signedIn = forced ? !!forced.signedIn : !!ctx.guest;
  const who = forced ? (forced.signedIn || forced.guestRsvp ? ctx.who ?? SAMPLE : null) : ctx.who;
  const savedSeats = forced ? forced.seats ?? 1 : ctx.seats[key] ?? 1;
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [skipAccount, setSkipAccount] = useState(false);
  const [wantAccount, setWantAccount] = useState(false);
  const isGiveaway = show.kind === "giveaway";
  const isPaid = show.kind === "paid";
  const inPerson = show.kind === "in-person";
  const maxSeats = inPerson ? Math.max(1, show.maxSeats || 1) : 1;
  // The review gallery shows many cards on one page: only the real one owns the #rsvp anchor.
  const sid = forced || demoPhase ? undefined : "rsvp";
  const hid = forced || demoPhase ? undefined : "rsvp-h";
  const fid = (k: string) => (forced || demoPhase ? `g-${key}-${k}` : `r-${k}`);
  const done: RsvpStatus = isGiveaway ? "entered" : isPaid ? "paid" : "confirmed";

  const act = (fn: () => void) => {
    if (forced) { ctx.say("Preview only: this card is showing a fixed state."); return; }
    setBusy(true);
    window.setTimeout(() => { fn(); setBusy(false); }, 450);
  };

  const confirmMsg = (email?: string) => isGiveaway ? `You're entered. Confirmation sent to ${email ?? "your email"}.`
    : isPaid ? "Ticket confirmed. Your receipt is on its way."
    : `You're in. Confirmation sent to ${email ?? "your email"}.`;

  // Closed
  if (phase === "closed" || (inPerson && phase === "live" && !status)) {
    const closedLine = phase === "live" ? `Happening now at ${show.venue?.name ?? "the theater"}. RSVPs are closed.`
      : isGiveaway ? `Entries closed${show.endsAt ? ` ${longDay(show.endsAt)}` : ""}. Winners were notified by email.`
      : inPerson && show.startsAt ? `This screening took place ${longDay(show.startsAt)}.`
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

  /** After a guest RSVP: offer a free account. Their name and email are already in; they only add a password. */
  const accountPrompt = status && !signedIn && who && !skipAccount ? (
    <div className="on-deep stack g10" style={{ padding: "14px 14px 16px", borderRadius: 14, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.14)" }}>
      <b style={{ fontWeight: 600, fontSize: 16 }}>Create your free Slipstream account</b>
      <p className="small" style={{ color: "rgba(255,255,255,.82)" }}>Set a password for {who.email} and next time you can RSVP in one tap and see all your shows in one place. Optional.</p>
      <form className="stack g10" onSubmit={(e) => {
        e.preventDefault();
        act(() => { ctx.createAccount(); ctx.say("Account created. You're signed in."); });
      }}>
        <label className="label" htmlFor={fid("newpw")} style={{ color: "#fff" }}>Create a password</label>
        <PasswordInput onDeep id={fid("newpw")} name="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
        <button className="btn btn-light" disabled={busy}>{busy ? "One moment…" : "Create free account"}</button>
      </form>
      <button className="small" style={{ background: "none", border: 0, color: "rgba(255,255,255,.75)", textDecoration: "underline", cursor: "pointer" }}
        onClick={() => setSkipAccount(true)}>No thanks, my RSVP is all set</button>
    </div>
  ) : null;

  // On the waiting list (in-person shows that were full)
  if (status === "waitlisted") {
    return (
      <section id={sid} className="panel-deep on-deep stack g14" aria-labelledby={hid}>
        <div className="row between"><h2 id={hid} className="h2">You're on the waiting list</h2><span className="chip" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>{plural(savedSeats, "seat")}</span></div>
        <p>We'll email {who?.email ?? "you"} the moment {savedSeats > 1 ? "seats open" : "a seat opens"} up for {show.title}{show.startsAt ? ` on ${longDay(show.startsAt)}` : ""}. Nothing to do until then.</p>
        {accountPrompt}
        <button className="small" style={{ background: "none", border: 0, color: "rgba(255,255,255,.7)", textDecoration: "underline", cursor: "pointer" }}
          onClick={() => act(() => { ctx.cancel(key); ctx.say("You left the waiting list"); })}>Leave the waiting list</button>
      </section>
    );
  }

  // RSVP'd
  if (status) {
    const cal = !!calEvent(show, "start");
    const watchNow = phase === "live" && (show.kind === "streaming" || show.kind === "paid" || show.kind === "live");
    return (
      <section id={sid} className="panel-deep stack g14" aria-labelledby={hid}>
        <div className="row g12">
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: "#fff", color: "var(--deep)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}><IconCheck size={24} /></span>
          <h2 id={hid} className="h2">{isGiveaway ? "You're entered" : "You're in"}</h2>
        </div>
        <p>
          {isGiveaway
            ? `We'll email ${who?.email ?? "you"} if you win. Winners are drawn ${show.giveaway?.drawOn ?? "when entries close"}.`
            : watchNow
              ? (ctx.access === "email" ? "The show is live. Your access code is in your email."
                : ctx.access === "page" ? "The show is live. Your access code is above the player."
                : "The show is live. Your access code is above the player and in your email.")
              : inPerson
                ? `${savedSeats > 1 ? `Your ${savedSeats} seats are` : "Your seat is"} saved. Bring the confirmation email to check in at ${show.venue?.name ?? "the theater"}.`
                : ctx.access === "email" ? "We'll email your access code the moment the show goes live."
                : ctx.access === "page" ? "When the show goes live, come back to this page. Your access code will be right here."
                : "When the show goes live, your access code will be on this page and in your email."}
        </p>
        {!watchNow && !isGiveaway ? <CheckEmail show={show} email={who?.email} mode="rsvp" onDeep /> : null}
        {watchNow ? (
          <a href="#player" className="btn btn-light"><IconPlay size={18} />Watch now</a>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {cal && !isGiveaway ? <AddToCalendar show={show} className="btn btn-light" style={{ minHeight: 48, fontSize: 15, padding: "0 12px" }} tone="deep" /> : null}
            <button className="btn btn-secondary" style={{ minHeight: 48, fontSize: 15, gridColumn: cal && !isGiveaway ? undefined : "span 2" }}
              onClick={async () => {
                const url = `${location.origin}/${show.slug}/`;
                try { if (navigator.share) { await navigator.share({ title: show.title, url }); return; } await navigator.clipboard.writeText(url); ctx.say("Link copied"); } catch { /* cancelled */ }
              }}>Invite a friend</button>
          </div>
        )}
        {accountPrompt}
        <Link href={`/emails/rsvp/?show=${show.slug}`} className="small" style={{ color: "rgba(255,255,255,.8)", textAlign: "center" }}>Preview the confirmation email</Link>
        {!isPaid ? (
          <button className="small" style={{ background: "none", border: 0, color: "rgba(255,255,255,.7)", textDecoration: "underline", cursor: "pointer" }}
            onClick={() => act(() => { ctx.cancel(key); ctx.say(isGiveaway ? "Entry withdrawn" : savedSeats > 1 ? "Your seats were released" : "Your seat was released"); })}>
            {isGiveaway ? "Withdraw my entry" : savedSeats > 1 ? "Can't make it? Release your seats" : "Can't make it? Release your seat"}
          </button>
        ) : null}
      </section>
    );
  }

  const SeatPicker = inPerson && maxSeats > 1 ? (
    <div className="field">
      <span className="label" id={fid("seats-l")}>How many seats?</span>
      <div className="seg" role="radiogroup" aria-labelledby={fid("seats-l")}
        style={{ gridTemplateColumns: `repeat(${maxSeats}, minmax(0, 1fr))`, background: "rgba(0,0,0,.25)", borderColor: "rgba(255,255,255,.25)" }}>
        {Array.from({ length: maxSeats }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" role="radio" aria-checked={seats === n} aria-selected={seats === n} onClick={() => setSeats(n)}>{plural(n, "seat")}</button>
        ))}
      </div>
      <span className="tiny" style={{ color: "rgba(255,255,255,.65)" }}>Up to {plural(maxSeats, "seat")} per email.</span>
    </div>
  ) : null;

  /** Name and email, no password. Used to RSVP and to join a waiting list. */
  const guestForm = (submitLabel: string, status: RsvpStatus, toast: (email: string) => string) => (
    <form className="stack g14" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const g = { first: String(f.get("first") || "").trim(), last: String(f.get("last") || "").trim(), email: String(f.get("email") || "").trim() };
      act(() => {
        ctx.rsvpAsGuest(key, status, g, seats);
        if (isPaid && status !== "waitlisted") ctx.say("On the live site, Stripe Checkout opens here.");
        // Ticked "Create a free account": same step, so no account offer afterwards.
        if (wantAccount) { ctx.createAccount(); ctx.say(`${toast(g.email)} Your free account is ready.`); } else ctx.say(toast(g.email));
      });
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div className="field"><label className="label" htmlFor={fid("first")}>First name</label><input id={fid("first")} name="first" className="input" autoComplete="given-name" required /></div>
        <div className="field"><label className="label" htmlFor={fid("last")}>Last name</label><input id={fid("last")} name="last" className="input" autoComplete="family-name" required /></div>
      </div>
      <div className="field"><label className="label" htmlFor={fid("email")}>Email</label><input id={fid("email")} name="email" type="email" inputMode="email" className="input" autoComplete="email" placeholder="you@example.com" required /></div>
      {SeatPicker}
      <div className="stack g8">
        <label className="check" htmlFor={fid("acct")}>
          <input id={fid("acct")} type="checkbox" checked={wantAccount} onChange={(e) => setWantAccount(e.target.checked)} />
          <span>Create a free account <span style={{ color: "rgba(255,255,255,.65)" }}>(optional)</span></span>
        </label>
        {wantAccount ? (
          <div className="field">
            <label className="label" htmlFor={fid("pw")}>Create a password</label>
            <PasswordInput onDeep id={fid("pw")} name="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters" required />
            <span className="tiny" style={{ color: "rgba(255,255,255,.65)" }}>Next time you can RSVP in one tap and see all your shows in one place.</span>
          </div>
        ) : null}
      </div>
      <button className="btn btn-light" style={{ fontSize: 17 }} disabled={busy}>{busy ? "One moment…" : submitLabel}</button>
    </form>
  );

  const signInLink = (what: string) => (
    <p className="small" style={{ textAlign: "center" }}>Have an account? <Link href={`/sign-in/?next=/${show.slug}/`} style={{ color: "#fff", fontWeight: 600, textDecoration: "underline" }}>Sign in to {what} in one tap</Link></p>
  );

  // Full. In person: join the waiting list. Other shows: no seats left.
  if (show.atCapacity) {
    if (!inPerson) {
      return (
        <section id={sid} className="card stack g14" style={{ padding: "22px 20px 24px" }} aria-labelledby={hid}>
          <div className="row between"><h2 id={hid} className="h2">RSVP</h2><span className="chip chip-outline">At capacity</span></div>
          <p className="muted">This event has reached capacity and seats are no longer available.</p>
          <Link href="/" className="btn btn-primary">See what's showing next</Link>
        </section>
      );
    }
    const waitMsg = (email: string) => `You're on the waiting list. We'll email ${email} if seats open up.`;
    return (
      <section id={sid} className="panel-deep on-deep stack g14" aria-labelledby={hid}>
        <div className="row between"><h2 id={hid} className="h2">Join the waiting list</h2><span className="chip" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>Full</span></div>
        <p>This screening is full right now. Join the waiting list and we'll email you the moment {maxSeats > 1 ? "seats open" : "a seat opens"} up{show.startsAt ? ` for ${longDay(show.startsAt)}` : ""}.</p>
        {who && signedIn ? (
          <>
            <div className="row g10" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,.25)" }}>
              <span className="avatar" style={{ width: 34, height: 34 }}>{initials(who)}</span>
              <span className="stack small"><b style={{ fontWeight: 600 }}>{who.first} {who.last}</b><span style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{who.email}</span></span>
            </div>
            {SeatPicker}
            <button className="btn btn-light" style={{ fontSize: 17 }} disabled={busy}
              onClick={() => act(() => { ctx.rsvp(key, "waitlisted", seats); ctx.say(waitMsg(who.email)); })}>
              {busy ? "One moment…" : "Join the waiting list"}
            </button>
          </>
        ) : (
          <>
            {guestForm("Join the waiting list", "waitlisted", waitMsg)}
            <p className="tiny" style={{ color: "rgba(255,255,255,.65)" }}>No account or password needed.</p>
          </>
        )}
      </section>
    );
  }

  const heading = isGiveaway ? "Enter to win" : isPaid ? "Get a ticket" : "RSVP";
  const badge = isGiveaway ? `${show.giveaway?.winners ?? 5} winners` : isPaid ? `$${show.price}` : inPerson ? "Limited seats" : "Free";
  const verb = isGiveaway ? "Enter the giveaway" : isPaid ? `Buy ticket · $${show.price}` : inPerson ? (seats > 1 ? `Save my ${seats} seats` : "Save my seat") : "RSVP";
  const blurb = isGiveaway
    ? show.giveaway?.prize ?? "Enter for a chance to win."
    : isPaid ? "One ticket covers every device for the full streaming window."
    : inPerson ? `${show.startsAt ? `${longDay(show.startsAt)} at ${clock(show.startsAt)}` : ""}${show.venue ? `, ${show.venue.name}` : ""}. Seats are first come, first served.`
    : show.endsAt && show.startsAt ? `Streams ${longDay(show.startsAt)} at ${clock(show.startsAt)} through ${longDay(show.endsAt)} at ${clock(show.endsAt)} PT. Watch any time in that window.` : "";

  // Open, signed in: one tap
  if (signedIn && who) {
    return (
      <section id={sid} className="panel-deep on-deep stack g14" aria-labelledby={hid}>
        <div className="row between"><h2 id={hid} className="h2">{heading}</h2><span className="chip" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>{badge}</span></div>
        <p>{blurb}</p>
        <div className="row g10" style={{ padding: "10px 12px", borderRadius: 12, background: "rgba(0,0,0,.25)" }}>
          <span className="avatar" style={{ width: 34, height: 34 }}>{initials(who)}</span>
          <span className="stack small"><b style={{ fontWeight: 600 }}>{who.first} {who.last}</b><span style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>{who.email} · <Link href="/sign-in/" style={{ color: "#fff" }}>not you?</Link></span></span>
        </div>
        {SeatPicker}
        <button className="btn btn-light" style={{ fontSize: 17 }} disabled={busy}
          onClick={() => act(() => { if (isPaid) ctx.say("On the live site, Stripe Checkout opens here."); ctx.rsvp(key, done, seats); ctx.say(confirmMsg(who.email)); })}>
          {busy ? "One moment…" : verb}
        </button>
        {isPaid ? <p className="tiny row g6" style={{ justifyContent: "center", color: "rgba(255,255,255,.7)" }}><IconLock size={14} />Secure checkout by Stripe · Apple Pay · Google Pay · card</p> : null}
        {isGiveaway && show.giveaway ? <p className="tiny" style={{ color: "rgba(255,255,255,.65)" }}>{show.giveaway.rules}</p> : null}
      </section>
    );
  }

  // Open, signed out: name and email are enough. The account is offered afterwards.
  return (
    <section id={sid} className="panel-deep on-deep stack g14" aria-labelledby={hid}>
      <div className="row between"><h2 id={hid} className="h2">{heading}</h2><span className="chip" style={{ background: "rgba(255,255,255,.14)", color: "#fff" }}>{badge}</span></div>
      <p>{blurb}</p>
      {guestForm(isGiveaway ? "Enter the giveaway" : isPaid ? "Continue to checkout" : verb, done, (email) => confirmMsg(email))}
      <p className="tiny" style={{ color: "rgba(255,255,255,.7)", textAlign: "center" }}>No account or password needed unless you want one.</p>
      {signInLink(isGiveaway ? "enter" : "RSVP")}
      <p className="tiny" style={{ color: "rgba(255,255,255,.65)", lineHeight: 1.5 }}>We never share your personal information. You'll get three emails: a confirmation now, a note when the show is live, and a thank-you when it closes.</p>
      {isGiveaway && show.giveaway ? <p className="tiny" style={{ color: "rgba(255,255,255,.65)" }}>{show.giveaway.rules}</p> : null}
    </section>
  );
}
