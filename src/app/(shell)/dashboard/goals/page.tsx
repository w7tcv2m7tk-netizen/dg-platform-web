import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function GoalsPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Business · Goals"
      title="Goals"
      summary="Targets that feed AI Advisor, Business Health and Opportunity ranking."
      body="Goals are part of the Intelligent Layer model so “what should I do next?” has a target. This surface will let you set and track business goals — it is not a Founding 10 blocker while Overview and Opportunities deepen first."
      primaryHref="/dashboard"
      primaryLabel="Back to Overview →"
      secondaryHref="/apps/opportunities"
      secondaryLabel="Open Opportunities"
    />
  );
}
