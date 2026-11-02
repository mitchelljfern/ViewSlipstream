"use client";
/**
 * A swipeable row of titles. Every card is the same height; posters are 2:3
 * and landscape key art keeps its own shape (wider card), so nothing gets
 * cropped or letterboxed. Arrow buttons appear on desktop when the row
 * overflows; phones just swipe.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconBack, IconChevron } from "./Icons";

export interface RailItem {
  href: string;
  title: string;
  image: string;
  /** width / height of the image; > 0.9 is treated as landscape */
  ratio?: number;
  meta?: string;
  badge?: { label: string; tone: "live" | "open" | "plain" } | null;
}

export default function Rail({ items, label }: { items: RailItem[]; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => { el.removeEventListener("scroll", measure); window.removeEventListener("resize", measure); };
  }, [measure]);

  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });

  return (
    <div className="rail-wrap" data-start={edges.start} data-end={edges.end}>
      <div className="rail" ref={ref} role="list" aria-label={label}>
        {items.map((it) => {
          const wide = (it.ratio ?? 0.667) > 0.9;
          return (
            <Link key={it.href + it.title} href={it.href} className={`rail-card${wide ? " is-wide" : ""}`} role="listitem">
              <div className="rail-art">
                <img src={it.image} alt="" loading="lazy" decoding="async" />
                {it.badge ? (
                  <span className={`chip ${it.badge.tone === "live" ? "chip-white" : it.badge.tone === "open" ? "chip-blue" : "chip-outline"} rail-badge`}>
                    {it.badge.tone === "live" ? <span className="live-dot" /> : null}{it.badge.label}
                  </span>
                ) : null}
              </div>
              <span className="rail-title">{it.title}</span>
              {it.meta ? <span className="rail-meta">{it.meta}</span> : null}
            </Link>
          );
        })}
      </div>
      <button className="rail-arrow prev" aria-label={`Scroll ${label} back`} onClick={() => go(-1)} tabIndex={edges.start ? -1 : 0}><IconBack size={20} /></button>
      <button className="rail-arrow next" aria-label={`Scroll ${label} forward`} onClick={() => go(1)} tabIndex={edges.end ? -1 : 0}><IconChevron size={20} /></button>
    </div>
  );
}
