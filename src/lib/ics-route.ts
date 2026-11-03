import { getShow, showPageSlugs } from "./data";
import { icsText, type CalWhich } from "./ics";

/** Shows that have a date for this kind of calendar file. */
export const calendarFileSlugs = (which: CalWhich): string[] =>
  showPageSlugs().filter((slug) => {
    const show = getShow(slug);
    return !!show && !!(which === "end" ? show.endsAt : show.startsAt);
  });

/** A real .ics file, so iPhones open "Add to Calendar" instead of saving a download. */
export function calendarFileResponse(slug: string, which: CalWhich): Response {
  const show = getShow(slug);
  const body = show ? icsText(show, which) : null;
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
