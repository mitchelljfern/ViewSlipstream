"use client";
/**
 * "Check your email" alerts. The current site sends the access code by email
 * (from hello@viewslipstream.com), so these tell guests where to look and
 * what to do if it isn't in their inbox.
 *
 *   mode="rsvp"  right after RSVPing: confirmation sent, check spam
 *   mode="live"  in the screening room when the password is email only
 */
import Link from "next/link";
import type { Show } from "@/lib/types";
import { REVIEW_MODE, usePreview } from "./Preview";
import { IconMail } from "./Icons";

export const SENDER = "hello@viewslipstream.com";

export default function CheckEmail({ show, email, mode, onDeep }: { show: Show; email?: string; mode: "rsvp" | "live"; onDeep?: boolean }) {
  const ctx = usePreview();
  const to = email ?? "your email";
  const sub = onDeep ? "rgba(255,255,255,.78)" : "var(--muted)";

  if (mode === "rsvp") {
    return (
      <div className={`check-email${onDeep ? " on-deep" : ""}`} role="status">
        <IconMail size={20} />
        <div className="stack g4" style={{ minWidth: 0 }}>
          <b>Check your email</b>
          <span className="small" style={{ color: sub }}>
            We sent your confirmation to <b style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{to}</b> from {SENDER}. Not there? Check your spam, junk or promotions folder.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card stack g12" style={{ padding: "16px 18px" }}>
      <div className="row g10"><IconMail size={22} /><b style={{ fontWeight: 600, fontSize: 17 }}>Your access code is in your email</b></div>
      <p className="small" style={{ color: sub }}>
        We emailed it to <b style={{ fontWeight: 600, color: "var(--text)", overflowWrap: "anywhere" }}>{to}</b> when the show went live. Look for
        <b style={{ fontWeight: 600, color: "var(--text)" }}> &ldquo;It&rsquo;s showtime: {show.title}&rdquo;</b> from {SENDER}. Copy the code, tap play, then paste it in.
      </p>
      <p className="small" style={{ color: sub }}>Not in your inbox? Check spam, junk or promotions, or search for {SENDER}.</p>
      <div className="row g8 wrap-row">
        <button className="btn btn-secondary btn-sm" onClick={() => ctx.say(`Review build: on the live site this resends the email to ${to}.`)}>Resend the email</button>
        {REVIEW_MODE ? <Link href={`/emails/live/?show=${show.slug}`} className="btn btn-secondary btn-sm">See the email</Link> : null}
      </div>
    </div>
  );
}
