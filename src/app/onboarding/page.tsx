import { redirect } from "next/navigation";

/** Onboarding lives on Apps & plan — keep this route as a redirect. */
export default function OnboardingPage() {
  redirect("/dashboard/apps#onboarding");
}
