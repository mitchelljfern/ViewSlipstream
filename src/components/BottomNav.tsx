"use client";
/** Phone tab bar: the four places people go, always under a thumb. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials, usePreview } from "./Preview";
import { useNav } from "./SiteHeader";

const Ico = ({ d, fill }: { d: React.ReactNode; fill?: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

export default function BottomNav() {
  const path = usePathname();
  const { guest } = usePreview();
  const { lead, leadLive } = useNav();
  const showHref = lead ? `/${lead.slug}/` : "/";
  const tabs = [
    { href: "/", label: "Home", on: path === "/", icon: <Ico d={<><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>} /> },
    { href: showHref, label: "Now Showing", on: path === showHref, live: leadLive, icon: <Ico d={<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" /></>} /> },
    { href: "/in-conversation/", label: "Conversations", on: path.startsWith("/in-conversation"), icon: <Ico d={<><path d="M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>} /> },
    { href: "/previous-titles/", label: "Past Titles", on: path.startsWith("/previous-titles"), icon: <Ico d={<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="9" rx="1.5" /><rect x="3" y="15" width="7" height="6" rx="1.5" /><rect x="14" y="15" width="7" height="6" rx="1.5" /></>} /> },
  ];
  const acctOn = path.startsWith("/account") || path.startsWith("/sign-in");
  return (
    <nav className="tabbar only-mobile" aria-label="Main">
      {tabs.map((t) => (
        <Link key={t.label} href={t.href} className="tab" aria-current={t.on ? "page" : undefined}>
          <span className="tab-icon">{t.icon}{t.live ? <span className="live-dot tab-dot" /> : null}</span>
          <span>{t.label}</span>
        </Link>
      ))}
      <Link href={guest ? "/account/" : "/sign-in/"} className="tab" aria-current={acctOn ? "page" : undefined}>
        <span className="tab-icon">{guest ? <span className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{initials(guest)}</span> : <Ico d={<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>} />}</span>
        <span>{guest ? "Account" : "Sign In"}</span>
      </Link>
    </nav>
  );
}
