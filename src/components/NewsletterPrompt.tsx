"use client";
/**
 * Newsletter card in the bottom corner. Not a modal: it slides in after a
 * short while, never covers the content, and one tap on the X puts it away
 * for a month. Joining puts it away for good. Review build: the address
 * goes nowhere yet; phase 2 wires this to the mailing list.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePreview } from "./Preview";
import { IconClose } from "./Icons";

const KEY = "slipstream-newsletter-v1";
const DELAY_MS = 8000;
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
interface Saved { closedAt?: number; joined?: boolean }

const remember = (v: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

export default function NewsletterPrompt() {
  const path = usePathname();
  const { say } = usePreview();
  const [open, setOpen] = useState(false);
  // Pages where someone is busy with a form or a task: leave them alone.
  const quiet = ["/sign-in", "/account", "/review", "/emails"].some((p) => path.startsWith(p));

  useEffect(() => {
    if (quiet) return;
    let saved: Saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { /* ignore */ }
    if (saved.joined) return;
    if (saved.closedAt && Date.now() - saved.closedAt < SNOOZE_MS) return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, [quiet]);

  const close = () => { setOpen(false); remember({ closedAt: Date.now() }); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || quiet) return null;
  return (
    <aside className="nl-card" aria-label="Newsletter">
      <button type="button" className="icon-btn nl-close" aria-label="Close" onClick={close}><IconClose size={18} /></button>
      <h2 className="h3">Hear about the next show first</h2>
      <p className="muted small">Screenings, filmmaker conversations and giveaways. Once or twice a month.</p>
      <form onSubmit={(e) => { e.preventDefault(); setOpen(false); remember({ joined: true }); say("Thanks. You're on the list (review build: nothing was sent)."); }}>
        <label className="sr-only" htmlFor="nl-pop">Email address</label>
        <input id="nl-pop" className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required />
        <button className="btn btn-primary">Join</button>
      </form>
    </aside>
  );
}
