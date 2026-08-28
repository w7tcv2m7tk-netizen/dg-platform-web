import { redirect } from "next/navigation";

/**
 * Onboarding is not a top-level Delivery section.
 * Early acceptance / kick-off / discovery sit inside the Implementation Lifecycle™,
 * documented under Implementation Plans.
 */
export default function StaffDeliveryOnboardingRedirect() {
  redirect("/command/delivery/plans");
}
