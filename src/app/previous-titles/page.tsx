import PastTitlesBrowser from "@/components/PastTitlesBrowser";
import { pastTitles } from "@/lib/data";

import { share } from "@/lib/share";
export const metadata = share({ title: "Previous Titles", description: "Films and series Slipstream has screened, with the filmmaker conversations.", path: "/previous-titles/" });

export default function PreviousTitles() {
  const titles = pastTitles();
  const count = new Set(titles.map((t) => t.slug)).size;
  return (
    <div className="wrap section stack g20" style={{ paddingTop: 28 }}>
      <div className="stack g10"><h1 className="h1">Previous Titles</h1>
        <p className="muted">{count} films and series Slipstream has screened. Search, or filter by type and year.</p></div>
      <PastTitlesBrowser titles={titles} />
    </div>
  );
}
