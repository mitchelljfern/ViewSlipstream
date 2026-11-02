"use client";
/**
 * Previous Titles: one searchable poster grid instead of 60+ program rows.
 * Search by title, program, or a name (cast, director, conversation guest); filter by type
 * and year; newest first (with year headings) or A to Z. Filters live in the
 * URL so a filtered view can be shared and survives the back button.
 */
import { useEffect, useMemo, useState } from "react";
import type { PastTitle } from "@/lib/data";
import PosterTile from "./PosterTile";
import { IconClose, IconSearch } from "./Icons";

const PAGE = 36;
const TYPES = [
  ["all", "All"], ["streaming", "Streaming"], ["in-person", "In person"], ["shorts", "Short films"], ["conversation", "With a conversation"],
] as const;
type TypeKey = (typeof TYPES)[number][0];
type Sort = "new" | "az";

const KIND: Record<string, string> = { streaming: "Streaming", "in-person": "In person", giveaway: "Giveaway", live: "Live stream", paid: "Paid" };
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function PastTitlesBrowser({ titles }: { titles: PastTitle[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeKey>("all");
  const [year, setYear] = useState<number | "all">("all");
  const [sort, setSort] = useState<Sort>("new");
  const [n, setN] = useState(PAGE);

  // Read filters from the URL once, then keep the URL in step.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    const t = p.get("type"); if (TYPES.some(([k]) => k === t)) setType(t as TypeKey);
    const y = Number(p.get("year")); if (y) setYear(y);
    if (p.get("sort") === "az") setSort("az");
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (type !== "all") p.set("type", type);
    if (year !== "all") p.set("year", String(year));
    if (sort !== "new") p.set("sort", sort);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, type, year, sort]);

  const rows = useMemo(() => titles.map((t) => ({ ...t, folded: fold(t.text) })), [titles]);
  const years = useMemo(() => Array.from(new Set(titles.map((t) => t.year).filter((y): y is number => !!y))).sort((a, b) => b - a), [titles]);

  const list = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    const out = rows.filter((t) =>
      (year === "all" || t.year === year) &&
      (type === "all" || (type === "shorts" ? t.shorts : type === "conversation" ? t.conversation : t.kind === type)) &&
      words.every((w) => t.folded.includes(w)));
    // Dedupe titles listed under more than one program.
    const seen = new Set<string>();
    const unique = out.filter((t) => (seen.has(t.slug) ? false : (seen.add(t.slug), true)));
    return sort === "az"
      ? unique.sort((a, b) => a.title.replace(/^(the|a|an) /i, "").localeCompare(b.title.replace(/^(the|a|an) /i, "")))
      : unique.sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (b.date ?? "").localeCompare(a.date ?? ""));
  }, [rows, q, type, year, sort]);

  const shown = list.slice(0, n);
  const filtered = !!q || type !== "all" || year !== "all";
  const reset = () => { setQ(""); setType("all"); setYear("all"); setN(PAGE); };
  const meta = (t: PastTitle) => [
    t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/Los_Angeles" }) : t.year,
    t.kind ? KIND[t.kind] : null,
  ].filter(Boolean).join(" · ");

  // Newest first: a year heading before each year's titles.
  const blocks: { year: number | null; items: typeof shown }[] = [];
  for (const t of shown) {
    const key = sort === "new" ? t.year : null;
    if (!blocks.length || blocks[blocks.length - 1].year !== key) blocks.push({ year: key, items: [] });
    blocks[blocks.length - 1].items.push(t);
  }

  return (
    <div className="stack g20">
      <div className="finder">
        <div className="finder-row">
          <div className="finder-search">
            <span className="finder-search-icon"><IconSearch size={20} /></span>
            <label htmlFor="pt-q" className="sr-only">Search previous titles</label>
            <input id="pt-q" className="input" type="search" placeholder="Search a title, program or name" value={q}
              onChange={(e) => { setQ(e.target.value); setN(PAGE); }} autoComplete="off" />
            {q ? <button className="icon-btn finder-clear" aria-label="Clear search" onClick={() => { setQ(""); setN(PAGE); }}><IconClose size={18} /></button> : null}
          </div>
        </div>
        <div className="finder-chips" role="group" aria-label="Filter by type">
          {TYPES.map(([k, l]) => <button key={k} className="filter" aria-pressed={type === k} onClick={() => { setType(k); setN(PAGE); }}>{l}</button>)}
        </div>
        <div className="finder-chips" role="group" aria-label="Filter by year">
          <button className="filter" aria-pressed={year === "all"} onClick={() => { setYear("all"); setN(PAGE); }}>All years</button>
          {years.map((y) => <button key={y} className="filter" aria-pressed={year === y} onClick={() => { setYear(y); setN(PAGE); }}>{y}</button>)}
        </div>
      </div>

      <div className="row between g12">
        <span className="muted small" aria-live="polite">{list.length} {list.length === 1 ? "title" : "titles"}{filtered ? " match" : ""}</span>
        <div className="row g8">
          {filtered ? <button className="btn btn-glass btn-sm" onClick={reset}>Clear</button> : null}
          <label className="sr-only" htmlFor="pt-sort">Sort</label>
          <select id="pt-sort" className="select finder-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="new">Newest first</option>
            <option value="az">A to Z</option>
          </select>
        </div>
      </div>

      {shown.length ? (
        blocks.map((b, i) => (
          <section key={`${b.year}-${i}`} className="stack g14">
            {b.year ? <h2 className="h2">{b.year}</h2> : null}
            <div className="poster-grid">
              {b.items.map((t) => <PosterTile key={t.slug} href={`/${t.slug}/`} title={t.title} poster={t.poster} ratio={t.ratio} meta={meta(t)} />)}
            </div>
          </section>
        ))
      ) : (
        <div className="stack g12" style={{ alignItems: "flex-start" }}>
          <p className="muted">Nothing matches that. Try another spelling, or clear the filters.</p>
          <button className="btn btn-secondary btn-sm" onClick={reset}>Clear filters</button>
        </div>
      )}

      {list.length > n ? (
        <div className="stack g8" style={{ alignItems: "center" }}>
          <button className="btn btn-white cta-center" onClick={() => setN((v) => v + PAGE)}>Show {Math.min(PAGE, list.length - n)} More</button>
          <span className="muted small">Showing {shown.length} of {list.length}</span>
        </div>
      ) : null}
    </div>
  );
}
