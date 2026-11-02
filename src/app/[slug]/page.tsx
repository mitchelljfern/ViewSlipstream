import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShowView from "@/components/ShowView";
import VideoFacade from "@/components/VideoFacade";
import { PosterWell } from "@/components/PosterTile";
import { getArchiveItem, getConversation, getShow, moreInSeries, showPageSlugs } from "@/lib/data";
import { minutes } from "@/lib/time";
import { share } from "@/lib/share";

export const dynamicParams = false;
export const generateStaticParams = () => showPageSlugs().map((slug) => ({ slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const show = getShow(slug);
  const item = show ?? getArchiveItem(slug);
  if (!item) return {};
  return share({
    title: item.title,
    description: show?.about[0] ?? `${item.title} on Slipstream.`,
    image: show?.heroImage ?? item.poster,
    imageAlt: item.title,
    path: `/${slug}/`,
  });
}

export default async function ShowPage({ params }: Props) {
  const { slug } = await params;
  const show = getShow(slug);
  if (show) return <ShowView show={show} conversation={getConversation(show.conversationId)} more={moreInSeries(show)} />;

  // Archive titles that only exist as a poster: a light closed page with the conversation if there is one.
  const item = getArchiveItem(slug);
  if (!item) notFound();
  const conv = getConversation(item.conversationId);
  return (
    <div className="wrap section" style={{ paddingTop: 28 }}>
      <div className="show-grid" style={{ paddingTop: 0 }}>
        <div className="stack g20" style={{ minWidth: 0 }}>
          <div className="row g8"><span className="chip chip-outline">Closed</span><span className="chip chip-outline">{item.series}</span></div>
          <h1 className="h1">{item.title}</h1>
          <p className="muted">This title screened on Slipstream as part of {item.series}.</p>
          {conv ? (
            <section className="stack g12">
              <h2 className="h2">The conversation</h2>
              <VideoFacade embed={conv.embed} thumbnail={conv.thumbnail} label={conv.title} duration={minutes(conv.durationSec)} />
              <p className="small muted">{conv.title}</p>
            </section>
          ) : null}
          <div className="row g10 wrap-row"><Link href="/" className="btn btn-primary">See what's showing now</Link><Link href="/previous-titles/" className="btn btn-secondary">Previous titles</Link></div>
        </div>
        <div style={{ maxWidth: 360 }}><PosterWell src={item.poster} /></div>
      </div>
    </div>
  );
}
