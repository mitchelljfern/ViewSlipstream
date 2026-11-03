"use client";
import Link from "next/link";
import type { Conversation, Show } from "@/lib/types";
import { monthDay, shortWhen, upcomingShows, minutes } from "@/lib/time";
import { usePreview } from "./Preview";
import VideoFacade from "./VideoFacade";
import Rail, { type RailItem } from "./Rail";
import CategoryBrowser, { slugId, splitGroupTitle, type Category } from "./CategoryBrowser";
import { IconChevron, IconGift, IconMic, IconPlay } from "./Icons";
import { FeatureTabs, KIND, pickFeatured } from "./HomeFeature";


export default function HomeView({ groups, conversations, allShows }: {
  groups: { title: string; shows: Show[] }[]; conversations: Conversation[]; allShows: Show[];
}) {
  const ctx = usePreview();
  const featured = pickFeatured(allShows, ctx.phaseFor);
  // Open shows that didn't fit in the hero tabs carry on in the Upcoming rail.
  const others = upcomingShows(allShows, ctx.now).filter((s) => !featured.some((f) => f.show.slug === s.slug));
  const heroImage = featured[0]?.show.heroImage;
  // Giveaways: the open one if there is one, otherwise the newsletter (that's where the next one is announced).
  const openGiveaway = allShows.find((s) => s.kind === "giveaway" && ctx.phaseFor(s) !== "closed");
  const giveawayHref = openGiveaway ? `/${openGiveaway.slug}/` : "#newsletter";

  const toItem = (s: Show): RailItem => {
    const p = ctx.phaseFor(s);
    return {
      href: `/${s.slug}/`, title: s.title, image: s.poster, ratio: s.posterRatio,
      // Horizontal cards: the poster when it is already landscape, otherwise the key art.
      wideImage: s.posterRatio > 1.2 ? s.poster : s.heroImage ?? s.poster,
      meta: `${KIND[s.kind]}${s.startsAt ? ` · ${shortWhen(s.startsAt).split(" · ")[0]}` : ""}`,
      badge: p === "live" && s.kind !== "in-person" ? { label: s.kind === "giveaway" ? "Entries Open" : "Live", tone: "live" }
        : p === "upcoming" ? { label: "RSVP Open", tone: "open" } : null,
    };
  };

  const metaFor = (shows: Show[]) => {
    const starts = shows.map((s) => s.startsAt).filter(Boolean) as string[];
    const ends = shows.map((s) => s.endsAt ?? s.startsAt).filter(Boolean) as string[];
    const a = starts.sort()[0], b = ends.sort().slice(-1)[0];
    const range = a && b ? (monthDay(a) === monthDay(b) ? monthDay(a) : `${monthDay(a)} to ${monthDay(b)}`) : "";
    return `${shows.length} ${shows.length === 1 ? "title" : "titles"}${range ? ` · ${range}` : ""}`;
  };
  // Month groups ("October Screenings") become tabs of one Screenings section,
  // placed where the first month appears; series keep their own sections.
  const categories: Category[] = [];
  const months: NonNullable<Category["tabs"]> = [];
  let screeningsAt = -1;
  for (const g of groups) {
    const { kicker, title } = splitGroupTitle(g.title);
    if (kicker === "Screenings") {
      if (screeningsAt < 0) { screeningsAt = categories.length; categories.push(null as unknown as Category); }
      months.push({ key: slugId(g.title), label: title, meta: metaFor(g.shows), items: g.shows.map(toItem) });
    } else {
      categories.push({ id: slugId(g.title), kicker, title, meta: metaFor(g.shows), items: g.shows.map(toItem) });
    }
  }
  if (screeningsAt >= 0) {
    const all = groups.filter((g) => splitGroupTitle(g.title).kicker === "Screenings").flatMap((g) => g.shows);
    categories[screeningsAt] = { id: "cat-screenings", kicker: "By month", title: "Screenings", meta: `${months.length} months · ${all.length} titles`, items: [], tabs: months };
  }

  return (
    <>
      <section className="hero bleed-top">
        {heroImage ? <div className="hero-bg"><img src={heroImage} alt="" /></div> : null}
        <div className="wrap hero-intro">
          <h2 className="tagline">Streaming Interactive Entertainment</h2>
          <p className="lede">Compelling, provocative presentations and conversations with artists and creators.</p>
          <nav className="pillars" aria-label="What Slipstream does">
            <a href="#titles"><IconPlay size={16} />Screenings &amp; Live Events</a>
            <Link href="/in-conversation/"><IconMic size={16} />Conversations w/ Makers</Link>
            <Link href={giveawayHref}><IconGift size={16} />Giveaways</Link>
          </nav>
        </div>
        <FeatureTabs items={featured} />
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
          <Link href="/in-conversation/" className="btn btn-glass btn-sm"><IconPlay size={16} />Watch All {conversations.length} Conversations</Link>
        </div>
        {/* 4 across on desktop, 2 rows of 2 on tablets and phones. */}
        <div className="conv-grid">
          {conversations.slice(0, 4).map((c) => (
            <article key={c.id} className="card" style={{ overflow: "hidden" }}>
              <VideoFacade embed={c.embed} thumbnail={c.thumbnail} label={c.title} duration={minutes(c.durationSec)} rounded={false} />
              <div className="conv-grid-body"><p>{c.title}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="auto-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))" }}>
          <div id="newsletter" className="panel-deep on-deep stack g12" style={{ scrollMarginTop: "calc(var(--header-h) + 16px)" }}>
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
