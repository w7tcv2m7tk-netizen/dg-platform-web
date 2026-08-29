import Link from "next/link";

import { DigitalTwinDashboard } from "@/components/intelligence/DigitalTwinDashboard";
import { loadDigitalTwinPageData } from "@/lib/twin-page-data";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export default async function DigitalTwinPage() {
  await ensureOrganisationOnboardingSync();
  const data = await loadDigitalTwinPageData();

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
            Business · Digital Twin
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Digital Twin</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to view your live Digital Twin.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
          Business · Digital Twin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Digital Twin</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The live digital state of your business — what is happening right now. Business Profile is
          what you edit; the Twin is what DigitalGate, Health, Benchmarks, and Advisor read.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/business" className="text-sky-400 hover:underline">
            Business Profile →
          </Link>
          <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
            Business Brain →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            AI Advisor →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        <DigitalTwinDashboard data={data} />
      </main>
    </>
  );
}
