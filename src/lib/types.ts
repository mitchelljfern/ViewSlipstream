export type ShowKind = "streaming" | "in-person" | "giveaway" | "live" | "paid";

export interface Venue {
  name: string;
  address: string;
}

export interface Show {
  slug: string;
  title: string;
  /** The group it is listed under on the home page ("October Screenings"). */
  series: string;
  kind: ShowKind;
  /** ISO 8601 with offset. Streaming: window opens. In person: showtime. Giveaway: entries open. */
  startsAt: string | null;
  /** Streaming: window closes. Giveaway: entries close. In person: null. */
  endsAt: string | null;
  venue: Venue | null;
  about: string[];
  conversationLine: string | null;
  trailerYoutubeId: string | null;
  heroImage: string | null;
  poster: string;
  /** width / height of the poster image */
  posterRatio: number;
  partner: { name: string; logo: string } | null;
  titleArt: string | null;
  atCapacity: boolean;
  conversationId: string | null;
  maxSeats: number;
  giveaway?: { prize: string; winners: number; drawOn: string; rules: string };
  /** Paid shows (Stripe), in US dollars. */
  price?: number;
  /** Live shows (YouTube Live). */
  youtubeLiveId?: string;
}

export interface ArchiveItem {
  slug: string;
  title: string;
  poster: string;
  conversationId: string | null;
}

export interface ArchiveGroup {
  title: string;
  items: ArchiveItem[];
}

export interface Conversation {
  id: string;
  provider: "vimeo" | "dacast";
  embed: string;
  title: string;
  durationSec: number | null;
  thumbnail: string | null;
  /** YYYY-MM-DD */
  date: string;
  showSlug: string | null;
}

/** Where a show is in its life, at a given moment. */
export type Phase = "upcoming" | "live" | "closed";
