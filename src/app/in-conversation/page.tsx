import ConversationArchive from "@/components/ConversationArchive";
import { allConversations } from "@/lib/data";

export const metadata = { title: "In conversation", description: "Talks with the people who made the shows." };

export default function InConversation() {
  const all = allConversations();
  return (
    <div className="wrap section stack g20" style={{ paddingTop: 28 }}>
      <div className="stack g10" style={{ maxWidth: 760 }}>
        <h1 className="h1">In conversation</h1>
        <p className="muted">{all.length} talks with the people who made the shows. Every one plays on tap.</p>
      </div>
      <ConversationArchive items={all} />
    </div>
  );
}
