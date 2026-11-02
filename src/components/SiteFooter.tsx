import Link from "next/link";
import { SOCIAL } from "@/lib/social";

export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap stack g20" style={{ paddingTop: 32, paddingBottom: 40 }}>
        <img src="/slipstream-logo.png" alt="Slipstream" style={{ height: 12, width: "auto", alignSelf: "flex-start" }} />
        <nav aria-label="Footer" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, maxWidth: 420 }}>
          <Link className="flink" href="/">Now showing</Link>
          <Link className="flink" href="/previous-titles/">Previous titles</Link>
          <Link className="flink" href="/in-conversation/">In conversation</Link>
          <a className="flink" href="mailto:hello@viewslipstream.com">Contact us</a>
        </nav>
        <div className="row g10">
          {SOCIAL.map(({ href, label, Icon }) => (
            <a key={label} href={href} aria-label={label} className="btn btn-secondary" style={{ width: 44, minHeight: 44, padding: 0, borderRadius: 12 }}><Icon size={18} /></a>
          ))}
        </div>
        <p className="muted tiny" style={{ lineHeight: 1.6 }}>
          Slipstream c/o Satiated Productions, Slipstream LLC · Los Angeles, CA<br />
          {new Date().getFullYear()} Slipstream · All rights reserved
        </p>
      </div>
    </footer>
  );
}
