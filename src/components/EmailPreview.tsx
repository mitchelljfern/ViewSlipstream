"use client";
/**
 * What the transactional emails look like (three per RSVP, plus the waiting
 * list email for full in-person screenings). Phase 2 turns these into
 * real templates (Resend), with the same copy and the show's details merged in.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePreview } from "./Preview";
import { allShows, getConversation } from "@/lib/data";
import { clock, longDay } from "@/lib/time";

export type EmailType = "rsvp" | "live" | "thanks" | "waitlist";
type T = EmailType;

export default function EmailPreview({ type }: { type: T }) {
  const ctx = usePreview();
  const params = useSearchParams();
  const show = allShows().find((s) => s.slug === (params.get("show") ?? ctx.leadSlug)) ?? allShows()[0];
  const name = ctx.who?.first ?? "Alex";
  // In-person shows: how many seats this RSVP holds (review build: the last RSVP's choice, else the show's limit).
  const seatCount = show.kind === "in-person" ? ctx.seats[show.slug] ?? Math.max(1, show.maxSeats || 1) : 1;
  const seatWord = seatCount > 1 ? `${seatCount} seats` : "seat";
  const conv = getConversation(show.conversationId);
  const pw = `${show.slug.split("-").find((w) => w.length > 3)?.toUpperCase() ?? "SHOW"}-${(show.startsAt ?? "2026").slice(0, 4)}`;
  const window = show.startsAt && show.endsAt ? `${longDay(show.startsAt)} at ${clock(show.startsAt)} through ${longDay(show.endsAt)} at ${clock(show.endsAt)}, Pacific time` : show.startsAt ? `${longDay(show.startsAt)} at ${clock(show.startsAt)}${show.venue ? `, ${show.venue.name}` : ""}` : "";
  const next = allShows().find((s) => s.slug !== show.slug && ctx.phaseFor(s) !== "closed");

  const subject = type === "rsvp" ? `You're in: ${show.title} on Slipstream` : type === "live" ? `It's showtime: ${show.title} is streaming now`
    : type === "waitlist" ? `You're on the waiting list: ${show.title}` : `Thank you for watching ${show.title}`;
  const label = type === "rsvp" ? "RSVP confirmed" : type === "live" ? "Now showing" : type === "waitlist" ? "Waiting list" : "Thank you";

  const btn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: 12, background: "#1E73BE", color: "#fff", fontWeight: 600, fontSize: 16, textDecoration: "none" };
  const box: React.CSSProperties = { border: "1px solid #E3E6EA", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: "#333" };
  const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#333" }}>{children}</p>;

  return (
    <div className="wrap section stack g16" style={{ paddingTop: 28, alignItems: "center" }}>
      <div className="row g8 wrap-row" style={{ justifyContent: "center" }}>
        {(["rsvp", "live", "thanks"] as T[]).map((t, i) => (
          <Link key={t} href={`/emails/${t}/?show=${show.slug}`} className="filter" aria-pressed={t === type}>{i + 1}. {t === "rsvp" ? "Confirmation" : t === "live" ? "It's showtime" : "Thank you"}</Link>
        ))}
        <Link href={`/emails/waitlist/?show=${show.slug}`} className="filter" aria-pressed={type === "waitlist"}>Waiting list (in person)</Link>
      </div>
      <p className="muted small" style={{ textAlign: "center" }}>From: <b style={{ color: "#fff", fontWeight: 600 }}>Slipstream &lt;hello@viewslipstream.com&gt;</b> · Subject: <b style={{ color: "#fff", fontWeight: 600 }}>{subject}</b></p>
      {type === "live" || type === "rsvp" ? (
        <p className="muted tiny" style={{ textAlign: "center" }}>
          Access code set to <b style={{ color: "#fff" }}>{ctx.access === "both" ? "page + email" : ctx.access === "page" ? "page only" : "email only"}</b>. Change it under Review.
        </p>
      ) : null}
      <article style={{ width: "100%", maxWidth: 600, background: "#fff", color: "#141414", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: "#000", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/slipstream-logo.png" alt="Slipstream" style={{ height: 11, width: "auto" }} />
          <span style={{ font: "600 11px/1 var(--font-display)", letterSpacing: ".1em", textTransform: "uppercase", color: type === "live" ? "#fff" : "#A9AFB7", display: "flex", alignItems: "center", gap: 6 }}>{type === "live" ? <span className="live-dot" /> : null}{label}</span>
        </div>
        {show.heroImage ? <img src={show.heroImage} alt="" style={{ width: "100%", aspectRatio: "2.4 / 1", objectFit: "cover" }} /> : null}
        <div style={{ padding: "26px 28px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
          {type === "rsvp" ? (
            <>
              <h1 style={{ margin: 0, font: "600 26px/1.15 var(--font-display)", letterSpacing: "-.02em", color: "#141414" }}>You're in, {name}.</h1>
              <P>Your {seatWord} for <strong>{show.title}</strong> {seatCount > 1 ? "are" : "is"} saved. {window ? `It ${show.kind === "in-person" ? "screens" : "streams"} ${window}.` : ""}</P>
              <div style={box}><b style={{ color: "#141414" }}>What happens next</b><span>{show.kind === "in-person" ? `Bring this email to check in${seatCount > 1 ? ` for all ${seatCount} seats` : ""}. We'll send a reminder the day before.`
                : ctx.access === "page" ? "We'll email you the moment it goes live with a link to the screening room. Your access code will be waiting there."
                : "We'll email you the moment it goes live, with your viewing link and access code. Nothing to do until then."}</span></div>
              <a href="#" style={btn}>Add to calendar</a>
              <div style={{ ...box, background: "#F5F7FA" }}><b style={{ color: "#141414" }}>Want one-tap RSVPs next time?</b>
                <span>{show.kind === "in-person" ? "Create a free Slipstream account. Your name and email are already in, so you only pick a password. Optional: this RSVP works either way." : "You'll need a free Slipstream account to watch. Your name and email are already in, so you only pick a password."}</span>
                <a href="#" style={{ color: "#1E73BE", fontWeight: 600 }}>Create my free account</a></div>
              <P><span style={{ fontSize: 13, color: "#6B7280" }}>Can't make it? <a href="#" style={{ color: "#1E73BE" }}>Release your {seatWord}</a> so someone else can have {seatCount > 1 ? "them" : "it"}.</span></P>
            </>
          ) : type === "waitlist" ? (
            <>
              <h1 style={{ margin: 0, font: "600 26px/1.15 var(--font-display)", letterSpacing: "-.02em", color: "#141414" }}>You're on the waiting list, {name}.</h1>
              <P><strong>{show.title}</strong> is full right now{window ? ` (${window})` : ""}. You're on the waiting list for {seatCount > 1 ? `${seatCount} seats` : "1 seat"}.</P>
              <div style={box}><b style={{ color: "#141414" }}>What happens next</b><span>If {seatCount > 1 ? "seats open" : "a seat opens"} up, we'll email you right away with your confirmation. Nothing to do until then.</span></div>
              <P><span style={{ fontSize: 13, color: "#6B7280" }}>Plans changed? <a href="#" style={{ color: "#1E73BE" }}>Leave the waiting list</a>.</span></P>
            </>
          ) : type === "live" ? (
            <>
              <h1 style={{ margin: 0, font: "600 26px/1.15 var(--font-display)", letterSpacing: "-.02em", color: "#141414" }}>{show.title} is live.</h1>
              <P>{show.endsAt ? <>Watch any time before <strong>{longDay(show.endsAt)} at {clock(show.endsAt)} PT</strong>. </> : null}The button below takes you to the screening room. Sign in with your Slipstream account to watch. RSVP'd without one? Create it there with this email. It only takes a password.</P>
              {show.conversationLine ? <P>The film and the {show.conversationLine.replace(/^the screening will be followed by an? /i, "").replace(/\.$/, "")} are both in the screening room, and the same code works for each.</P> : null}
              <a href="#" style={btn}>Watch now</a>
              {ctx.access === "page" ? (
                <div style={box}><b style={{ color: "#141414" }}>Your access code</b>
                  <span>It's waiting above the player when you open the screening room. Tap play, then paste it in.</span></div>
              ) : (
                <div style={{ ...box, background: "#F5F7FA" }}><b style={{ color: "#141414" }}>Your access code</b>
                  <span style={{ font: "600 20px/1.2 var(--font-display)", letterSpacing: ".16em", color: "#141414" }}>{pw}</span>
                  <span style={{ color: "#6B7280" }}>Tap play, then paste this into the player.{ctx.access === "both" ? " It's also above the player in the screening room." : ""}</span></div>
              )}
              <P><span style={{ fontSize: 13, color: "#6B7280" }}>Works on phone, tablet and laptop, and casts to a TV. Any trouble? Just reply to this email.</span></P>
            </>
          ) : (
            <>
              <h1 style={{ margin: 0, font: "600 26px/1.15 var(--font-display)", letterSpacing: "-.02em", color: "#141414" }}>Thanks for joining us.</h1>
              <P>The window for <strong>{show.title}</strong> has closed.{conv ? " The conversation with the filmmakers stays up to rewatch any time." : ""}</P>
              {conv ? <a href="#" style={{ ...btn, background: "#141414" }}>Rewatch the conversation</a> : null}
              {next ? <div style={box}><b style={{ color: "#141414" }}>Up next on Slipstream</b><span>{next.title}{next.startsAt ? `, ${longDay(next.startsAt)}` : ""}.</span><a href="#" style={{ color: "#1E73BE", fontWeight: 600 }}>RSVP for the next show</a></div> : null}
              <P><span style={{ fontSize: 13, color: "#6B7280" }}>Have 30 seconds? <a href="#" style={{ color: "#1E73BE" }}>Tell us how it went</a>.</span></P>
            </>
          )}
        </div>
        <div style={{ padding: "18px 28px 24px", borderTop: "1px solid #E3E6EA", fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
          Slipstream c/o Satiated Productions, Los Angeles, CA · You're receiving this because you RSVP'd with this address. <a href="#" style={{ color: "#1E73BE" }}>Email preferences</a>
        </div>
      </article>
    </div>
  );
}
