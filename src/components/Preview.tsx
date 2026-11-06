"use client";
/**
 * Review-phase stand-in for accounts, RSVPs and the clock.
 *
 * Nothing here talks to a server: signing in, RSVPing and the "pretend it's
 * showtime" switch live in this browser only, so the client and the team can
 * click through every state of the flow. Phase 2 replaces this provider with
 * Supabase Auth and the rsvps table; components keep calling the same hooks.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Phase, Show } from "@/lib/types";
import { phaseOf } from "@/lib/time";

export const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE !== "false";

/** "waitlisted": in-person show was full, so they're on its waiting list. */
export type RsvpStatus = "confirmed" | "entered" | "paid" | "waitlisted";
export type PhaseOverride = "auto" | Phase;
export interface Guest { first: string; last: string; email: string }

interface Stored {
  /** Signed in with an account (optional: nobody needs one to RSVP). */
  guest: Guest | null;
  /**
   * Who RSVP'd from this browser without an account. Stand-in for the RSVP
   * record tied to their email: on the live site the "It's showtime" email's
   * signed link is what lets them into the player.
   */
  contact: Guest | null;
  rsvps: Record<string, RsvpStatus>;
  /** Seats per RSVP (in-person shows; 1 when not set). */
  seats: Record<string, number>;
  phase: PhaseOverride;
  newsletter: boolean;
  closingReminder: boolean;
  /**
   * How guests get the access code, for the client to choose:
   * on the show page and in the "It's showtime" email, the page only,
   * or the email only (like the current site).
   */
  access: Access;
  /** True once someone picks an option under Review, so a new default can still reach everyone else. */
  accessChosen?: boolean;
}
export type Access = "both" | "page" | "email";
const EMPTY: Stored = { guest: null, contact: null, rsvps: {}, seats: {}, phase: "auto", newsletter: true, closingReminder: true, access: "email" };
const KEY = "slipstream-review-v1";

interface Ctx extends Stored {
  ready: boolean;
  now: Date;
  leadSlug: string | null;
  setLeadSlug: (s: string | null) => void;
  signIn: (g: Guest) => void;
  signOut: () => void;
  rsvp: (slug: string, status: RsvpStatus, seats?: number) => void;
  /** RSVP with just a name and email, no account. */
  rsvpAsGuest: (slug: string, status: RsvpStatus, who: Guest, seats?: number) => void;
  /** Turn the guest RSVP's name and email into an account (they only add a password). */
  createAccount: () => void;
  /** Signed in, or RSVP'd from this browser as a guest. */
  who: Guest | null;
  cancel: (slug: string) => void;
  setPhase: (p: PhaseOverride) => void;
  setPref: (k: "newsletter" | "closingReminder", v: boolean) => void;
  setAccess: (a: Access) => void;
  reset: () => void;
  /** Phase of a show, with the review override applied to the lead show. */
  phase: PhaseOverride;
  phaseFor: (show: Show) => Phase;
  toast: string | null;
  say: (msg: string) => void;
}

const C = createContext<Ctx | null>(null);

export function PreviewProvider({ buildNow, leadSlug: initialLead, children }: { buildNow: string; leadSlug: string | null; children: React.ReactNode }) {
  const [s, setS] = useState<Stored>(EMPTY);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date(buildNow));
  const [leadSlug, setLeadSlug] = useState<string | null>(initialLead);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Email only is the default; keep an older saved value only if someone picked it.
        setS({ ...EMPTY, ...saved, access: saved.accessChosen ? saved.access ?? EMPTY.access : EMPTY.access });
      }
    } catch { /* storage blocked: start fresh */ }
    setReady(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const save = useCallback((fn: (p: Stored) => Stored) => {
    setS((prev) => {
      const next = fn(prev);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 4200);
  }, []);

  const value = useMemo<Ctx>(() => ({
    ...s, ready, now, leadSlug, setLeadSlug, toast, say,
    who: s.guest ?? s.contact,
    signIn: (guest) => save((p) => ({ ...p, guest, contact: null })),
    signOut: () => save((p) => ({ ...p, guest: null, contact: null })),
    rsvp: (slug, status, seats = 1) => save((p) => ({ ...p, rsvps: { ...p.rsvps, [slug]: status }, seats: { ...p.seats, [slug]: seats } })),
    rsvpAsGuest: (slug, status, who, seats = 1) => save((p) => ({ ...p, contact: p.guest ? p.contact : who, rsvps: { ...p.rsvps, [slug]: status }, seats: { ...p.seats, [slug]: seats } })),
    createAccount: () => save((p) => (p.contact ? { ...p, guest: p.contact, contact: null } : p)),
    cancel: (slug) => save((p) => {
      const r = { ...p.rsvps }; delete r[slug];
      const st = { ...p.seats }; delete st[slug];
      return { ...p, rsvps: r, seats: st };
    }),
    setPhase: (phase) => save((p) => ({ ...p, phase })),
    setPref: (k, v) => save((p) => ({ ...p, [k]: v })),
    setAccess: (access) => save((p) => ({ ...p, access, accessChosen: true })),
    reset: () => save(() => EMPTY),
    phaseFor: (show) => (REVIEW_MODE && s.phase !== "auto" && show.slug === leadSlug ? s.phase : phaseOf(show, now)),
  }), [s, ready, now, leadSlug, toast, save, say]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function usePreview(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("usePreview outside PreviewProvider");
  return c;
}

export const initials = (g: Guest | null) => (g ? `${g.first[0] ?? ""}${g.last[0] ?? ""}`.toUpperCase() : "");
