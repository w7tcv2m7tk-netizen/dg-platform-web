import { IntelligenceSurfacePage } from "@/components/platform/IntelligenceSurfacePage";

export default function BenchmarksPage() {
  return (
    <IntelligenceSurfacePage
      eyebrow="Intelligence · Benchmarks"
      title="Benchmarks"
      summary="Compare your business against relevant cohorts when enough anonymised network data exists."
      body="Benchmarks belong under Intelligence, not Marketplace. Cohort comparisons ship when privacy floors and sample sizes allow — until then this is the reserved nav home."
      primaryHref="/dashboard"
      primaryLabel="Back to Overview →"
      secondaryHref="/apps/analytics"
      secondaryLabel="Open Analytics"
    />
  );
}
