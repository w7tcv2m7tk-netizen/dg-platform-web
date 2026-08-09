import { redirect } from "next/navigation";

/** Onboarding lives on Apps & Plan — keep this route as a redirect. */
export default function OnboardingPage() {
  redirect("/dashboard/business");
}
