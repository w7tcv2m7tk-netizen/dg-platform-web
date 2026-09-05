import Link from "next/link";
import { Suspense } from "react";

import { BusinessBenchmarksDashboard } from "@/components/intelligence/BusinessBenchmarksDashboard";
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
        <Suspense fallback={null}>
          <BusinessBenchmarksDashboard data={data} />
        </Suspense>
      </main>
    </>
  );
}
