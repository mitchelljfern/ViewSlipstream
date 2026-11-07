"use client";
import PasswordInput from "./PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LIVE, usePreview } from "./Preview";
import { allShows } from "@/lib/data";
import { IconMail } from "./Icons";

type Mode = "in" | "create" | "forgot" | "reset";

export default function SignInView() {
  const ctx = usePreview();
  const params = useSearchParams();
  const router = useRouter();
  const start = params.get("mode");
  const [mode, setMode] = useState<Mode>(start === "create" || start === "reset" || start === "forgot" ? start : "in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<null | "link" | "reset" | "confirm">(null);
  const [sentTo, setSentTo] = useState("");
  const next = params.get("next");
  const nextShow = next ? allShows().find((s) => next.includes(`/${s.slug}/`)) : undefined;
  const goNext = () => router.push(next && next.startsWith("/") ? (next.includes("#") ? next : `${next}#rsvp`) : "/account/");

  const run = async (fn: () => Promise<string | null>, ok: () => void) => {
    setBusy(true); setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err); else ok();
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    const first = String(f.get("first") || "").trim();
    const last = String(f.get("last") || "").trim();
    if (!LIVE) { // review build
      if (mode === "forgot") { setSentTo(email); setSent("reset"); return; }
      ctx.signIn({ first: first || email.split("@")[0] || "Alex", last: last || "Rivera", email });
      ctx.say(mode === "create" ? "Account created" : "Signed in");
      goNext(); return;
    }
    if (mode === "in") void run(() => ctx.signInWithPassword(email, password), () => { ctx.say("Signed in"); goNext(); });
    else if (mode === "create") void run(() => ctx.signUp({ first, last, email }, password), () => { setSentTo(email); setSent("confirm"); });
    else if (mode === "forgot") void run(() => ctx.resetPassword(email), () => { setSentTo(email); setSent("reset"); });
    else void run(() => ctx.updatePassword(password), () => { ctx.say("Password updated. You're signed in."); goNext(); });
  };

  const magicLink = (form: HTMLFormElement | null) => {
    const email = String(new FormData(form ?? undefined).get("email") || "").trim();
    if (!email) { setError("Enter your email above first."); return; }
    if (!LIVE) { setSentTo(email); setSent("link"); return; }
    void run(() => ctx.sendMagicLink(email), () => { setSentTo(email); setSent("link"); });
  };

  if (sent) {
    return (
      <div className="wrap" style={{ paddingTop: 28, paddingBottom: 24, maxWidth: 520 }}>
        <div className="stack g16">
          <div className="check-email" role="status"><IconMail size={22} />
            <div className="stack g4">
              <b>Check your email</b>
              <span className="small muted">
                {sent === "confirm" ? `We sent a link to ${sentTo}. Click it to confirm your account, and you'll be signed in.`
                  : sent === "reset" ? `If ${sentTo} has an account, a link to set a new password is on its way.`
                  : `If ${sentTo} has an account, a sign-in link is on its way. It works once.`} Not there? Check spam, junk or promotions.
              </span>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => { setSent(null); setMode("in"); }}>Back to sign in</button>
        </div>
      </div>
    );
  }

  const title = mode === "in" ? "Welcome back" : mode === "create" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Set a new password";
  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 24, maxWidth: 520 }}>
      <div className="stack g20">
        {nextShow && (mode === "in" || mode === "create") ? (
          <div className="card row g12" style={{ padding: 12 }}>
            <img src={nextShow.poster} alt="" style={{ width: 48, height: 72, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }} />
            <div className="stack g4"><span className="eyebrow">Sign in to watch</span><b style={{ fontWeight: 600, lineHeight: 1.3 }}>{nextShow.title}</b><span className="muted small">We'll bring you right back.</span></div>
          </div>
        ) : null}
        <h1 className="h1" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{title}</h1>
        {mode === "in" || mode === "create" ? (
          <div className="seg" role="tablist" aria-label="Sign in or create an account">
            <button role="tab" aria-selected={mode === "in"} onClick={() => { setMode("in"); setError(null); }}>Sign in</button>
            <button role="tab" aria-selected={mode === "create"} onClick={() => { setMode("create"); setError(null); }}>Create account</button>
          </div>
        ) : null}

        <form className="stack g14" onSubmit={submit} id="auth-form">
          {mode === "create" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div className="field"><label className="label" htmlFor="first">First name</label><input id="first" name="first" className="input" autoComplete="given-name" required /></div>
              <div className="field"><label className="label" htmlFor="last">Last name</label><input id="last" name="last" className="input" autoComplete="family-name" required /></div>
            </div>
          ) : null}
          {mode !== "reset" ? (
            <div className="field"><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" inputMode="email" className="input" autoComplete="email" placeholder="you@example.com" required /></div>
          ) : null}
          {mode !== "forgot" ? (
            <div className="field">
              <div className="row between"><label className="label" htmlFor="pw">{mode === "in" ? "Password" : mode === "create" ? "Create a password" : "New password"}</label>
                {mode === "in" ? <button type="button" className="small" style={{ background: "none", border: 0, color: "var(--link)", fontWeight: 600, cursor: "pointer", minHeight: 32 }} onClick={() => { setMode("forgot"); setError(null); }}>Forgot?</button> : null}</div>
              <PasswordInput id="pw" name="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={mode === "in" ? undefined : 8} placeholder={mode === "in" ? undefined : "At least 8 characters"} required />
            </div>
          ) : null}
          {error ? <p className="small" role="alert" style={{ color: "#ff8a80" }}>{error}</p> : null}
          <button className="btn btn-primary" disabled={busy}>{busy ? "One moment…" : mode === "in" ? "Sign in" : mode === "create" ? "Create account" : mode === "forgot" ? "Email me a reset link" : "Save new password"}</button>
          {mode === "forgot" ? <button type="button" className="small" style={{ background: "none", border: 0, color: "var(--link)", fontWeight: 600, cursor: "pointer", minHeight: 44 }} onClick={() => setMode("in")}>Back to sign in</button> : null}
        </form>

        {mode === "in" ? (
          <>
            <div className="row g12"><div style={{ flex: 1, height: 1, background: "var(--line)" }} /><span className="muted small">or</span><div style={{ flex: 1, height: 1, background: "var(--line)" }} /></div>
            <button className="btn btn-secondary" disabled={busy} onClick={() => magicLink(document.getElementById("auth-form") as HTMLFormElement)}><IconMail size={18} />Email me a sign-in link</button>
            <p className="muted small" style={{ textAlign: "center" }}>No password to remember. Enter your email above, then tap this.</p>
          </>
        ) : mode === "create" ? (
          <div className="card stack g8" style={{ padding: 16 }}>
            <b style={{ fontWeight: 600 }}>Tip</b>
            <p className="muted small">You don&rsquo;t need an account to RSVP, just your name and email. You&rsquo;ll need one to watch.</p>
            <Link href="/" className="small" style={{ fontWeight: 600 }}>See what&rsquo;s showing</Link>
          </div>
        ) : null}
        <p className="muted tiny" style={{ lineHeight: 1.6 }}>We will not, in any circumstances, share your personal information with other individuals or organizations, except when required by law.</p>
      </div>
    </div>
  );
}
