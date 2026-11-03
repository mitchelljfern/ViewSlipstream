"use client";
/** Days, hours and minutes until a moment, with a short label above. */
import { usePreview } from "./Preview";
import { countdown } from "@/lib/time";

export default function Countdown({ to, label }: { to: string; label: string }) {
  const { now } = usePreview();
  const left = countdown(to, now);
  if (left.done) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="stack g8 countdown" role="timer" aria-label={`${label} ${left.d} days, ${left.h} hours, ${left.m} minutes`}>
      <span className="eyebrow">{label}</span>
      <div className="ticks" aria-hidden="true">
        <div className="tick"><b>{pad(left.d)}</b><small>days</small></div>
        <div className="tick"><b>{pad(left.h)}</b><small>hours</small></div>
        <div className="tick"><b>{pad(left.m)}</b><small>min</small></div>
      </div>
    </div>
  );
}

/** What the clock is counting toward, in the show's own words. */
export function startLabel(kind: string) {
  return kind === "giveaway" ? "Entries open in" : kind === "in-person" ? "Doors open in" : kind === "live" ? "Goes live in" : "Starts streaming in";
}
export function endLabel(kind: string) {
  return kind === "giveaway" ? "Entries close in" : "Available for";
}
