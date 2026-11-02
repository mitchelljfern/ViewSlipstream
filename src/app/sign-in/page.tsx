import { Suspense } from "react";
import SignInView from "@/components/SignInView";

export const metadata = { title: "Sign in" };

export default function SignIn() {
  return <Suspense><SignInView /></Suspense>;
}
