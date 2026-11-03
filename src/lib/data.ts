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
import historyJson from "@/data/history.json";
import type { ArchiveGroup, ArchiveItem, Conversation, Show } from "./types";

const shows = showsJson as unknown as Show[];
const groups = groupsJson as { title: string; slugs: string[] }[];
const archive = archiveJson as ArchiveGroup[];
const conversations = conversationsJson as Conversation[];
/** Past shows imported from the WordPress export: full pages, never listed as current. */
const history = historyJson as unknown as Show[];

export const allShows = (): Show[] => shows;
export const getShow = (slug: string): Show | undefined => shows.find((s) => s.slug === slug) ?? history.find((s) => s.slug === slug);

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

/** One row per Previous Titles entry, flattened for search and filters. */
export interface PastTitle {
  slug: string; title: string; poster: string; ratio?: number;
  program: string; year: number | null; date: string | null;
  kind: Show["kind"] | null; shorts: boolean; conversation: boolean;
  /** Lower-case text the search box matches: title, program, conversation guests, about (cast, directors). */
  text: string;
}

export const pastTitles = (): PastTitle[] => {
  const rows: PastTitle[] = [];
  let lastYear: number | null = null;
  for (const g of archive) {
    const items = g.items.map((i) => ({ i, show: getShow(i.slug) }));
    // Titles with no dated page take the year their program ran.
    const years = items.map(({ show }) => (show?.startsAt ? Number(show.startsAt.slice(0, 4)) : null)).filter((y): y is number => y !== null);
    const groupYear: number | null = years.length ? Math.max(...years) : lastYear;
    lastYear = groupYear;
    for (const { i, show } of items) {
      const program = g.title.replace(/®/g, "");
      rows.push({
        slug: i.slug, title: i.title, poster: i.poster, ratio: i.ratio, program,
        year: show?.startsAt ? Number(show.startsAt.slice(0, 4)) : groupYear,
        date: show?.startsAt ?? null,
        kind: show?.kind ?? null,
        shorts: /short/i.test(`${i.title} ${program}`),
        conversation: !!(i.conversationId || show?.conversationId || show?.conversationLine),
        text: `${i.title} ${program} ${show?.conversationLine ?? ""} ${show?.about.join(" ") ?? ""}`.toLowerCase(),
      });
    }
  }
  return rows;
};

export const allConversations = (): Conversation[] => conversations;
export const getConversation = (id: string | null | undefined) =>
  id ? conversations.find((c) => c.id === id) : undefined;

/** Every path that gets a show page: featured shows plus the archive. */
export const showPageSlugs = (): string[] => {
  const set = new Set<string>([...shows, ...history].map((s) => s.slug));
  for (const g of archive) for (const i of g.items) set.add(i.slug);
  return [...set];
};

export const moreInSeries = (show: Show, n = 5): Show[] =>
  (shows.includes(show) ? shows : history).filter((s) => s.series === show.series && s.slug !== show.slug && s.title !== show.title).slice(0, n);
