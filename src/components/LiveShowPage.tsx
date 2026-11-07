"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getConversation, getShow, moreInSeries } from "@/lib/data";
import { LIVE, usePreview } from "./Preview";
import ShowView from "./ShowView";

/** A show page for a slug that wasn't in the last build. */
export default function LiveShowPage() {
  const ctx = usePreview();
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => { setSlug(window.location.pathname.split("/").filter(Boolean)[0] ?? null); }, []);
  const show = slug ? getShow(slug) : undefined;
  useEffect(() => { if (show) document.title = `${show.title} · Slipstream`; }, [show]);

  if (show) return <ShowView show={show} conversation={getConversation(show.conversationId)} more={moreInSeries(show)} />;
  // Still loading the live shows.
  if (!slug || (LIVE && ctx.dataVersion === 0)) return <div className="wrap section" style={{ minHeight: "60vh" }} aria-busy="true" />;
  return (
    <div className="wrap section stack g16" style={{ minHeight: "50vh" }}>
      <h1 className="h1">We couldn&rsquo;t find that page</h1>
      <p className="muted">It may have moved, or the show is no longer listed.</p>
      <div className="row g10 wrap-row"><Link href="/" className="btn btn-primary">See what&rsquo;s showing</Link><Link href="/previous-titles/" className="btn btn-secondary">Previous titles</Link></div>
    </div>
  );
}
