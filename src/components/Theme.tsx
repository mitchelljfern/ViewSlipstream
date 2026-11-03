"use client";
/**
 * Dark and light themes. Dark is the Slipstream default; the sun/moon
 * button in the header switches to light and the choice is remembered in
 * this browser. The stylesheet reads html[data-theme="light"].
 */
import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./Icons";

export const THEME_KEY = "slipstream-theme";
type Theme = "dark" | "light";

/** Runs before anything paints, so a saved light theme never flashes dark first. */
export function ThemeScript() {
  const js = `try{if(localStorage.getItem("${THEME_KEY}")==="light")document.documentElement.setAttribute("data-theme","light")}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

function apply(theme: Theme) {
  if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage blocked: the choice lasts this page view */ }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => { setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"); }, []);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="icon-btn theme-toggle" onClick={() => { setTheme(next); apply(next); }}
      aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
    </button>
  );
}
