import { redirect } from "next/navigation";

/** Compatibility route: customer implementation onboarding is owned by Delivery. */
export default function PartnerOnboardingRedirectPage() {
  redirect("/command/delivery/onboarding");
}
