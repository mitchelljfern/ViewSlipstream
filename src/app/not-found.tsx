import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap section stack g16" style={{ paddingTop: 48, maxWidth: 640 }}>
      <span className="eyebrow">Page not found</span>
      <h1 className="h1">This one isn't showing.</h1>
      <p className="muted">The page may have moved when the site was rebuilt. Everything that played on Slipstream is still in Previous titles.</p>
      <div className="row g10 wrap-row"><Link href="/" className="btn btn-primary">See what's showing</Link><Link href="/previous-titles/" className="btn btn-secondary">Previous titles</Link></div>
    </div>
  );
}
