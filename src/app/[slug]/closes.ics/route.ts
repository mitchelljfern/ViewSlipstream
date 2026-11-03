import { calendarFileResponse, calendarFileSlugs } from "@/lib/ics-route";

export const dynamic = "force-static";
export const dynamicParams = false;
export const generateStaticParams = () => calendarFileSlugs("end").map((slug) => ({ slug }));

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return calendarFileResponse((await params).slug, "end");
}
