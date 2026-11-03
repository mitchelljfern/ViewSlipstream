"use client";
/** One page that links every screen and shows every RSVP state, for review. */
import Link from "next/link";
import { usePreview } from "./Preview";
import RsvpPanel from "./RsvpPanel";
import { allShows, getShow } from "@/lib/data";
import type { Show } from "@/lib/types";

export default function ReviewIndex() {
  const ctx = usePreview();
  const lead = allShows().find((s) => s.slug === ctx.leadSlug) ?? allShows()[0];
  const inPerson = getShow("the-only-living-pickpocket-in-new-york")!;
  const giveaway = getShow("klara-and-the-sun")!;
  const paid: Show = { ...lead, kind: "paid", price: 12 };
  const live: Show = { ...lead, kind: "live" };
  const full: Show = { ...inPerson, atCapacity: true };

  const screens: [string, string][] = [
    ["Home", "/"], [`Show page: ${lead.title}`, `/${lead.slug}/`], [`In person: ${inPerson.title}`, `/${inPerson.slug}/`],
    [`Giveaway: ${giveaway.title}`, `/${giveaway.slug}/`], ["Sign in / create account", "/sign-in/"], ["Account", "/account/"],
    ["In Conversation (all videos)", "/in-conversation/"], ["Previous titles", "/previous-titles/"],
    ["Email 1: confirmation", `/emails/rsvp/?show=${lead.slug}`], ["Email 2: it's showtime", `/emails/live/?show=${lead.slug}`], ["Email 3: thank you", `/emails/thanks/?show=${lead.slug}`],
    ["404 page", "/this-page-does-not-exist/"],
  ];
  const states: [string, React.ReactNode][] = [
    ["Open, signed out (RSVP creates the account)", <RsvpPanel key="1" show={lead} forced={{ phase: "upcoming", signedIn: false }} />],
    ["Open, signed in (one tap)", <RsvpPanel key="2" show={lead} forced={{ phase: "upcoming", signedIn: true }} />],
    ["In person with seats", <RsvpPanel key="3" show={{ ...inPerson, atCapacity: false }} forced={{ phase: "upcoming", signedIn: true }} />],
    ["Confirmed", <RsvpPanel key="4" show={lead} forced={{ phase: "upcoming", signedIn: true, status: "confirmed" }} />],
    ["Live and RSVP'd", <RsvpPanel key="5" show={lead} forced={{ phase: "live", signedIn: true, status: "confirmed" }} />],
    ["Giveaway", <RsvpPanel key="6" show={giveaway} forced={{ phase: "live", signedIn: true }} />],
    ["Paid show (Stripe)", <RsvpPanel key="7" show={paid} forced={{ phase: "upcoming", signedIn: true }} />],
    ["Live stream (YouTube Live)", <RsvpPanel key="8" show={live} forced={{ phase: "upcoming", signedIn: true }} />],
    ["At capacity", <RsvpPanel key="9" show={full} forced={{ phase: "upcoming", signedIn: true }} />],
    ["Closed", <RsvpPanel key="10" show={lead} forced={{ phase: "closed", signedIn: true }} />],
  ];
  return (
    <div className="wrap section stack g32" style={{ paddingTop: 28 }}>
      <div className="stack g10" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Review build</span>
        <h1 className="h1">Every screen and state</h1>
        <p className="muted">Use the Review button (bottom right) to switch between guest and signed in, and to pretend it's before, during or after {lead.title}. Nothing is saved anywhere but your browser, and no emails are sent.</p>
      </div>
      <section className="stack g12">
        <h2 className="h2">Screens</h2>
        <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(260px, 100%), 1fr))", gap: 10 }}>
          {screens.map(([t, h]) => <Link key={h} href={h} className="card" style={{ padding: "14px 16px", color: "var(--text)", fontWeight: 600 }}>{t}</Link>)}
        </div>
      </section>
      <section className="stack g12">
        <h2 className="h2">RSVP card states</h2>
        <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))", gap: 24, alignItems: "start" }}>
          {states.map(([t, el]) => <div key={t} className="stack g10"><span className="eyebrow" style={{ color: "var(--link)" }}>{t}</span>{el}</div>)}
        </div>
      </section>
    </div>
  );
}
