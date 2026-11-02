"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { initials, usePreview } from "./Preview";
import { IconClose, IconMenu, IconChevron } from "./Icons";
import { SOCIAL } from "@/lib/social";
import { allShows } from "@/lib/data";
import { upcomingShows } from "@/lib/time";


export function useNav() {
  const { leadSlug, now, guest, phaseFor } = usePreview();
  const lead = allShows().find((s) => s.slug === leadSlug);
  const others = upcomingShows(allShows(), now, leadSlug ?? undefined);
  const leadLive = lead ? phaseFor(lead) === "live" : false;
  const links = [
    { href: lead ? `/${lead.slug}/` : "/", label: "Now showing", badge: leadLive ? "live" : lead?.startsAt ? "date" : null },
    ...(others.length ? [{ href: "/#upcoming", label: "Upcoming", badge: null }] : []),
    { href: "/previous-titles/", label: "Previous titles", badge: null },
    { href: "/in-conversation/", label: "In conversation", badge: null },
    ...(guest ? [{ href: "/account/", label: "Account", badge: null }] : []),
  ];
  return { links, lead, leadLive };
}

export default function SiteHeader() {
  const { guest, signOut, ready, say } = usePreview();
  const { links, lead, leadLive } = useNav();
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const out = () => { signOut(); say("Signed out"); };

  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="Slipstream home">
          <img src="/slipstream-logo.png" alt="Slipstream" width={512} height={29} />
        </Link>
        <nav className="nav-desktop" aria-label="Primary">
          {links.filter((l) => l.label !== "Account").map((l) => (
            <Link key={l.label} href={l.href} aria-current={path === l.href ? "page" : undefined}>
              {l.label}
              {l.badge === "live" && <span className="live-dot" style={{ display: "inline-block", marginLeft: 8, verticalAlign: "middle" }} />}
            </Link>
          ))}
        </nav>
        <div className="header-actions" style={{ visibility: ready ? "visible" : "hidden" }}>
          {guest ? (
            <>
              <Link href="/account/" className="btn btn-secondary btn-sm" style={{ paddingLeft: 6 }} aria-label="Account">
                <span className="avatar">{initials(guest)}</span>
                <span className="only-desktop">Account</span>
              </Link>
              <button className="btn btn-sm only-desktop" style={{ background: "transparent", color: "var(--muted)" }} onClick={out}>Sign out</button>
            </>
          ) : (
            <>
              <Link href="/sign-in/" className="btn btn-secondary btn-sm">Sign in</Link>
              <Link href="/sign-in/?mode=create" className="btn btn-primary btn-sm only-desktop">Create account</Link>
            </>
          )}
          <button className="icon-btn only-mobile" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} style={{ marginRight: -12 }}>
            <IconMenu size={22} />
          </button>
        </div>
      </div>

      {/* Portaled to <body>: the header's backdrop blur would otherwise trap a fixed overlay inside it. */}
      {open && typeof document !== "undefined" && createPortal(
        <div className="menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="menu-head">
            <img src="/slipstream-logo.png" alt="Slipstream" style={{ height: 12, width: "auto" }} />
            <button className="icon-btn" aria-label="Close menu" onClick={() => setOpen(false)} style={{ marginRight: -12 }}><IconClose size={22} /></button>
          </div>
          <nav aria-label="Menu">
            {links.map((l) => (
              <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
                {l.badge === "live" ? <small><span className="live-dot" />Live</small>
                  : l.badge === "date" && lead?.startsAt ? <small>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" }).format(new Date(lead.startsAt))}</small>
                  : <IconChevron size={18} />}
              </Link>
            ))}
          </nav>
          <div className="menu-foot">
            {guest ? (
              <>
                <Link href="/account/" className="card row g12" style={{ padding: "12px 14px", color: "#fff" }} onClick={() => setOpen(false)}>
                  <span className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>{initials(guest)}</span>
                  <span className="stack" style={{ flex: 1 }}><b style={{ fontWeight: 600 }}>{guest.first} {guest.last}</b><span className="muted small">{leadLive ? "Your show is live" : "Your RSVPs and settings"}</span></span>
                  <IconChevron size={18} />
                </Link>
                <button className="btn btn-secondary" onClick={() => { out(); setOpen(false); }}>Sign out</button>
              </>
            ) : (
              <div className="row g10">
                <Link href="/sign-in/" className="btn btn-secondary" style={{ flex: 1 }}>Sign in</Link>
                <Link href="/sign-in/?mode=create" className="btn btn-primary" style={{ flex: 1 }}>Create account</Link>
              </div>
            )}
            <div className="row g10">
              {SOCIAL.map(({ href, label, Icon }) => (
                <a key={label} href={href} aria-label={label} className="btn btn-secondary" style={{ width: 44, minHeight: 44, padding: 0, borderRadius: 12 }}><Icon size={18} /></a>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
