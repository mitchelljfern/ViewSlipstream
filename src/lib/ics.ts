import type { Show } from "./types";

/** A one-tap "add to calendar" file, built in the browser. */
export function icsHref(show: Show, which: "start" | "end" = "start"): string | null {
  const iso = which === "end" ? show.endsAt : show.startsAt;
  if (!iso) return null;
  const start = new Date(iso);
  const end = new Date(start.getTime() + (show.kind === "in-person" ? 3 : 1) * 3600_000);
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const url = `https://viewslipstream.com/${show.slug}/`;
  const title = which === "end" ? `${show.title} closes on Slipstream` : `${show.title} on Slipstream`;
  const where = show.venue ? `${show.venue.name}, ${show.venue.address}` : url;
  const body = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Slipstream//Shows//EN", "BEGIN:VEVENT",
    `UID:${show.slug}-${which}@viewslipstream.com`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`,
    `SUMMARY:${title}`, `LOCATION:${where}`, `URL:${url}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}
