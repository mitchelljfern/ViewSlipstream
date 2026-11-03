"use client";
import PasswordInput from "./PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { usePreview } from "./Preview";
import { allShows } from "@/lib/data";
import { IconMail } from "./Icons";

export default function SignInView() {
  const ctx = usePreview();
  const params = useSearchParams();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "create">(params.get("mode") === "create" ? "create" : "in");
  const [linkSent, setLinkSent] = useState(false);
  const next = params.get("next");
  const nextShow = next ? allShows().find((s) => next.includes(`/${s.slug}/`)) : undefined;

  const done = (first: string, last: string, email: string) => {
    ctx.signIn({ first: first || "Alex", last: last || "Rivera", email });
    ctx.say(mode === "create" ? "Account created" : "Signed in");
    router.push(next && next.startsWith("/") ? `${next}#rsvp` : "/account/");
  };

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 24, maxWidth: 520 }}>
      <div className="stack g20">
        {nextShow ? (
          <div className="card row g12" style={{ padding: 12 }}>
            <img src={nextShow.poster} alt="" style={{ width: 48, height: 72, objectFit: "cover", borderRadius: 8, flex: "0 0 auto" }} />
            <div className="stack g4"><span className="eyebrow">Sign in to RSVP</span><b style={{ fontWeight: 600, lineHeight: 1.3 }}>{nextShow.title}</b><span className="muted small">We'll bring you right back.</span></div>
          </div>
        ) : null}
        <h1 className="h1" style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>{mode === "in" ? "Welcome back" : "Create your account"}</h1>
        <div className="seg" role="tablist" aria-label="Sign in or create an account">
          <button role="tab" aria-selected={mode === "in"} onClick={() => setMode("in")}>Sign in</button>
          <button role="tab" aria-selected={mode === "create"} onClick={() => setMode("create")}>Create account</button>
        </div>

        <form className="stack g14" onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const email = String(f.get("email") || "");
          done(String(f.get("first") || email.split("@")[0] || ""), String(f.get("last") || ""), email);
        }}>
          {mode === "create" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div className="field"><label className="label" htmlFor="first">First name</label><input id="first" name="first" className="input" autoComplete="given-name" required /></div>
              <div className="field"><label className="label" htmlFor="last">Last name</label><input id="last" name="last" className="input" autoComplete="family-name" required /></div>
            </div>
          ) : null}
          <div className="field"><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" inputMode="email" className="input" autoComplete="email" placeholder="you@example.com" required /></div>
          <div className="field">
            <div className="row between"><label className="label" htmlFor="pw">{mode === "create" ? "Create a password" : "Password"}</label>
              {mode === "in" ? <button type="button" className="small" style={{ background: "none", border: 0, color: "var(--link)", fontWeight: 600, cursor: "pointer" }} onClick={() => ctx.say("Review build: a reset link would be emailed here.")}>Forgot?</button> : null}</div>
            <PasswordInput id="pw" name="password" autoComplete={mode === "create" ? "new-password" : "current-password"} minLength={mode === "create" ? 8 : undefined} required />
          </div>
          {mode === "in" ? <label className="check"><input type="checkbox" defaultChecked />Keep me signed in on this device</label> : null}
          <button className="btn btn-primary">{mode === "in" ? "Sign in" : "Create account"}</button>
        </form>

        {mode === "in" ? (
          <>
            <div className="row g12"><div style={{ flex: 1, height: 1, background: "var(--line)" }} /><span className="muted small">or</span><div style={{ flex: 1, height: 1, background: "var(--line)" }} /></div>
            <button className="btn btn-secondary" onClick={() => setLinkSent(true)}><IconMail size={18} />{linkSent ? "Check your email" : "Email me a sign-in link"}</button>
            <p className="muted small" style={{ textAlign: "center" }}>No password to remember. The link works once and expires in 15 minutes.</p>
          </>
        ) : (
          <div className="card stack g8" style={{ padding: 16 }}>
            <b style={{ fontWeight: 600 }}>Tip</b>
            <p className="muted small">You can also just RSVP to a show: your free account is created in the same step.</p>
            <Link href="/" className="small" style={{ fontWeight: 600 }}>See what's showing</Link>
          </div>
        )}
        <p className="muted tiny" style={{ lineHeight: 1.6 }}>We will not, in any circumstances, share your personal information with other individuals or organizations, except when required by law.</p>
      </div>
    </div>
  );
}
