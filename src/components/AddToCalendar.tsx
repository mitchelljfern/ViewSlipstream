"use client";
/**
 * "Add to calendar" with a choice of calendar: Google, Apple, Outlook, or a
 * file for anything else. Tapping the button opens the list in place (no
 * popover), so it never pushes past the screen edge on a phone.
 *
 * The list is rendered as a sibling with `order: 1` and full width, so inside
 * a grid or a wrapping row it drops onto its own line below the other buttons.
 */
import { useId, useState, type CSSProperties } from "react";
import type { Show } from "@/lib/types";
import { googleCalUrl, icsFile, outlookCalUrl, type CalWhich } from "@/lib/ics";

type Props = {
  show: Show;
  which?: CalWhich;
  label?: string;
  /** "button" for the RSVP panel, "link" for small inline text. */
  variant?: "button" | "link";
  className?: string;
  style?: CSSProperties;
  /** Look of the option list: on the deep blue panel or on the page. */
  tone?: "deep" | "page";
};

export default function AddToCalendar({ show, which = "start", label = "Add to calendar", variant = "button", className, style, tone = "page" }: Props) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const google = googleCalUrl(show, which);
  const outlook = outlookCalUrl(show, which);
  if (!google || !outlook) return null;
  const file = icsFile(show, which);
  const fileName = `${show.slug}${which === "end" ? "-closes" : ""}.ics`;

  return (
    <>
      <button
        type="button"
        className={variant === "link" ? `cal-link ${className ?? ""}` : className}
        style={style}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open ? (
        <div id={id} className={`cal-menu cal-menu-${tone}`} role="group" aria-label="Choose your calendar">
          <a href={google} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Google Calendar</a>
          {/* No download attribute: iPhone and Mac Safari open the Add to Calendar sheet. */}
          <a href={file} onClick={() => setOpen(false)}>Apple Calendar</a>
          <a href={outlook} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Outlook</a>
          <a href={file} download={fileName} onClick={() => setOpen(false)}>Other (download .ics file)</a>
        </div>
      ) : null}
    </>
  );
}
