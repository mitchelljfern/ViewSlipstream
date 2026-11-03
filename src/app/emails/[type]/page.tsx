import { Suspense } from "react";
import EmailPreview, { type EmailType } from "@/components/EmailPreview";

export const dynamicParams = false;
export const generateStaticParams = () => ["rsvp", "live", "thanks", "waitlist"].map((type) => ({ type }));
export const metadata = { title: "Email preview", robots: { index: false } };

export default async function EmailPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return <Suspense><EmailPreview type={type as EmailType} /></Suspense>;
}
