import Link from "next/link";
import { SOCIAL } from "@/lib/social";

/**
 * Footer: the brand big on the left, the places to go in the middle, the
 * socials as real buttons on the right, and the legal line underneath.
 */
export default function SiteFooter() {
  const links = [
    { href: "/", label: "Now Showing" },
    { href: "/previous-titles/", label: "Previous Titles" },
    { href: "/in-conversation/", label: "In Conversation" },
    { href: "/account/", label: "Your Account" },
  ];
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Link href="/" aria-label="Slipstream home"><img src="/slipstream-logo.png" alt="Slipstream" width={512} height={29} /></Link>
          <p className="muted">Screenings, filmmaker conversations and giveaways in Los Angeles. Free with an RSVP.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer">
          <span className="eyebrow">Explore</span>
          {links.map((l) => <Link key={l.href} className="flink" href={l.href}>{l.label}</Link>)}
          <a className="flink" href="mailto:hello@viewslipstream.com">Contact Us</a>
        </nav>
        <div className="footer-social">
          <span className="eyebrow">Follow Slipstream</span>
          {SOCIAL.map(({ href, label, Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener" className="btn btn-secondary social-btn"><Icon size={20} /><span>{label}</span></a>
          ))}
        </div>
      </div>
      <div className="wrap footer-legal muted tiny">
        <span>Slipstream c/o Satiated Productions, Slipstream LLC · Los Angeles, CA</span>
        <span>{new Date().getFullYear()} Slipstream · All rights reserved</span>
      </div>
    </footer>
  );
}
