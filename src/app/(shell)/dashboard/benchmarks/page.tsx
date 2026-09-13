import Link from "next/link";
import { Suspense } from "react";

import { BusinessBenchmarksDashboard } from "@/components/intelligence/BusinessBenchmarksDashboard";
import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { loadBusinessBenchmarksPageData } from "@/lib/benchmarks-page-data";

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const { group } = await searchParams;
  const data = await loadBusinessBenchmarksPageData(group);

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-400">
            Business · Benchmarks
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Business Benchmarks</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to see how your business compares.</p>
        </main>
      </>
    );
  }

  const hasOpportunities = data.opportunities.length > 0;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400">
          Business · Benchmarks
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Benchmarks</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          See how your business compares with similar businesses — and discover where your biggest
          opportunities are.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            AI Advisor →
          </Link>
          <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
            Business Brain →
          </Link>
          <Link href="/dashboard/health" className="text-sky-400 hover:underline">
            Business Health →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        {!data.scoresLive ? (
          <section className="mb-6 rounded-xl border border-blue-500/25 bg-blue-500/5 px-5 py-4">
            <p className="font-medium text-blue-100">Benchmark evidence is incomplete</p>
            <p className="mt-1 text-sm text-slate-400">
              DigitalGate needs more connected business data before every comparison can be treated as
              live evidence. Connect the missing sources or ask Advisor what will improve coverage fastest.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ResolutionAction
                href="/dashboard/settings/connectors"
                mode="guided"
                label="Connect missing data"
              />
              <ResolutionAction
                href="/dashboard/advisor"
                mode="guided"
                label="Help me improve coverage"
              />
            </div>
          </section>
        ) : null}

        {hasOpportunities ? (
          <section className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
            <p className="font-medium text-amber-100">
              DigitalGate found {data.opportunities.length} benchmark opportunit{data.opportunities.length === 1 ? "y" : "ies"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              These are evidence-backed areas where your business is trailing the selected comparison group.
              Advisor can prioritise the next action and direct you to the right app or setting.
            </p>
            <ResolutionAction
              href="/dashboard/advisor"
              mode="guided"
              label="Show me what to fix first"
              className="mt-4"
            />
          </section>
        ) : null}

        <Suspense fallback={null}>
          <BusinessBenchmarksDashboard data={data} />
        </Suspense>
      </main>
    </>
  );
}
