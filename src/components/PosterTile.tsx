import Link from "next/link";

/**
 * A poster in the grid. Landscape key art (some shows only have a 16:9 image)
 * is shown whole on a blurred copy of itself, so every tile keeps the same
 * 2:3 shape without cropping a title out of the art.
 */
export function PosterWell({ src, ratio }: { src: string; ratio?: number }) {
  const wide = (ratio ?? 0.667) > 0.9;
  return (
    <div className="well ratio-poster">
      {wide ? (
        <>
          <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" style={{ position: "absolute", inset: 0, filter: "blur(18px) brightness(0.55)", transform: "scale(1.2)" }} />
          <img src={src} alt="" loading="lazy" decoding="async" style={{ position: "relative", objectFit: "contain" }} />
        </>
      ) : (
        <img src={src} alt="" loading="lazy" decoding="async" />
      )}
    </div>
  );
}

export default function PosterTile({ href, title, poster, ratio, meta, chip, width }: {
  href: string; title: string; poster: string; ratio?: number; meta?: string; chip?: React.ReactNode; width?: number;
}) {
  return (
    <Link href={href} className="tile" style={width ? { width } : undefined}>
      <PosterWell src={poster} ratio={ratio} />
      {chip}
      <span className="tile-title">{title}</span>
      {meta ? <span className="muted" style={{ fontSize: 13 }}>{meta}</span> : null}
    </Link>
  );
}
