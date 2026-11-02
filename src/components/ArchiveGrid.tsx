"use client";
/** Previous Titles: every program as a heading and a swipeable row, 8 programs at a time. */
import { useState } from "react";
import type { ArchiveGroup } from "@/lib/types";
import CategoryBrowser, { slugId, splitGroupTitle, type Category } from "./CategoryBrowser";

const PAGE = 8;

export default function ArchiveGrid({ groups }: { groups: ArchiveGroup[] }) {
  const [n, setN] = useState(PAGE);
  const cats: Category[] = groups.slice(0, n).map((g, gi) => {
    const { kicker, title } = splitGroupTitle(g.title);
    return {
      id: slugId(g.title) + "-" + gi, kicker, title,
      meta: `${g.items.length} ${g.items.length === 1 ? "title" : "titles"}`,
      items: g.items.map((i) => ({ href: `/${i.slug}/`, title: i.title, image: i.poster, ratio: i.ratio, badge: null })),
    };
  });
  return (
    <div className="stack g24">
      <CategoryBrowser categories={cats} />
      {groups.length > n ? (
        <div className="stack g8" style={{ alignItems: "center" }}>
          <button className="btn btn-white cta-center" onClick={() => setN((v) => v + PAGE)}>Show More Programs</button>
          <span className="muted small">{n} of {groups.length} programs</span>
        </div>
      ) : null}
    </div>
  );
}
