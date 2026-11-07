/**
 * Live content from Supabase, loaded in the browser so edits made in the Client
 * Hub (Shows tab) show up without rebuilding the site.
 *
 * Only current shows (status "published") and the home page rows are fetched.
 * Past show pages stay in the static JSON snapshot, which is plenty for archive
 * titles that never change.
 */
import { supabase } from "./supabase";
import type { Show } from "./types";

export interface LiveData {
  shows: Show[];
  groups: { title: string; slugs: string[] }[];
  /** Client's choice: where guests get the access code. */
  access: "email" | "page" | "both" | null;
}

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** show_series.position 1000 marks a show's own series label (from the import), not a slot in a home row. */
const LABEL_POSITION = 1000;

export async function fetchLive(): Promise<LiveData | null> {
  if (!supabase) return null;
  const [showsRes, seriesRes, linksRes, availRes, settingsRes] = await Promise.all([
    supabase.from("shows").select("*").eq("status", "published"),
    supabase.from("series").select("id,title,kind,home_position").order("home_position", { ascending: true, nullsFirst: false }),
    supabase.from("show_series").select("show_slug,series_id,position"),
    supabase.rpc("show_availability"),
    supabase.from("settings").select("key,value"),
  ]);
  if (showsRes.error || seriesRes.error || linksRes.error) {
    console.warn("[live] falling back to snapshot", showsRes.error ?? seriesRes.error ?? linksRes.error);
    return null;
  }
  const series = seriesRes.data as Row[];
  const links = linksRes.data as Row[];
  const titleOf = new Map(series.map((s) => [s.id, s.title as string]));
  const full = new Map(((availRes.data as Row[] | null) ?? []).map((a) => [a.show_slug as string, Boolean(a.is_full)]));

  // A show's own series: its label link if there is one, else its first home row.
  const label = new Map<string, string>();
  for (const l of [...links].sort((a, b) => b.position - a.position)) {
    if (!label.has(l.show_slug) && titleOf.has(l.series_id)) label.set(l.show_slug, titleOf.get(l.series_id)!);
  }

  const shows: Show[] = (showsRes.data as Row[]).map((r) => ({
    slug: r.slug,
    title: r.title,
    series: label.get(r.slug) ?? "",
    kind: r.kind,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    venue: r.venue_name ? { name: r.venue_name, address: r.venue_address ?? "" } : null,
    about: r.about ?? [],
    conversationLine: r.conversation_line,
    trailerYoutubeId: r.trailer_youtube_id,
    heroImage: r.hero_image,
    poster: r.poster ?? "",
    posterRatio: Number(r.poster_ratio) || 0.667,
    partner: r.partner_name ? { name: r.partner_name, logo: r.partner_logo ?? "" } : null,
    titleArt: r.title_art,
    atCapacity: Boolean(r.marked_full) || Boolean(full.get(r.slug)),
    conversationId: r.conversation_id,
    maxSeats: r.max_seats ?? 1,
    ...(r.giveaway ? { giveaway: r.giveaway } : {}),
    ...(r.price != null ? { price: Number(r.price) } : {}),
    ...(r.youtube_live_id ? { youtubeLiveId: r.youtube_live_id } : {}),
  }));
  shows.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

  const groups = series
    .filter((s) => s.home_position != null)
    .map((s) => ({
      title: s.title as string,
      slugs: links.filter((l) => l.series_id === s.id && l.position < LABEL_POSITION).sort((a, b) => a.position - b.position).map((l) => l.show_slug as string),
    }))
    .filter((g) => g.slugs.length);

  const setting = ((settingsRes.data as Row[] | null) ?? []).find((s) => s.key === "access_mode")?.value;
  const access = setting === "email" || setting === "page" || setting === "both" ? setting : null;
  return { shows, groups, access };
}
