import { Suspense } from "react";
import SignInView from "@/components/SignInView";

import { share } from "@/lib/share";
export const metadata = share({ title: "Sign in", path: "/sign-in/" });

export default function SignIn() {
  return <Suspense><SignInView /></Suspense>;
}
