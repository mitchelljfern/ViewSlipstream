import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { PreviewProvider, REVIEW_MODE } from "@/components/Preview";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BottomNav from "@/components/BottomNav";
import ReviewBar, { Toast } from "@/components/ReviewBar";
import NewsletterPrompt from "@/components/NewsletterPrompt";
import { ThemeScript } from "@/components/Theme";
import { allShows } from "@/lib/data";
import { currentShow } from "@/lib/time";
import { DEFAULT_TITLE, SITE_URL, share } from "@/lib/share";

// Fonts ship with the repo (Fontsource packages), so a build never depends on
// reaching Google Fonts: that fetch failed on Netlify and took the deploy down.
const outfit = localFont({
  src: "../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2",
  weight: "100 900", variable: "--font-outfit", display: "swap",
});
const figtree = localFont({
  src: [
    { path: "../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-italic.woff2", style: "italic" },
  ],
  weight: "300 900", variable: "--font-figtree", display: "swap",
});

export const metadata: Metadata = {
  // Link previews resolve images against the site that was shared (live or staging).
  metadataBase: new URL(SITE_URL),
  ...share(),
  title: { default: DEFAULT_TITLE, template: "%s | Slipstream" },
  // The review build must never be indexed.
  robots: REVIEW_MODE ? { index: false, follow: false } : undefined,
  // A big white S on black, drawn from the logo's typeface. PNGs for browsers and home screens that skip SVG.
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon-32.png", sizes: "32x32", type: "image/png" }], apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const lead = currentShow(allShows(), now);
  return (
    <html lang="en" className={`${outfit.variable} ${figtree.variable}`} suppressHydrationWarning>
      <body>
        <ThemeScript />
        <PreviewProvider buildNow={now.toISOString()} leadSlug={lead?.slug ?? null}>
          <a href="#main" className="sr-only">Skip to content</a>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
          <BottomNav />
          <NewsletterPrompt />
          <Toast />
          <ReviewBar />
        </PreviewProvider>
      </body>
    </html>
  );
}
