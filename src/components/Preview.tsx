"use client";
/**
 * Accounts, RSVPs and the clock for every page.
 *
 * Live (Supabase configured): real accounts (Supabase Auth), real RSVPs through the
 * rsvp() database function (seats, waiting list), the access code through screening(),
 * and current shows loaded from the database so Client Hub edits show up without a rebuild.
 *
 * Review build (no Supabase settings): the same interface, kept in this browser only,
 * so every state can be clicked through. Components call usePreview() either way.
 */
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Phase, Show } from "@/lib/types";
import { phaseOf } from "@/lib/time";
import { LIVE, siteOrigin, supabase } from "@/lib/supabase";
import { fetchLive } from "@/lib/live";
import { applyLive, getShow } from "@/lib/data";

export const REVIEW_MODE = process.env.NEXT_PUBLIC_REVIEW_MODE !== "false";
export { LIVE };

/** "waitlisted": in-person show was full, so they're on its waiting list. */
export type RsvpStatus = "confirmed" | "entered" | "paid" | "waitlisted";
export type PhaseOverride = "auto" | Phase;
export interface Guest { first: string; last: string; email: string }
export type Access = "both" | "page" | "email";
export type Screening =
  | { ok: true; filmEmbed: string | null; conversationEmbed: string | null; accessCode: string | null; accessMode: Access }
  | { ok: false; reason: string };
/** null when it worked, otherwise a message to show. */
type Result = Promise<string | null>;

interface Stored {
  /** Signed in with an account (needed to watch, not to RSVP). */
  guest: Guest | null;
  /** Who RSVP'd from this browser without an account. */
  contact: Guest | null;
  rsvps: Record<string, RsvpStatus>;
  /** Seats per RSVP (in-person shows; 1 when not set). */
  seats: Record<string, number>;
  phase: PhaseOverride;
  newsletter: boolean;
  closingReminder: boolean;
  /** Where guests get the access code (client's choice; the Review switch overrides it on staging). */
  access: Access;
  /** True once someone picks an option under Review. */
  accessChosen?: boolean;
}
const EMPTY: Stored = { guest: null, contact: null, rsvps: {}, seats: {}, phase: "auto", newsletter: true, closingReminder: true, access: "email" };
const KEY = "slipstream-review-v1";
const GUEST_KEY = "slipstream-guest-v1";

interface Ctx extends Stored {
  ready: boolean;
  /** Bumps when live show data arrives. */
  dataVersion: number;
  now: Date;
  leadSlug: string | null;
  setLeadSlug: (s: string | null) => void;
  /** Review build only: pretend to be signed in. */
  signIn: (g: Guest) => void;
  signOut: () => void;
  signInWithPassword: (email: string, password: string) => Result;
  signUp: (who: Guest, password: string) => Result;
  sendMagicLink: (email: string) => Result;
  resetPassword: (email: string) => Result;
  updatePassword: (password: string) => Result;
  rsvp: (slug: string, status: RsvpStatus, seats?: number) => void;
  /** RSVP with just a name and email, no account. */
  rsvpAsGuest: (slug: string, status: RsvpStatus, who: Guest, seats?: number) => void;
  /** Turn the guest RSVP's name and email into an account (they only add a password). */
  createAccount: (password?: string) => void;
  /** Signed in, or RSVP'd from this browser as a guest. */
  who: Guest | null;
  /** Signed in but hasn't clicked the confirmation email yet. */
  pendingEmail: string | null;
  cancel: (slug: string) => void;
  screening: (slug: string) => Promise<Screening>;
  setPhase: (p: PhaseOverride) => void;
  setPref: (k: "newsletter" | "closingReminder", v: boolean) => void;
  setAccess: (a: Access) => void;
  reset: () => void;
  phase: PhaseOverride;
  phaseFor: (show: Show) => Phase;
  toast: string | null;
  say: (msg: string) => void;
}

const C = createContext<Ctx | null>(null);

/** Database errors to plain words. */
const friendly = (m?: string) =>
  !m ? "Something went wrong. Please try again."
  : /capacity/i.test(m) ? "Sorry, this show just filled up."
  : /closed/i.test(m) ? "RSVPs for this show are closed."
  : /confirm your email/i.test(m) ? "Confirm your email first: check your inbox for the link."
  : /invalid login/i.test(m) ? "That email and password don't match."
  : /already registered|already been registered/i.test(m) ? "You already have an account with that email. Sign in instead."
  : /rate limit|too many/i.test(m) ? "Too many tries. Please wait a minute and try again."
  : m;

export function PreviewProvider({ buildNow, leadSlug: initialLead, children }: { buildNow: string; leadSlug: string | null; children: React.ReactNode }) {
  const [s, setS] = useState<Stored>(EMPTY);
  const [ready, setReady] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date(buildNow));
  const [leadSlug, setLeadSlug] = useState<string | null>(initialLead);
  const [toast, setToast] = useState<string | null>(null);
  const sRef = useRef(s); sRef.current = s;

  const save = useCallback((fn: (p: Stored) => Stored) => {
    setS((prev) => {
      const next = fn(prev);
      try {
        if (LIVE) localStorage.setItem(GUEST_KEY, JSON.stringify({ contact: next.contact, guestRsvps: next.guest ? {} : next.rsvps, guestSeats: next.guest ? {} : next.seats, phase: next.phase, access: next.access, accessChosen: next.accessChosen }));
        else localStorage.setItem(KEY, JSON.stringify(next));
      } catch { /* storage blocked */ }
      return next;
    });
  }, []);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 5200);
  }, []);

  /** Signed-in viewer: profile, preferences and RSVPs from the database. */
  const loadAccount = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPendingEmail(null); save((p) => ({ ...p, guest: null })); return; }
    if (!user.email_confirmed_at) { setPendingEmail(user.email ?? null); }
    else setPendingEmail(null);
    const [{ data: prof }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("first_name,last_name,email,newsletter,closing_reminder").eq("id", user.id).maybeSingle(),
      supabase.from("rsvps").select("show_slug,status,seats").neq("status", "cancelled"),
    ]);
    const meta = user.user_metadata ?? {};
    const guest: Guest = { first: prof?.first_name || meta.first_name || "", last: prof?.last_name || meta.last_name || "", email: prof?.email || user.email || "" };
    const rsvps: Record<string, RsvpStatus> = {}; const seats: Record<string, number> = {};
    for (const r of rows ?? []) { rsvps[r.show_slug] = r.status as RsvpStatus; seats[r.show_slug] = r.seats; }
    save((p) => ({ ...p, guest, contact: null, rsvps, seats, newsletter: prof?.newsletter ?? p.newsletter, closingReminder: prof?.closing_reminder ?? p.closingReminder }));
  }, [save]);

  useEffect(() => {
    try {
      if (LIVE) {
        const raw = localStorage.getItem(GUEST_KEY);
        if (raw) {
          const g = JSON.parse(raw);
          setS((p) => ({ ...p, contact: g.contact ?? null, rsvps: g.guestRsvps ?? {}, seats: g.guestSeats ?? {}, phase: REVIEW_MODE ? g.phase ?? "auto" : "auto", access: g.accessChosen ? g.access ?? p.access : p.access, accessChosen: !!g.accessChosen }));
        }
      } else {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setS({ ...EMPTY, ...saved, access: saved.accessChosen ? saved.access ?? EMPTY.access : EMPTY.access });
        }
      }
    } catch { /* storage blocked: start fresh */ }
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);

    if (!supabase) { setReady(true); return () => clearInterval(t); }
    // Current shows and home rows from the database.
    fetchLive().then((live) => {
      if (!live) return;
      applyLive(live);
      if (live.access) setS((p) => (p.accessChosen ? p : { ...p, access: live.access! }));
      setDataVersion((v) => v + 1);
    });
    loadAccount().finally(() => setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void loadAccount();
      if (event === "PASSWORD_RECOVERY" && !location.search.includes("mode=reset")) location.href = "/sign-in/?mode=reset";
    });
    return () => { clearInterval(t); sub.subscription.unsubscribe(); };
  }, [loadAccount]);

  /** Server RSVP; reconciles what the card optimistically showed with what the database decided. */
  const serverRsvp = useCallback(async (slug: string, who: Guest, seats: number) => {
    if (!supabase || !getShow(slug)) return; // demo cards on /review/ use made-up keys
    const { data, error } = await supabase.rpc("rsvp", { p_slug: slug, p_first: who.first, p_last: who.last, p_email: who.email, p_seats: seats });
    if (error) {
      save((p) => { const r = { ...p.rsvps }; delete r[slug]; return { ...p, rsvps: r }; });
      say(friendly(error.message));
      return;
    }
    const status = (data?.status ?? "confirmed") as RsvpStatus;
    const prev = sRef.current.rsvps[slug];
    save((p) => ({ ...p, rsvps: { ...p.rsvps, [slug]: status }, seats: { ...p.seats, [slug]: data?.seats ?? seats } }));
    if (data?.already) say(status === "waitlisted" ? "You're already on the waiting list for this show." : "You're already RSVP'd for this show.");
    else if (prev && prev !== status) say(status === "waitlisted" ? "This show just filled up, so you're on the waiting list. We'll email you if seats open." : "Good news: a seat opened up. You're confirmed.");
  }, [save, say]);

  const value = useMemo<Ctx>(() => ({
    ...s, ready, dataVersion, now, leadSlug, setLeadSlug, toast, say, pendingEmail,
    who: s.guest ?? s.contact,

    signIn: (guest) => { if (!LIVE) save((p) => ({ ...p, guest, contact: null })); },
    signOut: () => {
      if (supabase) { void supabase.auth.signOut(); save((p) => ({ ...p, guest: null, contact: null, rsvps: {}, seats: {} })); }
      else save((p) => ({ ...p, guest: null, contact: null }));
    },
    signInWithPassword: async (email, password) => {
      if (!supabase) return null;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return friendly(error.message);
      await loadAccount(); return null;
    },
    signUp: async (who, password) => {
      if (!supabase) { save((p) => ({ ...p, guest: who, contact: null })); return null; }
      const { data, error } = await supabase.auth.signUp({ email: who.email, password, options: { data: { first_name: who.first, last_name: who.last }, emailRedirectTo: `${siteOrigin()}/account/` } });
      if (error) return friendly(error.message);
      if (data.user && (data.user.identities?.length ?? 0) === 0) return friendly("already registered");
      if (!data.session) setPendingEmail(who.email);
      else await loadAccount();
      return null;
    },
    sendMagicLink: async (email) => {
      if (!supabase) return null;
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${siteOrigin()}/account/` } });
      return error ? friendly(error.message) : null;
    },
    resetPassword: async (email) => {
      if (!supabase) return null;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin()}/sign-in/?mode=reset` });
      return error ? friendly(error.message) : null;
    },
    updatePassword: async (password) => {
      if (!supabase) return null;
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return friendly(error.message);
      await loadAccount(); return null;
    },

    rsvp: (slug, status, seats = 1) => {
      save((p) => ({ ...p, rsvps: { ...p.rsvps, [slug]: status }, seats: { ...p.seats, [slug]: seats } }));
      const g = sRef.current.guest;
      if (LIVE && g) void serverRsvp(slug, g, seats);
    },
    rsvpAsGuest: (slug, status, who, seats = 1) => {
      save((p) => ({ ...p, contact: p.guest ? p.contact : who, rsvps: { ...p.rsvps, [slug]: status }, seats: { ...p.seats, [slug]: seats } }));
      if (LIVE) void serverRsvp(slug, who, seats);
    },
    createAccount: (password) => {
      const c = sRef.current.contact;
      if (!LIVE) { save((p) => (p.contact ? { ...p, guest: p.contact, contact: null } : p)); return; }
      if (!c || !password || !supabase) return;
      void supabase.auth.signUp({ email: c.email, password, options: { data: { first_name: c.first, last_name: c.last }, emailRedirectTo: `${siteOrigin()}/account/` } }).then(({ data, error }) => {
        if (error) { say(friendly(error.message)); return; }
        if (data.user && (data.user.identities?.length ?? 0) === 0) { say(friendly("already registered")); return; }
        if (data.session) void loadAccount();
        else { setPendingEmail(c.email); say(`Almost done: we sent a link to ${c.email}. Click it to confirm your account.`); }
      });
    },
    cancel: (slug) => {
      const drop = () => save((p) => {
        const r = { ...p.rsvps }; delete r[slug];
        const st = { ...p.seats }; delete st[slug];
        return { ...p, rsvps: r, seats: st };
      });
      if (!supabase) { drop(); return; }
      if (!sRef.current.guest) { say("To cancel, use the link in your confirmation email, or sign in."); return; }
      void supabase.rpc("cancel_rsvp", { p_slug: slug }).then(({ data, error }) => {
        if (error) { say(friendly(error.message)); return; }
        if (data?.cancelled) drop();
      });
    },
    screening: async (slug) => {
      if (!supabase) return { ok: false, reason: "review" };
      const { data, error } = await supabase.rpc("screening", { p_slug: slug });
      if (error || !data) return { ok: false, reason: error?.message ?? "error" };
      if (!data.ok) return { ok: false, reason: data.reason };
      return { ok: true, filmEmbed: data.film_embed ?? null, conversationEmbed: data.conversation_embed ?? null, accessCode: data.access_code ?? null, accessMode: (data.access_mode ?? "email") as Access };
    },
    setPhase: (phase) => save((p) => ({ ...p, phase })),
    setPref: (k, v) => {
      save((p) => ({ ...p, [k]: v }));
      if (supabase && sRef.current.guest) {
        void supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) void supabase!.from("profiles").update(k === "newsletter" ? { newsletter: v } : { closing_reminder: v }).eq("id", user.id);
        });
      }
    },
    setAccess: (access) => save((p) => ({ ...p, access, accessChosen: true })),
    reset: () => { if (supabase) void supabase.auth.signOut(); save(() => EMPTY); },
    phaseFor: (show) => (REVIEW_MODE && s.phase !== "auto" && show.slug === leadSlug ? s.phase : phaseOf(show, now)),
  }), [s, ready, dataVersion, now, leadSlug, toast, save, say, pendingEmail, loadAccount, serverRsvp]);

  // Re-render the page once live show data arrives (key change), so every read of lib/data sees it.
  return <C.Provider value={value}><Fragment key={dataVersion}>{children}</Fragment></C.Provider>;
}

export function usePreview(): Ctx {
  const c = useContext(C);
  if (!c) throw new Error("usePreview outside PreviewProvider");
  return c;
}

export const initials = (g: Guest | null) => (g ? `${g.first[0] ?? ""}${g.last[0] ?? ""}`.toUpperCase() : "");
