import type { Show } from "./types";

/**
 * "Add to calendar" for a show, in every form a phone or laptop understands:
 * a Google Calendar link, an Outlook link, and a real .ics file (Apple Calendar
 * on iPhone and Mac, and every other calendar app).
 *
 * `which` is "start" (the showtime, or when streaming opens) or "end" (a
 * reminder for when a streaming window or giveaway closes).
 */
export type CalWhich = "start" | "end";

export interface CalEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  location: string;
  details: string;
  url: string;
}

export function calEvent(show: Show, which: CalWhich = "start"): CalEvent | null {
  const iso = which === "end" ? show.endsAt : show.startsAt;
  if (!iso) return null;
  const start = new Date(iso);
  const end = new Date(start.getTime() + (show.kind === "in-person" && which === "start" ? 3 : 1) * 3600_000);
  const url = `https://viewslipstream.com/${show.slug}/`;
  const title = which === "end" ? `${show.title} closes on Slipstream` : `${show.title} on Slipstream`;
  const location = show.venue ? `${show.venue.name}, ${show.venue.address}` : url;
  const details = which === "end" ? `Last chance to watch ${show.title}. ${url}` : `${show.title} on Slipstream. ${url}`;
  return { uid: `${show.slug}-${which}@viewslipstream.com`, title, start, end, location, details, url };
}

/** 20261103T190000Z */
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Text values in .ics need commas, semicolons, backslashes and newlines escaped. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function icsText(show: Show, which: CalWhich = "start", now = new Date()): string | null {
  const e = calEvent(show, which);
  if (!e) return null;
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Slipstream//Shows//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${e.uid}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.location)}`, `DESCRIPTION:${esc(e.details)}`, `URL:${e.url}`,
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

/** The .ics file built into the site for each show (see src/app/[slug]/calendar.ics). */
export const icsFile = (show: Show, which: CalWhich = "start") => `/${show.slug}/${which === "end" ? "closes" : "calendar"}.ics`;

/** Opens Google Calendar (the app on Android) with the event filled in. */
export function googleCalUrl(show: Show, which: CalWhich = "start"): string | null {
  const e = calEvent(show, which);
  if (!e) return null;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(e.start)}/${stamp(e.end)}`, details: e.details, location: e.location });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** Opens Outlook on the web with the event filled in. */
export function outlookCalUrl(show: Show, which: CalWhich = "start"): string | null {
  const e = calEvent(show, which);
  if (!e) return null;
  const q = new URLSearchParams({ path: "/calendar/action/compose", rru: "addevent", subject: e.title, startdt: e.start.toISOString(), enddt: e.end.toISOString(), body: e.details, location: e.location });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`;
}
