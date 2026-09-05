import Link from "next/link";

import { BusinessHealthDashboard } from "@/components/intelligence/BusinessHealthDashboard";
import { loadBusinessHealthPageData } from "@/lib/business-health-page-data";

export default async function BusinessHealthPage() {
  const data = await loadBusinessHealthPageData();

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
            Business · Health
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Business Health</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to monitor your business vital signs.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
          Business · Health
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Health</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Know the health of your business at a glance — and understand what needs attention before
          it becomes a problem.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/benchmarks" className="text-sky-400 hover:underline">
            Benchmarks →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            AI Advisor →
          </Link>
          <Link href="/dashboard" className="text-sky-400 hover:underline">
            Overview →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        <BusinessHealthDashboard data={data} />
      </main>
    </>
  );
}
