"use client";
/**
 * Titles grouped by month or series. Each group gets a real heading (the
 * month or series name, big), what kind of group it is, how many titles and
 * the dates it covers, then a full-width grid (TitleGrid). On the home page a sticky jump
 * bar follows you down and lights up the group you're in.
 */
import { useEffect, useRef, useState } from "react";
import type { RailItem } from "./Rail";
import TitleGrid from "./TitleGrid";

export interface Category {
  id: string;
  kicker: string;
  title: string;
  meta: string;
  items: RailItem[];
  /** A tabbed section (Screenings): one tab per month, one row at a time. */
  tabs?: { key: string; label: string; meta: string; items: RailItem[] }[];
}

/** "October Screenings" -> {kicker: "Screenings", title: "October"}; "Emmy-Nominated Screening Series" -> {kicker: "Series", title: "Emmy-Nominated Screening"} */
export function splitGroupTitle(t: string): { kicker: string; title: string } {
  const month = t.match(/^((?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\/\w+)?) (Screenings?|Screening Series)$/i);
  if (month) return { kicker: "Screenings", title: month[1] };
  const series = t.match(/^(.+?) (?:Screening )?Series$/i);
  if (series) return { kicker: "Series", title: series[1] };
  return { kicker: "Program", title: t };
}

export const slugId = (t: string) => "cat-" + t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CategoryBrowser({ categories, jumpBar = false }: { categories: Category[]; jumpBar?: boolean }) {
  const [active, setActive] = useState(categories[0]?.id);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jumpBar) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: "-40% 0px -55% 0px" });
    categories.forEach((c) => { const el = document.getElementById(c.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [categories, jumpBar]);

  // Keep the lit chip in view inside the bar.
  useEffect(() => {
    const chip = barRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (chip && barRef.current) barRef.current.scrollTo({ left: chip.offsetLeft - 20, behavior: "smooth" });
  }, [active]);

  return (
    <div className="stack g8">
      {jumpBar ? (
        <nav className="jumpbar" aria-label="Jump to a month or series">
          <div className="jumpbar-inner" ref={barRef}>
            {categories.map((c) => (
              <a key={c.id} href={`#${c.id}`} data-id={c.id} className="filter" aria-current={active === c.id ? "true" : undefined}>{c.title}</a>
            ))}
          </div>
        </nav>
      ) : null}
      {categories.map((c) => c.tabs?.length ? <TabbedCategory key={c.id} c={c} /> : (
        <section key={c.id} id={c.id} className="cat" aria-labelledby={`${c.id}-h`}>
          <header className="cat-head">
            <div className="row g10 wrap-row"><span className="eyebrow cat-kicker">{c.kicker}</span><span className="cat-meta">{c.meta}</span></div>
            <h3 id={`${c.id}-h`} className="cat-title">{c.title}</h3>
          </header>
          <TitleGrid items={c.items} label={c.title} />
        </section>
      ))}
    </div>
  );
}

/** Screenings: one heading, a tab per month (newest first), the month's row underneath. */
function TabbedCategory({ c }: { c: Category }) {
  const tabs = c.tabs!;
  const [on, setOn] = useState(tabs[0].key);
  const cur = tabs.find((t) => t.key === on) ?? tabs[0];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    setOn(tabs[n].key);
    refs.current[n]?.focus();
  };
  return (
    <section id={c.id} className="cat" aria-labelledby={`${c.id}-h`}>
      <header className="cat-head">
        <div className="row g10 wrap-row"><span className="eyebrow cat-kicker">{c.kicker}</span><span className="cat-meta">{c.meta}</span></div>
        <h3 id={`${c.id}-h`} className="cat-title">{c.title}</h3>
      </header>
      <div className="month-tabs" role="tablist" aria-label={`${c.title} by month`}>
        {tabs.map((t, i) => (
          <button key={t.key} ref={(el) => { refs.current[i] = el; }} role="tab" id={`${c.id}-tab-${t.key}`} aria-selected={t.key === cur.key}
            aria-controls={`${c.id}-panel`} tabIndex={t.key === cur.key ? 0 : -1} className="month-tab"
            onClick={() => setOn(t.key)}
            onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); move(i + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); move(i - 1); } }}>
            {t.label}
          </button>
        ))}
      </div>
      <div id={`${c.id}-panel`} role="tabpanel" aria-labelledby={`${c.id}-tab-${cur.key}`} className="stack g10">
        <span className="cat-meta">{cur.meta}</span>
        <TitleGrid key={cur.key} items={cur.items} label={`${cur.label} screenings`} />
      </div>
    </section>
  );
}
