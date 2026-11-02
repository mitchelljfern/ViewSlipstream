"use client";
/**
 * What the three transactional emails look like. Phase 2 turns these into
 * real templates (Resend), with the same copy and the show's details merged in.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePreview } from "./Preview";
import { allShows, getConversation } from "@/lib/data";
import { clock, longDay } from "@/lib/time";

type T = "rsvp" | "live" | "thanks";

export default function EmailPreview({ type }: { type: T }) {
  const ctx = usePreview();
  const params = useSearchParams();
  const show = allShows().find((s) => s.slug === (params.get("show") ?? ctx.leadSlug)) ?? allShows()[0];
  const name = ctx.guest?.first ?? "Alex";
  const conv = getConversation(show.conversationId);
  const pw = `${show.slug.split("-").find((w) => w.length > 3)?.toUpperCase() ?? "SHOW"}-${(show.startsAt ?? "2026").slice(0, 4)}`;
  const window = show.startsAt && show.endsAt ? `${longDay(show.startsAt)} at ${clock(show.startsAt)} through ${longDay(show.endsAt)} at ${clock(show.endsAt)}, Pacific time` : show.startsAt ? `${longDay(show.startsAt)} at ${clock(show.startsAt)}${show.venue ? `, ${show.venue.name}` : ""}` : "";
  const next = allShows().find((s) => s.slug !== show.slug && ctx.phaseFor(s) !== "closed");

  const subject = type === "rsvp" ? `You're in: ${show.title} on Slipstream` : type === "live" ? `It's showtime: ${show.title} is streaming now` : `Thank you for watching ${show.title}`;
  const label = type === "rsvp" ? "RSVP confirmed" : type === "live" ? "Now showing" : "Thank you";

  const btn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: 50, borderRadius: 12, background: "#1E73BE", color: "#fff", fontWeight: 600, fontSize: 16, textDecoration: "none" };
  const box: React.CSSProperties = { border: "1px solid #E3E6EA", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6, fontSize: 14, color: "#333" };
  const P = ({ children }: { children: React.ReactNode }) => <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#333" }}>{children}</p>;

  return (
    <div className="wrap section stack g16" style={{ paddingTop: 28, alignItems: "center" }}>
      <div className="row g8 wrap-row" style={{ justifyContent: "center" }}>
        {(["rsvp", "live", "thanks"] as T[]).map((t, i) => (
          <Link key={t} href={`/emails/${t}/?show=${show.slug}`} className="filter" aria-pressed={t === type}>{i + 1}. {t === "rsvp" ? "Confirmation" : t === "live" ? "It's showtime" : "Thank you"}</Link>
        ))}
      </div>
      <p className="muted small" style={{ textAlign: "center" }}>Subject: <b style={{ color: "#fff", fontWeight: 600 }}>{subject}</b></p>
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
              <P>Your seat for <strong>{show.title}</strong> is saved. {window ? `It ${show.kind === "in-person" ? "screens" : "streams"} ${window}.` : ""}</P>
              <div style={box}><b style={{ color: "#141414" }}>What happens next</b><span>{show.kind === "in-person" ? "Bring this email to check in. We'll send a reminder the day before." : "We'll email you the moment it goes live, with your viewing link and password. Nothing to do until then."}</span></div>
              <a href="#" style={btn}>Add to calendar</a>
              <P><span style={{ fontSize: 13, color: "#6B7280" }}>Can't make it? <a href="#" style={{ color: "#1E73BE" }}>Release your seat</a> so someone else can have it.</span></P>
            </>
          ) : type === "live" ? (
            <>
              <h1 style={{ margin: 0, font: "600 26px/1.15 var(--font-display)", letterSpacing: "-.02em", color: "#141414" }}>{show.title} is live.</h1>
              <P>{show.endsAt ? <>Watch any time before <strong>{longDay(show.endsAt)} at {clock(show.endsAt)} PT</strong>. </> : null}Your link below signs you in automatically.</P>
              <a href="#" style={btn}>Watch now</a>
              <div style={{ ...box, background: "#F5F7FA" }}><b style={{ color: "#141414" }}>Your viewing password</b>
                <span style={{ font: "600 20px/1.2 var(--font-display)", letterSpacing: ".16em", color: "#141414" }}>{pw}</span>
                <span style={{ color: "#6B7280" }}>Tap play, then enter this in the player. It's also on the show page once you're signed in.</span></div>
              <P><span style={{ fontSize: 13, color: "#6B7280" }}>Works on phone, tablet and laptop, and casts to a TV. Trouble? <a href="#" style={{ color: "#1E73BE" }}>Get help</a>.</span></P>
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
