import type { Metadata } from "next";
import LiveShowPage from "@/components/LiveShowPage";

// Netlify serves this page for any /<slug>/ that wasn't built (a show added in the
// Client Hub after the last deploy). It loads the show from Supabase in the browser.
export const metadata: Metadata = { title: "Slipstream", robots: { index: false } };

export default function Page() {
  return <LiveShowPage />;
}
