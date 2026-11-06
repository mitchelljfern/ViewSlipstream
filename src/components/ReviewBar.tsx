"use client";
/**
 * Review toolbar, shown only while NEXT_PUBLIC_REVIEW_MODE is on (the
 * staging build). Lets the client and the team flip the states that would
 * otherwise need real accounts, real RSVPs and real dates.
 */
import Link from "next/link";
import { useState } from "react";
import { REVIEW_MODE, usePreview, type Access, type PhaseOverride } from "./Preview";
import { IconClose, IconSliders } from "./Icons";
import { allShows } from "@/lib/data";

export default function ReviewBar() {
  const ctx = usePreview();
  const [open, setOpen] = useState(false);
  if (!REVIEW_MODE) return null;
  const lead = allShows().find((s) => s.slug === ctx.leadSlug);
  const phases: [PhaseOverride, string][] = [["auto", "Real dates"], ["upcoming", "Before"], ["live", "During"], ["closed", "After"]];
  return (
    <div className="review">
      {open ? (
        <div className="review-panel" role="dialog" aria-label="Review controls">
          <div className="row between"><h2>Review controls</h2><button className="icon-btn" style={{ color: "#111", width: 36, height: 36 }} aria-label="Close" onClick={() => setOpen(false)}><IconClose size={18} /></button></div>
          <p style={{ fontSize: 12, color: "#5c6470", margin: 0 }}>Staging only. Nothing here is saved anywhere but this browser, and no emails are sent.</p>
          <div className="stack g6"><span className="lbl">Viewing as</span>
            <div className="opts">
              <button aria-pressed={!ctx.guest} onClick={() => ctx.signOut()}>No account</button>
              <button aria-pressed={!!ctx.guest} onClick={() => ctx.signIn(ctx.who ?? { first: "Alex", last: "Rivera", email: "alex@example.com" })}>Signed in</button>
            </div>
          </div>
          {lead ? (
            <div className="stack g6"><span className="lbl">{lead.title}: pretend it's</span>
              <div className="opts">{phases.map(([p, l]) => <button key={p} aria-pressed={ctx.phase === p} onClick={() => ctx.setPhase(p)}>{l}</button>)}</div>
            </div>
          ) : null}
          {lead ? (
            <div className="stack g6"><span className="lbl">RSVP for {lead.title}</span>
              <div className="opts">
                <button aria-pressed={!ctx.rsvps[lead.slug]} onClick={() => ctx.cancel(lead.slug)}>Not RSVP'd</button>
                <button aria-pressed={!!ctx.rsvps[lead.slug]} onClick={() => { if (ctx.guest) ctx.rsvp(lead.slug, "confirmed"); else ctx.rsvpAsGuest(lead.slug, "confirmed", ctx.who ?? { first: "Alex", last: "Rivera", email: "alex@example.com" }); }}>RSVP'd</button>
              </div>
            </div>
          ) : null}
          <div className="stack g6"><span className="lbl">Access code goes</span>
            <div className="opts">
              {([["both", "Page + email"], ["page", "Page only"], ["email", "Email only"]] as [Access, string][]).map(([a, l]) => (
                <button key={a} aria-pressed={ctx.access === a} onClick={() => ctx.setAccess(a)}>{l}</button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#5c6470", margin: 0 }}>Tip: RSVP'd + During shows the screening room with the player and password. An account is optional. In-person seats and the waiting list are on the All screens page.</p>
          <div className="row g12 wrap-row" style={{ fontSize: 13 }}>
            <Link href="/review/" onClick={() => setOpen(false)}>All screens and states</Link>
            <button style={{ background: "none", border: 0, padding: 0, color: "#b42318", fontWeight: 600, cursor: "pointer" }} onClick={() => { ctx.reset(); ctx.say("Review session reset"); }}>Reset</button>
          </div>
        </div>
      ) : (
        <button className="review-fab" onClick={() => setOpen(true)} aria-label="Open review controls"><IconSliders size={16} />Review</button>
      )}
    </div>
  );
}

export function Toast() {
  const { toast } = usePreview();
  if (!toast) return null;
  return <div className="toast" role="status" aria-live="polite">{toast}</div>;
}
