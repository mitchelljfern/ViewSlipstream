import type { Phase, Show } from "./types";

const TZ = "America/Los_Angeles";

/** When an in-person screening counts as over. */
const IN_PERSON_LENGTH_MS = 3 * 60 * 60 * 1000;

export function phaseOf(show: Show, now: Date): Phase {
  const start = show.startsAt ? new Date(show.startsAt).getTime() : null;
  const end = show.endsAt ? new Date(show.endsAt).getTime() : null;
  const t = now.getTime();
  switch (show.kind) {
    case "in-person":
      if (start === null) return "closed";
      return t < start ? "upcoming" : t < start + IN_PERSON_LENGTH_MS ? "live" : "closed";
    case "giveaway":
      // Entries are "live" while open.
      if (end !== null && t >= end) return "closed";
      return start !== null && t < start ? "upcoming" : "live";
    default:
      if (start !== null && t < start) return "upcoming";
      if (end !== null && t > end) return "closed";
      return "live";
  }
}

/** The program the site leads with: the next show still taking RSVPs, else the latest. */
export function currentShow(shows: Show[], now: Date): Show {
  const open = shows
    .filter((s) => phaseOf(s, now) !== "closed")
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  if (open.length) return open[0];
  return [...shows].sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""))[0];
}

export function upcomingShows(shows: Show[], now: Date, exclude?: string): Show[] {
  return shows
    .filter((s) => s.slug !== exclude && phaseOf(s, now) !== "closed")
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
}

/** "1st", "2nd", "3rd", "4th", "11th", "21st", "22nd", "23rd", ... */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/** Formats in Pacific time. Day numbers always carry their ending (Nov 5th, not Nov 5). */
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o })
    .formatToParts(new Date(iso))
    .map((part) => (part.type === "day" ? ordinal(Number(part.value)) : part.value))
    .join("");

const timeOf = (iso: string) => {
  const s = fmt(iso, { hour: "numeric", minute: "2-digit" });
  return s.endsWith(":59 PM") && s.startsWith("11:") ? "midnight" : s.replace(":00", "");
};

/** "Sun, Oct 18th · 3 PM" */
export const shortWhen = (iso: string) => `${fmt(iso, { weekday: "short", month: "short", day: "numeric" })} · ${timeOf(iso)}`;
/** "Sunday, October 18th" */
export const longDay = (iso: string) => fmt(iso, { weekday: "long", month: "long", day: "numeric" });
/** "Oct 18th" */
export const monthDay = (iso: string) => fmt(iso, { month: "short", day: "numeric" });
export const clock = timeOf;

/** One line describing when a show happens. */
export function whenLine(show: Show): string {
  if (!show.startsAt) return "";
  if (show.kind === "in-person") return `${longDay(show.startsAt)} · ${clock(show.startsAt)}`;
  if (show.kind === "giveaway" && show.endsAt) return `Entries close ${longDay(show.endsAt)} · ${clock(show.endsAt)}`;
  if (show.endsAt) return `${monthDay(show.startsAt)}, ${clock(show.startsAt)} to ${monthDay(show.endsAt)}, ${clock(show.endsAt)} PT`;
  return `${longDay(show.startsAt)} · ${clock(show.startsAt)}`;
}

export function countdown(toIso: string, now: Date) {
  const ms = Math.max(0, new Date(toIso).getTime() - now.getTime());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return { d, h, m, done: ms === 0 };
}

export const minutes = (sec: number | null) => (sec ? `${Math.round(sec / 60)} min` : "");
