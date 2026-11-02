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

export type RsvpStatus = "confirmed" | "entered" | "paid";
export type PhaseOverride = "auto" | Phase;
export interface Guest { first: string; last: string; email: string }
/** Home hero design being trialled: "a" tabbed card, "b" swipe carousel, "original" the old layout. */
export type HeroDesign = "a" | "b" | "original";

interface Stored {
  guest: Guest | null;
  rsvps: Record<string, RsvpStatus>;
  phase: PhaseOverride;
  newsletter: boolean;
  closingReminder: boolean;
  hero: HeroDesign;
  /** Review only: how many shows to feature on the home hero (0 = real data). */
  heroDemo: 0 | 2 | 3;
}
const EMPTY: Stored = { guest: null, rsvps: {}, phase: "auto", newsletter: true, closingReminder: true, hero: "a", heroDemo: 0 };
const KEY = "slipstream-review-v1";

interface Ctx extends Stored {
  ready: boolean;
  now: Date;
  leadSlug: string | null;
  setLeadSlug: (s: string | null) => void;
  signIn: (g: Guest) => void;
  signOut: () => void;
  rsvp: (slug: string, status: RsvpStatus) => void;
  cancel: (slug: string) => void;
  setPhase: (p: PhaseOverride) => void;
  setPref: (k: "newsletter" | "closingReminder", v: boolean) => void;
  setHero: (h: HeroDesign) => void;
  setHeroDemo: (n: 0 | 2 | 3) => void;
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
      const stored: Stored = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
      // ?hero=a|b|original picks a home design, so a link can show one option.
      const h = new URLSearchParams(window.location.search).get("hero");
      setS(h === "a" || h === "b" || h === "original" ? { ...stored, hero: h } : stored);
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
    signIn: (guest) => save((p) => ({ ...p, guest })),
    signOut: () => save((p) => ({ ...p, guest: null })),
    rsvp: (slug, status) => save((p) => ({ ...p, rsvps: { ...p.rsvps, [slug]: status } })),
    cancel: (slug) => save((p) => { const r = { ...p.rsvps }; delete r[slug]; return { ...p, rsvps: r }; }),
    setPhase: (phase) => save((p) => ({ ...p, phase })),
    setPref: (k, v) => save((p) => ({ ...p, [k]: v })),
    setHero: (hero) => save((p) => ({ ...p, hero })),
    setHeroDemo: (heroDemo) => save((p) => ({ ...p, heroDemo })),
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
