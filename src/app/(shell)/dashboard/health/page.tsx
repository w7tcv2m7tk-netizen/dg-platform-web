import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function BusinessHealthPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Intelligence · Business Health"
      title="Business Health"
      summary="Predictive health across revenue, pipeline, marketing, website, reputation and operations."
      body="Business Health Score™ already surfaces on Overview. This Intelligence entry point deepens health as a first-class decision surface — distinct from the Overview home, even while they share live signals today."
      primaryHref="/dashboard"
      primaryLabel="View health on Overview →"
    />
  );
}
