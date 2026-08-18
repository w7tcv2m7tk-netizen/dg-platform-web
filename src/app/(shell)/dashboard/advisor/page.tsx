import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function AiAdvisorPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Intelligence · AI Advisor"
      title="AI Advisor"
      summary="Customer-facing “what should I do next?” — Recommended Actions grounded in your Twin and Goals."
      body="Advisor already reads live Twin signals and the goals you set under Business → Goals. Overview remains the daily home for briefing and recommended actions while this surface deepens."
      primaryHref="/dashboard"
      primaryLabel="Open Overview →"
      secondaryHref="/dashboard/goals"
      secondaryLabel="Set Goals"
    />
  );
}
