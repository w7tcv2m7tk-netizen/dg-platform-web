import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function AiAdvisorPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Intelligence · AI Advisor"
      title="AI Advisor"
      summary="Customer-facing “what should I do next?” — Recommended Actions grounded in your Twin and Goals."
      body="Advisor deepens on Overview and Opportunities first. This nav item establishes Intelligence as the home for decision support — not another App SKU."
      primaryHref="/dashboard"
      primaryLabel="Open Overview →"
      secondaryHref="/apps/opportunities"
      secondaryLabel="Open Opportunities"
    />
  );
}
