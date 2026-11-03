"use client";
/** A password field with an eye button to show or hide what's typed. Used everywhere a password is entered. */
import { useState } from "react";
import { IconEye, IconEyeOff } from "./Icons";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & { onDeep?: boolean };

export default function PasswordInput({ onDeep, style, ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input {...rest} type={show ? "text" : "password"} className="input" style={{ ...style, paddingRight: 52 }} />
      <button type="button" className="icon-btn" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        onClick={() => setShow((v) => !v)}
        style={{ position: "absolute", right: 4, top: 4, color: onDeep ? "rgba(255,255,255,.8)" : "var(--muted)" }}>
        {show ? <IconEyeOff size={20} /> : <IconEye size={20} />}
      </button>
    </div>
  );
}
