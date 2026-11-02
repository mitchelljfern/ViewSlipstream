"use client";
import Link from "next/link";
import type { Conversation, Show } from "@/lib/types";
import { monthDay, phaseOf, shortWhen, upcomingShows, whenLine, minutes } from "@/lib/time";
import { usePreview } from "./Preview";
import VideoFacade, { youtubeEmbed, youtubeThumb } from "./VideoFacade";
import Rail, { type RailItem } from "./Rail";
import CategoryBrowser, { slugId, splitGroupTitle, type Category } from "./CategoryBrowser";
import { IconCalendar, IconChevron, IconMic, IconPin, IconPlay } from "./Icons";

const KIND = { streaming: "Streaming", "in-person": "In Person", giveaway: "Giveaway", live: "Live Stream", paid: "Paid" } as const;

export default function HomeView({ groups, conversations, allShows }: {
  groups: { title: string; shows: Show[] }[]; conversations: Conversation[]; allShows: Show[];
}) {
  const ctx = usePreview();
  const lead = allShows.find((s) => s.slug === ctx.leadSlug) ?? allShows[0];
  const phase = ctx.phaseFor(lead);
  const status = ctx.rsvps[lead.slug];
  const others = upcomingShows(allShows, ctx.now, lead.slug);
  const watchable = phase === "live" && !!status && !!ctx.guest && lead.kind !== "in-person";

  const toItem = (s: Show): RailItem => {
    const p = s.slug === lead.slug ? phase : phaseOf(s, ctx.now);
    return {
      href: `/${s.slug}/`, title: s.title, image: s.poster, ratio: s.posterRatio,
      meta: `${KIND[s.kind]}${s.startsAt ? ` · ${shortWhen(s.startsAt).split(" · ")[0]}` : ""}`,
      badge: p === "live" && s.kind !== "in-person" ? { label: s.kind === "giveaway" ? "Entries Open" : "Live", tone: "live" }
        : p === "upcoming" ? { label: "RSVP Open", tone: "open" } : null,
    };
  };

  const categories: Category[] = groups.map((g) => {
    const { kicker, title } = splitGroupTitle(g.title);
    const starts = g.shows.map((s) => s.startsAt).filter(Boolean) as string[];
    const ends = g.shows.map((s) => s.endsAt ?? s.startsAt).filter(Boolean) as string[];
    const a = starts.sort()[0], b = ends.sort().slice(-1)[0];
    const range = a && b ? (monthDay(a) === monthDay(b) ? monthDay(a) : `${monthDay(a)} to ${monthDay(b)}`) : "";
    const n = g.shows.length;
    return { id: slugId(g.title), kicker, title, meta: `${n} ${n === 1 ? "title" : "titles"}${range ? ` · ${range}` : ""}`, items: g.shows.map(toItem) };
  });

  return (
    <>
      <section className="hero bleed-top">
        {lead.heroImage ? <div className="hero-bg"><img src={lead.heroImage} alt="" /></div> : null}
        <div className="wrap home-hero">
          <div className="stack g14">
            <div className="row between g8">
              <span className="eyebrow">{phase === "live" ? "Now Showing" : phase === "upcoming" ? "Next Up" : "Most Recent"}</span>
              <div className="row g6">
                {phase === "live" && lead.kind !== "in-person" ? <span className="chip chip-white"><span className="live-dot" />Live</span> : null}
                <span className="chip chip-outline">{KIND[lead.kind]}</span>
              </div>
            </div>
            <h1 className="h1">{lead.title}</h1>
            <div className="stack g8" style={{ fontSize: 15 }}>
              {lead.startsAt ? <div className="row g10"><IconCalendar size={18} /><span>{whenLine(lead)}</span></div> : null}
              {lead.venue ? <div className="row g10 muted"><IconPin size={18} /><span>{lead.venue.name}</span></div> : null}
              {lead.conversationLine ? <div className="row g10 muted" style={{ alignItems: "flex-start" }}><IconMic size={18} /><span>{lead.conversationLine.replace(/^the (screening|documentary) will be followed by a /i, "Followed by a ")}</span></div> : null}
            </div>
            <div className="stack g10" style={{ marginTop: 4 }}>
              {watchable ? <Link href={`/${lead.slug}/#player`} className="btn btn-primary"><IconPlay size={18} />Watch Now</Link>
                : status ? <Link href={`/${lead.slug}/`} className="btn btn-secondary">You're In · View Details</Link>
                : phase !== "closed" && !lead.atCapacity ? <Link href={`/${lead.slug}/#rsvp`} className="btn btn-primary">{lead.kind === "giveaway" ? "Enter the Giveaway" : lead.kind === "in-person" ? "RSVP · Limited Seats" : "RSVP · Free"}</Link>
                : <Link href={`/${lead.slug}/`} className="btn btn-secondary">View the Show</Link>}
            </div>
          </div>
          {lead.trailerYoutubeId ? (
            <VideoFacade embed={youtubeEmbed(lead.trailerYoutubeId)} thumbnail={youtubeThumb(lead.trailerYoutubeId)} label={`${lead.title} trailer`} caption="Watch the trailer" />
          ) : null}
        </div>
      </section>

      {others.length ? (
        <section id="upcoming" className="wrap section stack g14">
          <div className="section-head"><h2 className="h2">Upcoming</h2></div>
          <Rail items={others.map(toItem)} label="Upcoming" />
        </section>
      ) : null}

      <section id="titles" className="wrap section stack g16">
        <div className="section-head">
          <div className="stack g4"><h2 className="h2">Featured Titles</h2><span className="muted small">Browse by month and series</span></div>
          <Link href="/previous-titles/" className="btn btn-glass btn-sm">Previous Titles<IconChevron size={16} /></Link>
        </div>
        <CategoryBrowser categories={categories} jumpBar />
      </section>

      <section className="wrap section stack g16">
        <div className="section-head">
          <div className="stack g4"><h2 className="h2">In Conversation</h2><span className="muted small">Talks with the people who made the shows</span></div>
        </div>
        <div className="auto-grid">
          {conversations.slice(0, 3).map((c) => (
            <article key={c.id} className="card" style={{ overflow: "hidden" }}>
              <VideoFacade embed={c.embed} thumbnail={c.thumbnail} label={c.title} duration={minutes(c.durationSec)} rounded={false} />
              <div style={{ padding: "12px 14px 14px" }}><p style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{c.title}</p></div>
            </article>
          ))}
        </div>
        <Link href="/in-conversation/" className="btn btn-white cta-center"><IconPlay size={18} />Watch All {conversations.length} Conversations</Link>
      </section>

      <section className="wrap section">
        <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}>
          <div className="panel-deep on-deep stack g12">
            <h2 className="h2">Hear About the Next Show First</h2>
            <p>Screenings, filmmaker conversations and giveaways, once or twice a month.</p>
            <form className="stack g10" onSubmit={(e) => { e.preventDefault(); ctx.say("Thanks. You're on the list (review build: nothing was sent)."); (e.currentTarget as HTMLFormElement).reset(); }}>
              <label className="label" htmlFor="nl">Email address</label>
              <input id="nl" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required />
              <button className="btn btn-light">Join the Newsletter</button>
            </form>
          </div>
          <div className="card stack g12" style={{ padding: 24 }}>
            <h2 className="h2">Want to Get in Touch?</h2>
            <p className="muted">Slipstream c/o Satiated Productions, Slipstream LLC<br />Los Angeles, CA</p>
            <a href="mailto:hello@viewslipstream.com" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>Contact Us</a>
          </div>
        </div>
      </section>
    </>
  );
}
