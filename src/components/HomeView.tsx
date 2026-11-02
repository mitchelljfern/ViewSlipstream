"use client";
import Link from "next/link";
import { useState } from "react";
import type { Conversation, Show } from "@/lib/types";
import { phaseOf, shortWhen, upcomingShows, whenLine, minutes } from "@/lib/time";
import { usePreview } from "./Preview";
import PosterTile from "./PosterTile";
import VideoFacade, { youtubeEmbed, youtubeThumb } from "./VideoFacade";
import { IconCalendar, IconMic, IconPin, IconPlay } from "./Icons";

const kindChip = (s: Show, live: boolean) =>
  live && s.kind !== "in-person" ? <span className="chip chip-white" style={{ alignSelf: "flex-start" }}><span className="live-dot" />{s.kind === "giveaway" ? "Entries open" : "Live"}</span>
    : s.kind === "giveaway" ? <span className="chip chip-blue" style={{ alignSelf: "flex-start" }}>Giveaway</span>
    : <span className="chip chip-outline" style={{ alignSelf: "flex-start" }}>{s.kind === "in-person" ? "In person" : s.kind === "paid" ? "Paid" : "Streaming"}</span>;

export default function HomeView({ groups, conversations, allShows }: {
  groups: { title: string; shows: Show[] }[]; conversations: Conversation[]; allShows: Show[];
}) {
  const ctx = usePreview();
  const lead = allShows.find((s) => s.slug === ctx.leadSlug) ?? allShows[0];
  const phase = ctx.phaseFor(lead);
  const status = ctx.rsvps[lead.slug];
  const others = upcomingShows(allShows, ctx.now, lead.slug);
  const [filter, setFilter] = useState<string>("All");
  const shown = filter === "All" ? groups : groups.filter((g) => g.title === filter);
  const watchable = phase === "live" && !!status && !!ctx.guest && lead.kind !== "in-person";

  return (
    <>
      <section className="hero">
        {lead.heroImage ? <div className="hero-bg"><img src={lead.heroImage} alt="" /></div> : null}
        <div className="wrap home-hero">
          <div className="stack g14">
            <div className="row between g8">
              <span className="eyebrow">{phase === "live" ? "Now showing" : phase === "upcoming" ? "Next up" : "Most recent"}</span>
              <div className="row g6">
                {phase === "live" && lead.kind !== "in-person" ? <span className="chip chip-white"><span className="live-dot" />Live</span> : null}
                <span className="chip chip-outline">{lead.kind === "in-person" ? "In person" : lead.kind === "giveaway" ? "Giveaway" : "Streaming"}</span>
              </div>
            </div>
            <h1 className="h1">{lead.title}</h1>
            <div className="stack g8" style={{ fontSize: 15 }}>
              {lead.startsAt ? <div className="row g10"><IconCalendar size={18} /><span>{whenLine(lead)}</span></div> : null}
              {lead.venue ? <div className="row g10 muted"><IconPin size={18} /><span>{lead.venue.name}</span></div> : null}
              {lead.conversationLine ? <div className="row g10 muted" style={{ alignItems: "flex-start" }}><IconMic size={18} /><span>{lead.conversationLine.replace(/^the (screening|documentary) will be followed by a /i, "Followed by a ")}</span></div> : null}
            </div>
            <div className="stack g10" style={{ marginTop: 4 }}>
              {watchable ? <Link href={`/${lead.slug}/#player`} className="btn btn-primary"><IconPlay size={18} />Watch now</Link>
                : status ? <Link href={`/${lead.slug}/`} className="btn btn-secondary">You're in · view details</Link>
                : phase !== "closed" && !lead.atCapacity ? <Link href={`/${lead.slug}/#rsvp`} className="btn btn-primary">{lead.kind === "giveaway" ? "Enter the giveaway" : lead.kind === "in-person" ? "RSVP · limited seats" : "RSVP · free"}</Link>
                : <Link href={`/${lead.slug}/`} className="btn btn-secondary">View the show</Link>}
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
          <div className="scroller">
            {others.map((s) => (
              <PosterTile key={s.slug} href={`/${s.slug}/`} title={s.title} poster={s.poster} ratio={s.posterRatio} width={160}
                chip={kindChip(s, phaseOf(s, ctx.now) === "live")} meta={s.startsAt ? shortWhen(s.startsAt) : undefined} />
            ))}
          </div>
        </section>
      ) : null}

      <section id="titles" className="wrap section stack g20">
        <div className="section-head"><h2 className="h2">Featured titles</h2><Link href="/previous-titles/">Previous titles</Link></div>
        <div className="scroller" role="group" aria-label="Filter titles" style={{ gap: 8 }}>
          {["All", ...groups.map((g) => g.title)].map((t) => (
            <button key={t} className="filter" aria-pressed={filter === t} onClick={() => setFilter(t)}>{t === "All" ? "All" : t.replace(/ Screenings?$/, "").replace(/ Series$/, "")}</button>
          ))}
        </div>
        {shown.map((g) => (
          <div key={g.title} className="stack g12">
            <span className="eyebrow">{g.title}</span>
            <div className="poster-grid">
              {g.shows.map((s) => (
                <PosterTile key={s.slug} href={`/${s.slug}/`} title={s.title} poster={s.poster} ratio={s.posterRatio}
                  meta={`${s.kind === "in-person" ? "In person" : s.kind === "giveaway" ? "Giveaway" : "Streaming"}${s.startsAt ? ` · ${shortWhen(s.startsAt).split(" · ")[0]}` : ""}`} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="wrap section stack g16">
        <div className="section-head"><h2 className="h2">In conversation</h2><Link href="/in-conversation/">All {conversations.length} conversations</Link></div>
        <div className="auto-grid">
          {conversations.slice(0, 3).map((c) => (
            <article key={c.id} className="card" style={{ overflow: "hidden" }}>
              <VideoFacade embed={c.embed} thumbnail={c.thumbnail} label={c.title} duration={minutes(c.durationSec)} rounded={false} />
              <div style={{ padding: "12px 14px 14px" }}><p style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{c.title}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}>
          <div className="panel-deep on-deep stack g12">
            <h2 className="h2">Hear about the next show first</h2>
            <p>Screenings, filmmaker conversations and giveaways, once or twice a month.</p>
            <form className="stack g10" onSubmit={(e) => { e.preventDefault(); ctx.say("Thanks. You're on the list (review build: nothing was sent)."); (e.currentTarget as HTMLFormElement).reset(); }}>
              <label className="label" htmlFor="nl">Email address</label>
              <input id="nl" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required />
              <button className="btn btn-light">Join the newsletter</button>
            </form>
          </div>
          <div className="card stack g12" style={{ padding: 24 }}>
            <h2 className="h2">Want to get in touch?</h2>
            <p className="muted">Slipstream c/o Satiated Productions, Slipstream LLC<br />Los Angeles, CA</p>
            <a href="mailto:hello@viewslipstream.com" className="btn btn-secondary" style={{ alignSelf: "flex-start" }}>Contact us</a>
          </div>
        </div>
      </section>
    </>
  );
}
