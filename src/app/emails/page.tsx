import Link from "next/link";
export const metadata = { title: "Emails", robots: { index: false } };
const EMAILS = [
  ["rsvp", "RSVP confirmation", "Sent the moment someone RSVPs."],
  ["live", "It's showtime", "Sent when the window opens, with the viewing link and password."],
  ["thanks", "Thank you", "Sent when the window closes, with the conversation and what's next."],
];
export default function Emails() {
  return (
    <div className="wrap section stack g20" style={{ paddingTop: 28 }}>
      <h1 className="h1">The three emails</h1>
      <p className="muted">Every RSVP gets these, in this order.</p>
      <div className="auto-grid">
        {EMAILS.map(([k, t, d], i) => (
          <Link key={k} href={`/emails/${k}/`} className="card stack g8" style={{ padding: 20, color: "var(--text)" }}>
            <span className="eyebrow">Email {i + 1}</span><b style={{ fontWeight: 600, fontSize: 18 }}>{t}</b><span className="muted small">{d}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
