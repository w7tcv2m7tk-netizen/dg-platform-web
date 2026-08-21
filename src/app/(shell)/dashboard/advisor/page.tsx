import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function AiAdvisorPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Intelligence · AI Advisor"
      title="AI Advisor"
      summary="Turn Business Brain context into decisions — what should I do next?"
      body="Advisor reads live Twin signals, Goals, and Business Brain context. Command Centre remains the daily home for briefing and recommended actions while this surface deepens explanation."
      primaryHref="/dashboard"
      primaryLabel="Open Command Centre →"
      secondaryHref="/dashboard/brain"
      secondaryLabel="Open Business Brain"
    />
  );
}
