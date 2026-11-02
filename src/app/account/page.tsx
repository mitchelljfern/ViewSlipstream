import AccountView from "@/components/AccountView";
import { share } from "@/lib/share";
export const metadata = { ...share({ title: "Your account", path: "/account/" }), robots: { index: false } };
export default function Account() { return <AccountView />; }
