import Link from "next/link";

import { BusinessBrainDashboard } from "@/components/intelligence/BusinessBrainDashboard";
import { loadBusinessBrainPageData } from "@/lib/brain-page-data";

export default async function BusinessBrainPage() {
  const data = await loadBusinessBrainPageData();

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-sky-400/90">
            Business · Business Brain
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Business Brain</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to view your Business Brain.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-sky-400/90">
          Business · Business Brain
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Brain</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          How does your business work? Business Brain interprets your profile, Business Knowledge,
          connectors and live Twin data — distinct from DigitalGate&apos;s Platform Docs.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/twin" className="text-sky-400 hover:underline">
            Digital Twin →
          </Link>
          <Link href="/dashboard/business" className="text-sky-400 hover:underline">
            Business Profile →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            AI Advisor →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        <BusinessBrainDashboard data={data} />
      </main>
    </>
  );
}
