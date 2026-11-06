"use client";
/**
 * A show page. The same URL is the invitation before the window opens and the
 * screening room once it does: a signed-in guest with an RSVP sees the
 * password-protected DaCast player at the top while the show is live.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Conversation, Show } from "@/lib/types";
import { clock, countdown, longDay, minutes, whenLine } from "@/lib/time";
import Countdown, { startLabel } from "./Countdown";
import AddToCalendar from "./AddToCalendar";
import { usePreview } from "./Preview";
import RsvpPanel from "./RsvpPanel";
import VideoFacade, { youtubeEmbed, youtubeThumb } from "./VideoFacade";
import PosterTile from "./PosterTile";
import { IconCalendar, IconCopy, IconDown, IconLock, IconMail, IconMic, IconPin, IconPlay } from "./Icons";
import CheckEmail from "./CheckEmail";

const KIND_LABEL: Record<Show["kind"], string> = { streaming: "Streaming", "in-person": "In person", giveaway: "Giveaway", live: "Live stream", paid: "Paid" };

/** Review build only: a stand-in password. The real one comes from the show record. */
const samplePassword = (s: Show) => `${s.slug.split("-").find((w) => w.length > 3)?.toUpperCase() ?? "SHOW"}-${(s.startsAt ?? "2026").slice(0, 4)}`;

export default function ShowView({ show, conversation, more }: { show: Show; conversation?: Conversation; more: Show[] }) {
  const ctx = usePreview();
  const phase = ctx.phaseFor(show);
  const status = ctx.rsvps[show.slug];
  // Anyone with an RSVP gets in: an account is optional. On the live site a guest
  // arrives through the signed link in the "It's showtime" email.
  const watching = !!ctx.who && !!status && status !== "waitlisted" && phase === "live" && (show.kind === "streaming" || show.kind === "paid" || show.kind === "live");
  const open = phase !== "closed" && !(show.kind === "in-person" && phase === "live");
  // In-person shows that are full still take names, for the waiting list.
  const waitlistOpen = show.kind === "in-person" && show.atCapacity;
  const canRsvp = open && !status && (!show.atCapacity || waitlistOpen);
  const [copied, setCopied] = useState(false);
  const [readMore, setReadMore] = useState(false);
  const [playerNote, setPlayerNote] = useState(false);
  // The live page has two videos, like the current site: the film, then the filmmaker conversation.
  const [reel, setReel] = useState<"film" | "talk">("film");
  const [getLink, setGetLink] = useState(false);
  useEffect(() => { setPlayerNote(false); }, [watching, reel]);

  const pw = samplePassword(show);
  const left = show.endsAt ? countdown(show.endsAt, ctx.now) : null;
  // The conversation line already sits in the facts card; don't repeat it in About.
  const aboutAll = show.about.filter((p) => p !== show.conversationLine);
  const about = readMore ? aboutAll : aboutAll.slice(0, 2);

  const chips = (
    <div className="row g8 wrap-row">
      {phase === "live" && show.kind !== "in-person" ? (
        <span className="chip chip-white"><span className="live-dot" />{show.kind === "giveaway" ? "Entries open" : "Now showing"}</span>
      ) : null}
      {phase === "closed" ? <span className="chip chip-outline">Closed</span> : null}
      <span className="chip chip-outline">{KIND_LABEL[show.kind]}</span>
      {show.kind === "paid" ? <span className="chip chip-blue">${show.price}</span>
        : open && !show.atCapacity && show.kind !== "giveaway" ? <span className="chip chip-blue">Free with RSVP</span> : null}
      {status ? <span className="chip chip-outline">{status === "waitlisted" ? "On the waiting list" : show.kind === "giveaway" ? "Entered" : "You're in"}</span> : null}
      {show.atCapacity && !status && open ? <span className="chip chip-outline">{waitlistOpen ? "Full · waiting list open" : "At capacity"}</span> : null}
    </div>
  );

  const facts = (
    <div className="card facts">
      {show.startsAt ? (
        <div className="fact"><IconCalendar /><div><b>{whenLine(show)}</b>
          <span className="muted small">{show.kind === "streaming" ? "Pacific time · watch any time in the window" : show.kind === "in-person" ? "Pacific time" : show.kind === "giveaway" ? `Winners drawn ${show.giveaway?.drawOn ?? "after entries close"}` : "Pacific time"}</span></div></div>
      ) : null}
      {show.venue ? (
        <div className="fact"><IconPin /><div className="fact-venue"><div><b>{show.venue.name}</b><span className="muted small">{show.venue.address}</span></div>
          <a className="btn btn-glass btn-sm" href={`https://maps.google.com/?q=${encodeURIComponent(`${show.venue.name}, ${show.venue.address}`)}`} target="_blank" rel="noreferrer">Get Directions</a></div></div>
      ) : null}
      {show.conversationLine ? (
        <div className="fact"><IconMic /><div><b>Conversation after the {show.kind === "giveaway" ? "release" : "film"}</b><span className="muted small">{show.conversationLine.replace(/^the screening will be followed by a conversation with\s*/i, "With ").replace(/^the documentary will be followed by a conversation with\s*/i, "With ")}</span></div></div>
      ) : null}
    </div>
  );

  return (
    <>
      {canRsvp ? (
        <a href="#rsvp" className="strip">
          <span>{waitlistOpen ? "This screening is full · waiting list open" : show.kind === "giveaway" ? "Entries are open" : show.kind === "in-person" ? "RSVP is open · limited seats" : "RSVP is open"}</span>
          <span className="row g4">{waitlistOpen ? "Join the list" : show.kind === "giveaway" ? "Enter now" : "Jump to RSVP"}<IconDown size={16} /></span>
        </a>
      ) : null}

      {watching ? (
        <section id="player" aria-label="Screening room">
          <div className="screen">
            <div>
              {show.conversationLine && show.kind !== "live" ? (
                <div className="reel-tabs" role="tablist" aria-label="Choose a video">
                  {([["film", "The film"], ["talk", "The conversation"]] as const).map(([k, l]) => (
                    <button key={k} role="tab" aria-selected={reel === k} className="reel-tab" onClick={() => setReel(k)}>
                      {k === "film" ? <IconPlay size={14} /> : <IconMic size={15} />}{l}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="player screen-frame">
                {show.heroImage ? <img src={show.heroImage} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }} /> : null}
                <span className="eyebrow" style={{ position: "absolute", left: 16, top: 14 }}>{show.kind === "live" ? "YouTube Live" : `DaCast player · ${reel === "film" ? "the film" : "the conversation"}`}</span>
                {show.kind === "live" ? (
                  <button className="facade" style={{ position: "relative", width: 76, height: 76, borderRadius: "50%", aspectRatio: "1", background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", border: 0 }}
                    aria-label={`Play ${show.title}`} onClick={() => setPlayerNote(true)}><IconPlay size={30} /></button>
                ) : (
                  // What DaCast shows before the code is entered (review build stand-in).
                  <form className="dacast-gate" onSubmit={(e) => { e.preventDefault(); setPlayerNote(true); }}>
                    <IconLock size={34} />
                    <b>This content is protected with an access code</b>
                    <div className="row g8" style={{ width: "100%", maxWidth: 360 }}>
                      <input className="input" aria-label="Access code" placeholder="Enter access code" style={{ flex: 1, minWidth: 0 }} />
                      <button className="btn btn-primary" style={{ minHeight: 48 }}>Watch</button>
                    </div>
                  </form>
                )}
                {playerNote ? <p className="small" style={{ position: "absolute", bottom: 16, left: 16, right: 16, textAlign: "center", background: "rgba(0,0,0,.75)", padding: "10px 12px", borderRadius: 10 }}>Review build: on the live site the DaCast player for {reel === "film" ? "the film" : "the conversation"} plays here once the code is entered.</p> : null}
              </div>
            </div>
          </div>
          <div className="wrap stack g16" style={{ paddingTop: 18 }}>
            {chips}
            <h1 className="h1">{show.title}</h1>
            {ctx.access === "email" ? (
              <CheckEmail show={show} email={ctx.who?.email} mode="live" />
            ) : (
            <div className="card stack g10" style={{ padding: "14px 16px" }}>
              <div className="row between"><b style={{ fontWeight: 600 }}>Access code</b>{ctx.access === "both" ? <span className="muted tiny row g6"><IconMail size={14} />Also in your email</span> : null}</div>
              <div className="row g8">
                <div style={{ flex: 1, height: 48, borderRadius: 12, background: "var(--field-bg)", border: "1px solid var(--line-strong)", display: "flex", alignItems: "center", padding: "0 14px", font: "600 18px/1 var(--font-display)", letterSpacing: ".16em" }}>{pw}</div>
                <button className="btn btn-secondary" style={{ minHeight: 48, padding: "0 16px", fontSize: 14 }}
                  onClick={async () => { try { await navigator.clipboard.writeText(pw); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } }}>
                  <IconCopy size={16} />{copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="muted small">Tap play, then paste the code into the player. Works on phone, tablet and laptop, and casts to a TV.</p>
            </div>
            )}
            {left && show.endsAt ? (
              <div className="stack g8">
                <span className="eyebrow">Available until {longDay(show.endsAt)} · {clock(show.endsAt)} PT</span>
                <div className="row g8 wrap-row">
                  <div className="tick"><b>{String(left.d).padStart(2, "0")}</b><small>days</small></div>
                  <div className="tick"><b>{String(left.h).padStart(2, "0")}</b><small>hours</small></div>
                  <div className="tick"><b>{String(left.m).padStart(2, "0")}</b><small>min</small></div>
                  <AddToCalendar show={show} which="end" variant="link" label="Add closing date to calendar" />
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className={`hero${canRsvp ? "" : " bleed-top"}`}>
          {show.heroImage ? <div className="hero-bg"><img src={show.heroImage} alt="" /></div> : null}
          <div className="wrap show-hero">
            <div className="stack g16">
              {show.partner ? <img src={show.partner.logo} alt={`Presented with ${show.partner.name}`} style={{ height: 34, width: "auto", alignSelf: "flex-start", opacity: 0.95 }} /> : null}
              {chips}
              <h1 className="h1">{show.title}</h1>
              {facts}
              {phase === "upcoming" && show.startsAt ? <Countdown to={show.startsAt} label={startLabel(show.kind)} /> : null}
              {canRsvp ? (
                <a href="#rsvp" className="btn btn-primary">{waitlistOpen ? "Join the waiting list" : show.kind === "giveaway" ? "Enter the giveaway" : show.kind === "paid" ? `Get a ticket · $${show.price}` : show.kind === "in-person" ? (show.maxSeats > 1 ? "RSVP · save your seats" : "RSVP · save my seat") : "RSVP · free"}</a>
              ) : null}
            </div>
            {show.trailerYoutubeId ? (
              <div className="stack g8">
                <span className="eyebrow">Trailer</span>
                <VideoFacade embed={youtubeEmbed(show.trailerYoutubeId)} thumbnail={youtubeThumb(show.trailerYoutubeId)} label={`${show.title} trailer`} caption="Official trailer" />
              </div>
            ) : null}
          </div>
        </section>
      )}

      <div className="wrap show-grid">
        {/* Desktop: this column and the RSVP column are both sticky, so whichever is
            shorter stays on screen beside the other while you scroll. */}
        <div className="stack g32 show-main" style={{ minWidth: 0 }}>
          {watching ? facts : null}
          {aboutAll.length ? (
            <section className="stack g12" aria-labelledby="about-h">
              <h2 id="about-h" className="h2">About the Show</h2>
              <div className="prose stack g12">{about.map((p, i) => <p key={i} className={i ? "muted" : undefined}>{p}</p>)}</div>
              {aboutAll.length > 2 ? <button className="btn btn-glass btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setReadMore((v) => !v)}>{readMore ? "Show Less" : "Read More"}</button> : null}
            </section>
          ) : null}

          {watching ? (
            <section className="card stack g10" style={{ padding: 16 }}>
              <b style={{ fontWeight: 600 }}>Trouble watching?</b>
              <p className="muted small">Refresh the page, check the code has no spaces, or try another browser. Still stuck? We answer fast during show windows.</p>
              <a href="mailto:hello@viewslipstream.com?subject=Help%20watching" className="btn btn-secondary btn-sm" style={{ alignSelf: "flex-start" }}>Contact support</a>
            </section>
          ) : null}
        </div>

        <aside className="stack g24 show-aside">
          <RsvpPanel show={show} conversation={conversation} />
          {phase === "live" && !watching && (show.kind === "streaming" || show.kind === "paid") ? (
            // RSVP'd on another device (or lost the email): no login, just send the link again.
            <section className="card stack g10" style={{ padding: "16px 18px" }} aria-labelledby="relink-h">
              <h2 id="relink-h" className="h3" style={{ fontSize: 18 }}>Already RSVP&rsquo;d?</h2>
              <p className="muted small">Enter the email you RSVP&rsquo;d with and we&rsquo;ll send your viewing link and access code again. No account needed.</p>
              {getLink ? (
                <p className="small row g8"><IconMail size={16} />Sent. Check your inbox, and your spam folder too.</p>
              ) : (
                <form className="row g8" onSubmit={(e) => { e.preventDefault(); setGetLink(true); ctx.say("Review build: on the live site this emails the viewing link and access code."); }}>
                  <input type="email" className="input" required placeholder="you@example.com" aria-label="Email you RSVP'd with" autoComplete="email" style={{ flex: 1, minWidth: 0 }} />
                  <button className="btn btn-secondary" style={{ minHeight: 48 }}>Send my link</button>
                </form>
              )}
            </section>
          ) : null}
          {open && !status && !show.atCapacity && show.kind !== "giveaway" ? (
            <section className="stack g14" aria-labelledby="after-h">
              <h2 id="after-h" className="h3">What happens after you RSVP</h2>
              <div className="steps">
                {[
                  ["Confirmation email, right away", "No account needed: just your name and email. Your seat is saved and the date goes on your calendar with one tap."],
                  [show.kind === "in-person" ? "Check-in details before the show" : "“It's showtime” email when the show goes live", show.kind === "in-person" ? "Everything you need at the door, the day of the screening." : "With your viewing link and access code."],
                  ["Thank you when it closes", "With a link to the conversation and a peek at what's next."],
                ].map(([t, d], i, a) => (
                  <div className="step" key={t}>
                    <div className="step-num"><span>{i + 1}</span>{i < a.length - 1 ? <i /> : null}</div>
                    <div style={{ paddingBottom: i < a.length - 1 ? 18 : 0 }}><b style={{ fontWeight: 600 }}>{t}</b><p className="muted small">{d}</p></div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {conversation ? (
        <section id="conversation" className="wrap section show-grid show-conv" aria-labelledby="conv-h">
          <div style={{ minWidth: 0 }}>
            <VideoFacade embed={conversation.embed} thumbnail={conversation.thumbnail} label={conversation.title} duration={minutes(conversation.durationSec)} />
          </div>
          <div className="stack g10">
            <span className="eyebrow">{conversation.durationSec ? minutes(conversation.durationSec) : "Plays after the film"}</span>
            <h2 id="conv-h" className="h2">The Conversation</h2>
            <p className="muted">{conversation.title}</p>
          </div>
        </section>
      ) : null}

      {more.length ? (
        <section className="wrap section stack g16" aria-labelledby="more-h">
          <div className="section-head"><h2 id="more-h" className="h2">More in {show.series}</h2><Link href="/#titles" className="btn btn-glass btn-sm">All Titles</Link></div>
          <div className="poster-grid">
            {more.map((s) => <PosterTile key={s.slug} href={`/${s.slug}/`} title={s.title} poster={s.poster} ratio={s.posterRatio} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
