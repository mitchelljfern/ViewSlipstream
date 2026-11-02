import ArchiveGrid from "@/components/ArchiveGrid";
import { archiveGroups } from "@/lib/data";

import { share } from "@/lib/share";
export const metadata = share({ title: "Previous Titles", description: "Films and series Slipstream has screened, with the filmmaker conversations.", path: "/previous-titles/" });

export default function PreviousTitles() {
  const groups = archiveGroups();
  return (
    <div className="wrap section stack g20" style={{ paddingTop: 28 }}>
      <div className="stack g10"><h1 className="h1">Previous Titles</h1>
        <p className="muted">{groups.reduce((n, g) => n + g.items.length, 0)} titles across {groups.length} programs.</p></div>
      <ArchiveGrid groups={groups} />
    </div>
  );
}
