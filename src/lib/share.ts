import type { Metadata } from "next";

/**
 * Link previews (iMessage, Slack, email, Facebook, LinkedIn, X).
 *
 * Every page builds its metadata through `share()` so it always sends a title,
 * description and image together. Next.js replaces a parent's `openGraph`
 * object instead of merging it, so a page that set only `openGraph.images`
 * used to lose its og:title and og:description.
 */

/**
 * The address this build is served from, so preview images resolve on the
 * site that was shared. Netlify sets CONTEXT, URL (the production address,
 * which becomes viewslipstream.com once the domain moves) and
 * DEPLOY_PRIME_URL (the staging or pull request address).
 */
export const SITE_URL =
  (process.env.CONTEXT === "production" ? process.env.URL : process.env.DEPLOY_PRIME_URL) ||
  process.env.URL ||
  "https://viewslipstream.netlify.app";

export const SITE_NAME = "Slipstream";
export const DEFAULT_TITLE = "Slipstream | Screenings and conversations with filmmakers";
export const DEFAULT_DESCRIPTION =
  "Compelling, provocative presentations and conversations with artists and creators. RSVP to stream new films and series, and watch the filmmaker conversations.";

/** 1200 x 630 brand card in public/. Used when a page has no image of its own. */
export const DEFAULT_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Slipstream: screenings and conversations with filmmakers" };

type ShareInput = {
  /** Page title without the "| Slipstream" suffix. Omit for the site default. */
  title?: string;
  description?: string;
  /** Absolute URL or a path in public/. Falls back to the brand card. */
  image?: string | null;
  imageAlt?: string;
  /** Path of the page, e.g. "/spider-noir/". */
  path?: string;
};

/** Trim to a preview-friendly length on a word boundary. */
export function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.]+$/, "") + "…";
}

export function share({ title, description, image, imageAlt, path }: ShareInput = {}): Metadata {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const desc = clip(description || DEFAULT_DESCRIPTION);
  const img = image
    ? { url: image, alt: imageAlt || title || SITE_NAME }
    : DEFAULT_IMAGE;
  return {
    ...(title ? { title } : {}),
    description: desc,
    ...(path ? { alternates: { canonical: path } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: fullTitle,
      description: desc,
      url: path || "/",
      images: [img],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: desc,
      images: [img.url],
    },
  };
}
