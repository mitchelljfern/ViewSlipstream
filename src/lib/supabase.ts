/**
 * Slipstream's own Supabase project (org "View Slipstream", project ViewSlipstream.com).
 * The URL and publishable key are public by design: every browser gets them, and
 * row level security decides what each visitor can read or change.
 * When they aren't set, the site falls back to the review build (JSON + browser-only RSVPs).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** True when the site runs on the real database (accounts, RSVPs, emails). */
export const LIVE = Boolean(URL && KEY);

export const supabase: SupabaseClient | null = LIVE
  ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } })
  : null;

/** Where auth emails send people back to (this site, whichever deploy it is). */
export const siteOrigin = () => (typeof window === "undefined" ? "" : window.location.origin);
