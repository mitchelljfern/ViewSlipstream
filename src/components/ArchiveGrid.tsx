"use client";
import { useState } from "react";
import type { ArchiveGroup } from "@/lib/types";
import PosterTile from "./PosterTile";

const PAGE = 6;

export default function ArchiveGrid({ groups }: { groups: ArchiveGroup[] }) {
  const [n, setN] = useState(PAGE);
  return (
    <div className="stack g32">
      {groups.slice(0, n).map((g, gi) => (
        <section key={g.title + gi} className="stack g12">
          <span className="eyebrow">{g.title}</span>
          <div className="poster-grid">
            {g.items.map((i) => <PosterTile key={i.slug + gi} href={`/${i.slug}/`} title={i.title} poster={i.poster} />)}
          </div>
        </section>
      ))}
      {groups.length > n ? (
        <div className="stack g8" style={{ alignItems: "center" }}>
          <button className="btn btn-secondary" style={{ minWidth: 240 }} onClick={() => setN((v) => v + PAGE)}>Show more programs</button>
          <span className="muted small">{n} of {groups.length} programs</span>
        </div>
      ) : null}
    </div>
  );
}
