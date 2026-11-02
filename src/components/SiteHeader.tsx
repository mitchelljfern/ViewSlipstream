"use client";
/**
 * Header: transparent over the page at the top, then a soft dark glass bar
 * (opaque tint + blur) that fades in on the first scroll. Phones get the
 * tab bar at the bottom (BottomNav) for navigation, so the header stays
 * light: logo, the theme button and the account button.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { initials, usePreview } from "./Preview";
import { allShows } from "@/lib/data";
import { upcomingShows } from "@/lib/time";
import { ThemeToggle } from "./Theme";

export function useNav() {
  const { leadSlug, now, guest, phaseFor } = usePreview();
  const lead = allShows().find((s) => s.slug === leadSlug);
  const others = upcomingShows(allShows(), now, leadSlug ?? undefined);
  const leadLive = lead ? phaseFor(lead) === "live" : false;
  const links = [
    { href: lead ? `/${lead.slug}/` : "/", label: "Now Showing", badge: leadLive ? "live" : null },
    ...(others.length ? [{ href: "/#upcoming", label: "Upcoming", badge: null }] : []),
    { href: "/previous-titles/", label: "Previous Titles", badge: null },
    { href: "/in-conversation/", label: "In Conversation", badge: null },
    ...(guest ? [{ href: "/account/", label: "Account", badge: null }] : []),
  ];
  return { links, lead, leadLive };
}

export default function SiteHeader() {
  const { guest, signOut, ready, say } = usePreview();
  const { links } = useNav();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [path]);

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
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
          <ThemeToggle />
          {guest ? (
            <>
              <Link href="/account/" className="btn btn-glass btn-sm" style={{ paddingLeft: 6 }} aria-label="Account">
                <span className="avatar">{initials(guest)}</span>
                <span className="only-desktop">Account</span>
              </Link>
              <button className="btn btn-sm only-desktop" style={{ background: "transparent", color: "var(--muted)" }} onClick={() => { signOut(); say("Signed out"); }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/sign-in/" className="btn btn-glass btn-sm">Sign In</Link>
              <Link href="/sign-in/?mode=create" className="btn btn-primary btn-sm only-desktop">Create Account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
