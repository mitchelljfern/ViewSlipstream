import HomeView from "@/components/HomeView";
import { allConversations, allShows, featuredGroups } from "@/lib/data";

export default function Home() {
  return <HomeView groups={featuredGroups()} conversations={allConversations()} allShows={allShows()} />;
}
