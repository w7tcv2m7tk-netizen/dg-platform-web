import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function ReportsPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Intelligence · Reports"
      title="Reports"
      summary="Decision-oriented reporting across the business — not a dump of every metric."
      body="Analytics remains the Growth App for KPI tooling. Reports under Intelligence are the curated decision pack. Use Analytics today; this surface deepens as Decision Intelligence matures."
      primaryHref="/apps/analytics"
      primaryLabel="Open Analytics →"
      secondaryHref="/dashboard"
      secondaryLabel="Overview"
    />
  );
}
