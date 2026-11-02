import type { Metadata, Viewport } from "next";
import { Figtree, Outfit } from "next/font/google";
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

const outfit = Outfit({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-outfit", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  // Link previews resolve images against the site that was shared (live or staging).
  metadataBase: new URL(SITE_URL),
  ...share(),
  title: { default: DEFAULT_TITLE, template: "%s | Slipstream" },
  // The review build must never be indexed.
  robots: REVIEW_MODE ? { index: false, follow: false } : undefined,
  icons: { icon: "/favicon.svg" },
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
