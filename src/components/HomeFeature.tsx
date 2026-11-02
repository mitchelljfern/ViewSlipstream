"use client";
/**
 * The "what's on now / next" card at the bottom of the home hero.
 * Two designs are on trial (picked in the review panel):
 *   A · FeatureTabs: one card, a tab per show along its top edge.
 *   B · FeatureCarousel: one card per show in a swipe row, arrows and dots.
 * Both sit on the hero image as a glass card and show one show at a time.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Phase, Show } from "@/lib/types";
import { monthDay, whenLine } from "@/lib/time";
import { usePreview } from "./Preview";
import VideoFacade, { youtubeEmbed, youtubeThumb } from "./VideoFacade";
import { IconBack, IconCalendar, IconChevron, IconMic, IconPin, IconPlay } from "./Icons";
import Countdown, { endLabel, startLabel } from "./Countdown";

export const KIND = { streaming: "Streaming", "in-person": "In Person", giveaway: "Giveaway", live: "Live Stream", paid: "Paid" } as const;

export type FeatureItem = { show: Show; phase: Phase };

const isLive = (it: FeatureItem) => it.phase === "live" && it.show.kind !== "in-person";

/** Short status for tabs and dots: "Live Now", "Entries Open", "Nov 5th". */
export function statusLabel(it: FeatureItem) {
  if (isLive(it)) return it.show.kind === "giveaway" ? "Entries Open" : "Live Now";
  if (it.phase === "closed") return "Most Recent";
  return it.show.startsAt ? monthDay(it.show.startsAt) : "Coming Soon";
}

function eyebrow(it: FeatureItem) {
  return it.phase === "live" ? "Now Showing" : it.phase === "upcoming" ? "Next on Slipstream" : "Most Recent";
}

/** Everything about one show: details and CTA on one side, trailer on the other. */
export function FeatureBody({ item, compact = false, level = 1 }: { item: FeatureItem; compact?: boolean; level?: 1 | 2 }) {
  const ctx = usePreview();
  const { show, phase } = item;
  const status = ctx.rsvps[show.slug];
  const watchable = phase === "live" && !!status && !!ctx.guest && show.kind !== "in-person";
  const media = show.trailerYoutubeId
    ? <VideoFacade embed={youtubeEmbed(show.trailerYoutubeId)} thumbnail={youtubeThumb(show.trailerYoutubeId)} label={`${show.title} trailer`} caption="Watch the trailer" />
    : show.heroImage ? <div className="facade" style={{ cursor: "default" }}><img src={show.heroImage} alt="" loading="lazy" /></div> : null;
  return (
    <div className={`feature-body${compact ? " is-compact" : ""}`}>
      <div className="stack g14">
        <div className="row between g8">
          <span className="eyebrow">{eyebrow(item)}</span>
          <div className="row g6">
            {isLive(item) ? <span className="chip chip-white"><span className="live-dot" />Live</span> : null}
            <span className="chip chip-outline">{KIND[show.kind]}</span>
          </div>
        </div>
        {level === 1 ? <h1 className="h1 feature-title">{show.title}</h1> : <h2 className="h1 feature-title">{show.title}</h2>}
        <div className="stack g8" style={{ fontSize: 15 }}>
          {show.startsAt ? <div className="row g10"><IconCalendar size={18} /><span>{whenLine(show)}</span></div> : null}
          {show.venue ? <div className="row g10 muted"><IconPin size={18} /><span>{show.venue.name}</span></div> : null}
          {show.conversationLine ? <div className="row g10 muted" style={{ alignItems: "flex-start" }}><IconMic size={18} /><span>{show.conversationLine.replace(/^the (screening|documentary) will be followed by a /i, "Followed by a ")}</span></div> : null}
        </div>
        {phase === "upcoming" && show.startsAt ? <Countdown to={show.startsAt} label={startLabel(show.kind)} />
          : phase === "live" && show.endsAt && show.kind !== "in-person" ? <Countdown to={show.endsAt} label={endLabel(show.kind)} /> : null}
        <div className="stack g10" style={{ marginTop: 4 }}>
          {watchable ? <Link href={`/${show.slug}/#player`} className="btn btn-primary"><IconPlay size={18} />Watch Now</Link>
            : status ? <Link href={`/${show.slug}/`} className="btn btn-secondary">You&apos;re In · View Details</Link>
            : phase !== "closed" && !show.atCapacity ? <Link href={`/${show.slug}/#rsvp`} className="btn btn-primary">{show.kind === "giveaway" ? "Enter the Giveaway" : show.kind === "in-person" ? "RSVP · Limited Seats" : "RSVP · Free"}</Link>
            : <Link href={`/${show.slug}/`} className="btn btn-secondary">View the Show</Link>}
        </div>
      </div>
      {media}
    </div>
  );
}

/* ---------- Option A: one card, tabs along the top ---------- */

export function FeatureTabs({ items }: { items: FeatureItem[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const i = Math.min(active, items.length - 1);
  const go = (n: number) => { const k = (n + items.length) % items.length; setActive(k); tabs.current[k]?.focus(); };
  return (
    <div className="wrap feature-wrap">
      <div className="feature-card">
        {items.length > 1 ? (
          <div className="feature-tabs" role="tablist" aria-label="On Slipstream">
            {items.map((it, n) => (
              <button key={it.show.slug} ref={(el) => { tabs.current[n] = el; }} role="tab" id={`ft-${n}`} aria-controls="ft-panel"
                aria-selected={n === i} tabIndex={n === i ? 0 : -1} className="feature-tab" onClick={() => setActive(n)}
                onKeyDown={(e) => { if (e.key === "ArrowRight") go(n + 1); if (e.key === "ArrowLeft") go(n - 1); }}>
                <span className="feature-tab-thumb">{it.show.heroImage ? <img src={it.show.heroImage} alt="" /> : null}</span>
                <span className="stack g4" style={{ minWidth: 0 }}>
                  <span className={`feature-tab-status${isLive(it) ? " is-live" : ""}`}>{isLive(it) ? <span className="live-dot" /> : null}{statusLabel(it)}</span>
                  <span className="feature-tab-title">{it.show.title}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div role={items.length > 1 ? "tabpanel" : undefined} id="ft-panel" aria-labelledby={items.length > 1 ? `ft-${i}` : undefined} key={items[i].show.slug} className="feature-panel">
          <FeatureBody item={items[i]} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Option B: a swipe row of cards ---------- */

export function FeatureCarousel({ items }: { items: FeatureItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const many = items.length > 1;

  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    const onScroll = () => {
      const cards = Array.from(el.children) as HTMLElement[];
      const left = el.scrollLeft + el.clientWidth * 0.25;
      let k = 0;
      cards.forEach((c, n) => { if (c.offsetLeft - el.offsetLeft <= left) k = n; });
      setActive(k);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [many]);

  const to = (n: number) => {
    const el = track.current;
    const card = el?.children[n] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || "0"), behavior: "smooth" });
  };

  return (
    <div className="feature-carousel">
      {many ? (
        <div className="wrap row between g12 feature-carousel-head">
          <span className="eyebrow">On Slipstream · {active + 1} of {items.length}</span>
          <div className="row g8">
            <button className="icon-btn btn-glass feature-arrow" aria-label="Previous show" disabled={active === 0} onClick={() => to(active - 1)}><IconBack size={20} /></button>
            <button className="icon-btn btn-glass feature-arrow" aria-label="Next show" disabled={active === items.length - 1} onClick={() => to(active + 1)}><IconChevron size={20} /></button>
          </div>
        </div>
      ) : null}
      <div ref={track} className={`feature-track${many ? " is-many" : ""}`} aria-roledescription={many ? "carousel" : undefined} aria-label="On Slipstream">
        {items.map((it, n) => (
          <article key={it.show.slug} className="feature-card feature-slide" aria-roledescription={many ? "slide" : undefined} aria-label={many ? `${n + 1} of ${items.length}: ${it.show.title}` : undefined}>
            <FeatureBody item={it} compact={many} level={n === 0 ? 1 : 2} />
          </article>
        ))}
      </div>
      {many ? (
        <div className="feature-dots">
          {items.map((it, n) => (
            <button key={it.show.slug} aria-label={`Show ${n + 1}: ${it.show.title}`} aria-current={n === active} onClick={() => to(n)}>
              <span className={`feature-dot${isLive(it) ? " is-live" : ""}`} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
