"use client";
/** /now-showing/ always lands on whatever the current program is. */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePreview } from "@/components/Preview";

export default function NowShowing() {
  const { leadSlug } = usePreview();
  const router = useRouter();
  useEffect(() => { router.replace(leadSlug ? `/${leadSlug}/` : "/"); }, [leadSlug, router]);
  return <div className="wrap section"><p className="muted">Taking you to the current program…</p></div>;
}
