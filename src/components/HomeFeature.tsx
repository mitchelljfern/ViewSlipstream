"use client";
/**
 * The "what's on now / next" card at the bottom of the home hero: a glass
 * card on the hero image with one tab per show along its top edge.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import type { Phase, Show } from "@/lib/types";
import { monthDay, whenLine } from "@/lib/time";
import { usePreview } from "./Preview";
import VideoFacade, { youtubeEmbed, youtubeThumb } from "./VideoFacade";
import { IconCalendar, IconMic, IconPin, IconPlay } from "./Icons";
import Countdown, { endLabel, startLabel } from "./Countdown";

export const KIND = { streaming: "Streaming", "in-person": "In Person", giveaway: "Giveaway", live: "Live Stream", paid: "Paid" } as const;

export type FeatureItem = { show: Show; phase: Phase };

/** Most tabs the hero shows. Four fit one row on desktop; the rest stay in the Upcoming rail. */
export const MAX_FEATURED = 4;
const MIN_FEATURED = 2;

/**
 * Which shows get a tab: live ones first, then upcoming soonest first. If that
 * makes fewer than two, the most recent past shows fill in, newest first.
 */
export function pickFeatured(shows: Show[], phaseFor: (s: Show) => Phase): FeatureItem[] {
  const items = shows.map((show) => ({ show, phase: phaseFor(show) }));
  const start = (it: FeatureItem) => it.show.startsAt ?? "";
  const last = (it: FeatureItem) => it.show.endsAt ?? it.show.startsAt ?? "";
  const live = items.filter((it) => it.phase === "live").sort((a, b) => start(a).localeCompare(start(b)));
  const next = items.filter((it) => it.phase === "upcoming").sort((a, b) => start(a).localeCompare(start(b)));
  const picked = [...live, ...next].slice(0, MAX_FEATURED);
  if (picked.length < MIN_FEATURED) {
    const recent = items.filter((it) => it.phase === "closed").sort((a, b) => last(b).localeCompare(last(a)));
    picked.push(...recent.slice(0, MIN_FEATURED - picked.length));
  }
  return picked;
}

const isLive = (it: FeatureItem) => it.phase === "live" && it.show.kind !== "in-person";

/** Short status for tabs: "Live Now", "Entries Open", "Nov 5th", "Ended Oct 30th". */
export function statusLabel(it: FeatureItem) {
  if (isLive(it)) return it.show.kind === "giveaway" ? "Entries Open" : "Live Now";
  if (it.phase === "closed") { const d = it.show.endsAt ?? it.show.startsAt; return d ? `Ended ${monthDay(d)}` : "Most Recent"; }
  return it.show.startsAt ? monthDay(it.show.startsAt) : "Coming Soon";
}

function eyebrow(it: FeatureItem) {
  return it.phase === "live" ? "Now Showing" : it.phase === "upcoming" ? "Next on Slipstream" : "Most Recent";
}

/** Everything about one show: details and CTA on one side, trailer on the other. */
export function FeatureBody({ item }: { item: FeatureItem }) {
  const ctx = usePreview();
  const { show, phase } = item;
  const status = ctx.rsvps[show.slug];
  const watchable = phase === "live" && !!status && status !== "waitlisted" && !!ctx.who && show.kind !== "in-person";
  const media = show.trailerYoutubeId
    ? <VideoFacade embed={youtubeEmbed(show.trailerYoutubeId)} thumbnail={youtubeThumb(show.trailerYoutubeId)} label={`${show.title} trailer`} caption="Watch the trailer" />
    : show.heroImage ? <div className="facade" style={{ cursor: "default" }}><img src={show.heroImage} alt="" loading="lazy" /></div> : null;
  return (
    <div className="feature-body">
      <div className="stack g14">
        <div className="row between g8">
          <span className="eyebrow">{eyebrow(item)}</span>
          <div className="row g6">
            {isLive(item) ? <span className="chip chip-white"><span className="live-dot" />Live</span> : null}
            <span className="chip chip-outline">{KIND[show.kind]}</span>
          </div>
        </div>
        <h1 className="h1 feature-title">{show.title}</h1>
        <div className="stack g8" style={{ fontSize: 15 }}>
          {show.startsAt ? <div className="row g10"><IconCalendar size={18} /><span>{whenLine(show)}</span></div> : null}
          {show.venue ? <div className="row g10 muted"><IconPin size={18} /><span>{show.venue.name}</span></div> : null}
          {show.conversationLine ? <div className="row g10 muted" style={{ alignItems: "flex-start" }}><IconMic size={18} /><span>{show.conversationLine.replace(/^the (screening|documentary) will be followed by a /i, "Followed by a ")}</span></div> : null}
        </div>
        {phase === "upcoming" && show.startsAt ? <Countdown to={show.startsAt} label={startLabel(show.kind)} />
          : phase === "live" && show.endsAt && show.kind !== "in-person" ? <Countdown to={show.endsAt} label={endLabel(show.kind)} /> : null}
        <div className="stack g10" style={{ marginTop: 4 }}>
          {watchable ? <Link href={`/${show.slug}/#player`} className="btn btn-primary"><IconPlay size={18} />Watch Now</Link>
            : status ? <Link href={`/${show.slug}/`} className="btn btn-secondary">{status === "waitlisted" ? "On the Waiting List · View Details" : <>You&apos;re In · View Details</>}</Link>
            : phase !== "closed" && !show.atCapacity ? <Link href={`/${show.slug}/#rsvp`} className="btn btn-primary">{show.kind === "giveaway" ? "Enter the Giveaway" : show.kind === "in-person" ? "RSVP · Limited Seats" : "RSVP · Free"}</Link>
            : <Link href={`/${show.slug}/`} className="btn btn-secondary">View the Show</Link>}
        </div>
      </div>
      {media}
    </div>
  );
}

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
