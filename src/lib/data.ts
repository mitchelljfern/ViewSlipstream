/**
 * The one place pages get content from.
 *
 * Review phase: reads the JSON snapshot in src/data (built from the live
 * WordPress site by scripts/build_data_from_wordpress.py).
 * Phase 2: these functions become Supabase queries. Pages and components do
 * not change, which is the point of keeping every read behind this file.
 */
import showsJson from "@/data/shows.json";
import groupsJson from "@/data/featured-groups.json";
import archiveJson from "@/data/archive.json";
import conversationsJson from "@/data/conversations.json";
import type { ArchiveGroup, ArchiveItem, Conversation, Show } from "./types";

const shows = showsJson as unknown as Show[];
const groups = groupsJson as { title: string; slugs: string[] }[];
const archive = archiveJson as ArchiveGroup[];
const conversations = conversationsJson as Conversation[];

export const allShows = (): Show[] => shows;
export const getShow = (slug: string): Show | undefined => shows.find((s) => s.slug === slug);

export const featuredGroups = (): { title: string; shows: Show[] }[] =>
  groups.map((g) => ({ title: g.title, shows: g.slugs.map((s) => getShow(s)).filter(Boolean) as Show[] }));

export const archiveGroups = (): ArchiveGroup[] => archive;

export const getArchiveItem = (slug: string): (ArchiveItem & { series: string }) | undefined => {
  for (const g of archive) {
    const it = g.items.find((i) => i.slug === slug);
    if (it) return { ...it, series: g.title };
  }
  return undefined;
};

export const allConversations = (): Conversation[] => conversations;
export const getConversation = (id: string | null | undefined) =>
  id ? conversations.find((c) => c.id === id) : undefined;

/** Every path that gets a show page: featured shows plus the archive. */
export const showPageSlugs = (): string[] => {
  const set = new Set<string>(shows.map((s) => s.slug));
  for (const g of archive) for (const i of g.items) set.add(i.slug);
  return [...set];
};

export const moreInSeries = (show: Show, n = 5): Show[] =>
  shows.filter((s) => s.series === show.series && s.slug !== show.slug).slice(0, n);
