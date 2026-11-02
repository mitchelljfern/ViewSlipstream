"use client";
/**
 * Shows a thumbnail and a play button; the real player (YouTube, Vimeo or
 * DaCast) loads only when someone taps. This is what keeps pages with many
 * videos fast: nothing from a video host loads until it is wanted.
 */
import { useState } from "react";
import { IconPlay } from "./Icons";

type Props = {
  embed: string;
  thumbnail: string | null;
  label: string;
  caption?: string;
  duration?: string;
  rounded?: boolean;
};

export const youtubeEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export default function VideoFacade({ embed, thumbnail, label, caption, duration, rounded = true }: Props) {
  const [on, setOn] = useState(false);
  const src = embed + (embed.includes("?") ? "&" : "?") + "autoplay=1";
  if (on) {
    return (
      <div className="facade" style={{ cursor: "default", borderRadius: rounded ? undefined : 0 }}>
        <iframe src={src} title={label} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen />
      </div>
    );
  }
  return (
    <button type="button" className="facade" aria-label={`Play: ${label}`} onClick={() => setOn(true)} style={{ borderRadius: rounded ? undefined : 0 }}>
      {thumbnail ? <img src={thumbnail} alt="" loading="lazy" decoding="async" /> : null}
      <span className="play"><IconPlay size={26} /></span>
      {caption ? <span className="facade-label">{caption}</span> : null}
      {duration ? <span className="dur">{duration}</span> : null}
    </button>
  );
}
