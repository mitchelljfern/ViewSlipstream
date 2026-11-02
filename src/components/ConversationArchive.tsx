"use client";
/**
 * The archive that used to load 140+ players at once. Now: thumbnails only,
 * 12 at a time, and one player loads when someone taps.
 */
import { useMemo, useState } from "react";
import type { Conversation } from "@/lib/types";
import { minutes } from "@/lib/time";
import VideoFacade from "./VideoFacade";
import { IconSearch } from "./Icons";

const PAGE = 12;

export default function ConversationArchive({ items }: { items: Conversation[] }) {
  const [q, setQ] = useState("");
  const [year, setYear] = useState("All");
  const [n, setN] = useState(PAGE);
  const years = useMemo(() => ["All", ...Array.from(new Set(items.map((i) => i.date.slice(0, 4)).filter(Boolean))).sort().reverse()], [items]);
  const list = items.filter((c) => (year === "All" || c.date.startsWith(year)) && (!q || c.title.toLowerCase().includes(q.toLowerCase())));
  const shown = list.slice(0, n);

  return (
    <div className="stack g20">
      <div className="stack g12">
        <div style={{ position: "relative", maxWidth: 560 }}>
          <span style={{ position: "absolute", left: 14, top: 16, color: "var(--muted)" }}><IconSearch size={20} /></span>
          <label htmlFor="q" className="sr-only">Search conversations</label>
          <input id="q" className="input" type="search" placeholder="Search a title or a name" value={q} onChange={(e) => { setQ(e.target.value); setN(PAGE); }} style={{ paddingLeft: 44, background: "var(--surface)" }} />
        </div>
        <div className="scroller" role="group" aria-label="Filter by year" style={{ gap: 8 }}>
          {years.map((y) => <button key={y} className="filter" aria-pressed={year === y} onClick={() => { setYear(y); setN(PAGE); }}>{y}</button>)}
        </div>
      </div>
      {shown.length ? (
        <div className="auto-grid">
          {shown.map((c) => (
            <article key={c.id} className="card" style={{ overflow: "hidden" }}>
              <VideoFacade embed={c.embed} thumbnail={c.thumbnail} label={c.title} duration={minutes(c.durationSec)} rounded={false} />
              <div className="stack g4" style={{ padding: "12px 14px 14px" }}>
                <p style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.35 }}>{c.title}</p>
                <span className="muted small">{c.date ? new Date(c.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}</span>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="muted">Nothing matches that search.</p>}
      {list.length > n ? (
        <div className="stack g8" style={{ alignItems: "center" }}>
          <button className="btn btn-secondary" style={{ minWidth: 240 }} onClick={() => setN((v) => v + PAGE)}>Show {Math.min(PAGE, list.length - n)} more</button>
          <span className="muted small">Showing {shown.length} of {list.length}</span>
        </div>
      ) : null}
    </div>
  );
}
