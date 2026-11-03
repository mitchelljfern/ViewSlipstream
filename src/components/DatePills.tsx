/**
 * Start and end dates as two small boxes ("Starts Thu, Nov 5th · 7 PM" then
 * "Ends Wed, Nov 11th · Midnight PT"), same corner radius as the buttons.
 * In-person shows have one date, so they get one box.
 *
 * Each date always stays on one line: when the boxes are narrow (phones),
 * a shorter form drops the weekday ("Nov 11 · Midnight PT").
 */
import type { Show } from "@/lib/types";
import { clock, monthDay, shortWhen } from "@/lib/time";

const cap = (s: string) => s.replace("midnight", "Midnight");
const long = (iso: string) => cap(shortWhen(iso));
const short = (iso: string) => cap(`${monthDay(iso).replace(/(st|nd|rd|th)$/, "")} · ${clock(iso)}`);

function When({ iso, tz }: { iso: string; tz: boolean }) {
  return (
    <b>
      <span className="dp-long">{long(iso)}</span>
      <span className="dp-short">{short(iso)}</span>
      {tz ? <span className="dp-tz"> PT</span> : null}
    </b>
  );
}

export default function DatePills({ show, size = "md" }: { show: Pick<Show, "kind" | "startsAt" | "endsAt">; size?: "md" | "sm" }) {
  if (!show.startsAt) return null;
  const giveaway = show.kind === "giveaway";
  const end = show.kind === "in-person" ? null : show.endsAt;
  const first = show.kind === "in-person" ? "Showtime" : giveaway ? "Entries open" : "Starts";
  return (
    <div className={`date-pills${size === "sm" ? " is-sm" : ""}`}>
      <div className="date-pills-row">
        <div className="date-pill">
          <span className="date-pill-label">{first}</span>
          <When iso={show.startsAt} tz={!end} />
        </div>
        {end ? (
          <>
            <span className="date-pills-arrow" aria-hidden="true">→</span>
            <div className="date-pill">
              <span className="date-pill-label">{giveaway ? "Entries close" : "Ends"}</span>
              <When iso={end} tz />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
