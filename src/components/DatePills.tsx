/**
 * Start and end dates as two small boxes ("Starts Thu, Nov 5th · 7 PM" then
 * "Ends Wed, Nov 11th · Midnight"), same corner radius as the buttons.
 * In-person shows have one date, so they get one box.
 */
import type { Show } from "@/lib/types";
import { shortWhen } from "@/lib/time";
import { IconCalendar } from "./Icons";

const when = (iso: string) => shortWhen(iso).replace("midnight", "Midnight");

export default function DatePills({ show, size = "md" }: { show: Pick<Show, "kind" | "startsAt" | "endsAt">; size?: "md" | "sm" }) {
  if (!show.startsAt) return null;
  const giveaway = show.kind === "giveaway";
  const end = show.kind === "in-person" ? null : show.endsAt;
  const first = show.kind === "in-person" ? "Showtime" : giveaway ? "Entries open" : "Starts";
  return (
    <div className={`date-pills${size === "sm" ? " is-sm" : ""}`}>
      <div className="date-pill">
        <span className="date-pill-label"><IconCalendar size={13} />{first}</span>
        <b>{when(show.startsAt)}{end ? null : " PT"}</b>
      </div>
      {end ? (
        <>
          <span className="date-pills-arrow" aria-hidden="true">→</span>
          <div className="date-pill">
            <span className="date-pill-label">{giveaway ? "Entries close" : "Ends"}</span>
            <b>{when(end)} PT</b>
          </div>
        </>
      ) : null}
    </div>
  );
}
