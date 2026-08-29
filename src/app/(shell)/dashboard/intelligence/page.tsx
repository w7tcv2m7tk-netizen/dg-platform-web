import { redirect } from "next/navigation";

/**
 * Legacy Intelligence hub — operator surfaces now live under CORE → Business.
 * Capability architecture (Twin, Brain, Health, Advisor, …) is unchanged.
 */
export default function IntelligenceOverviewRedirectPage() {
  redirect("/dashboard");
}
