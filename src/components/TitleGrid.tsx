"use client";
/**
 * A month or series on the home page, laid out the way Slipstream does it on
 * the old site: every row runs the full width of the screen, no empty space.
 *
 *   1 title    one big horizontal card
 *   2 titles   two horizontal cards side by side
 *   3 to 5     one row, posters split evenly across it
 *   6 or more  rows of up to 5 posters; a leftover 1 or 2 titles become a row
 *              of horizontal cards, same rule as above (6 = 4 + 2, 7 = 5 + 2,
 *              8 = 5 + 3, 11 = 5 + 4 + 2)
 *
 * On desktop a month or series with a single title is a card instead: the
 * art on the left, the screening details on the right. Phones keep the big
 * horizontal card.
 *
 * Horizontal cards use landscape art (the show's key art when its poster is
 * vertical). On tablets and phones a poster row becomes one swipeable row, and
 * horizontal cards stack on phones.
 */
import Link from "next/link";
import type { RailItem } from "./Rail";

export const MAX_PER_ROW = 5;

export type GridRow<T> = { items: T[]; wide: boolean };

/** Rows of at most MAX_PER_ROW posters; a row of 1 or 2 is horizontal cards. */
export function gridRows<T>(items: T[]): GridRow<T>[] {
  const n = items.length;
  if (n <= MAX_PER_ROW) return [{ items, wide: n <= 2 }];
  const sizes: number[] = [];
  let left = n;
  while (left > 0) {
    if (left <= MAX_PER_ROW) { sizes.push(left); break; }
    // Leave 2 (not 1) for the last row: one horizontal card alone is too big.
    if (left === MAX_PER_ROW + 1) { sizes.push(MAX_PER_ROW - 1, 2); break; }
    sizes.push(MAX_PER_ROW); left -= MAX_PER_ROW;
  }
  const out: GridRow<T>[] = [];
  let i = 0;
  for (const size of sizes) { out.push({ items: items.slice(i, i + size), wide: size <= 2 }); i += size; }
  return out;
}

export default function TitleGrid({ items, label }: { items: RailItem[]; label: string }) {
  if (!items.length) return null;
  const rows = gridRows(items);
  // A month or series of 1 or 2 is all horizontal cards; anything bigger is a
  // poster group (on tablets and phones it becomes one swipeable row of posters).
  const allWide = rows.length === 1 && rows[0].wide;
  const solo = items.length === 1;
  // Poster rows keep the posters' own shape (2:3 for series art, 4:5 for the
  // in-person one-sheets) so nothing gets cropped hard.
  const ratios = items.map((i) => i.ratio ?? 0.667).sort((a, b) => a - b);
  const tall = Math.min(0.9, Math.max(0.667, ratios[Math.floor(ratios.length / 2)]));
  const wideAr = items.length === 1 ? 2.4 : 16 / 9;

  return (
    <div className={`tgrid ${allWide ? "is-wide" : "is-tall"}${solo ? " is-solo" : ""}`} role="list" aria-label={label}
      style={{ "--ar-tall": tall, "--ar-wide": wideAr } as React.CSSProperties}>
      {rows.map((row, r) => (
        <div key={r} className={`tgrid-row${row.wide ? " row-wide" : ""}`} style={{ "--cols": row.items.length } as React.CSSProperties}>
          {row.items.map((it) => (
            <Link key={it.href + it.title} href={it.href} className="tcard" role="listitem">
              <div className="tcard-art">
                {row.wide ? (
                  <picture>
                    {/* Inside a poster group, phones and tablets swipe posters, so use the poster there. */}
                    {!allWide ? <source media="(max-width: 959px)" srcSet={it.image} /> : null}
                    <img src={it.wideImage ?? it.image} alt="" loading="lazy" decoding="async" />
                  </picture>
                ) : <img src={it.image} alt="" loading="lazy" decoding="async" />}
                {it.badge ? (
                  <span className={`chip ${it.badge.tone === "live" ? "chip-white" : it.badge.tone === "open" ? "chip-blue" : "chip-outline"} rail-badge`}>
                    {it.badge.tone === "live" ? <span className="live-dot" /> : null}{it.badge.label}
                  </span>
                ) : null}
              </div>
              <span className="rail-title tcard-title">{it.title}</span>
              {it.meta ? <span className="rail-meta">{it.meta}</span> : null}
              {solo && it.detail ? (
                <div className="tcard-info">
                  <span className="eyebrow">{it.detail.kind}</span>
                  <h3 className="h2">{it.title}</h3>
                  {it.detail.when || it.detail.where ? (
                    <p className="tcard-when">{it.detail.when}{it.detail.when && it.detail.where ? <br /> : null}{it.detail.where}</p>
                  ) : null}
                  {it.detail.about ? <p className="tcard-about muted">{it.detail.about}</p> : null}
                  <span className="btn btn-primary tcard-cta">{it.detail.cta}</span>
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
