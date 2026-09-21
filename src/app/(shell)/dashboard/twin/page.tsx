import Link from "next/link";

import { DigitalTwinDashboard } from "@/components/intelligence/DigitalTwinDashboard";
import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { loadDigitalTwinPageData } from "@/lib/twin-page-data";

export default async function DigitalTwinPage() {
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

  const needsMoreContext = !data.scoresLive || data.overallCompleteness < 75;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
          Business · Digital Twin
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Digital Twin</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The live digital state of your business — what is happening right now. Business Profile is
          what you edit; the Twin is what DigitalGate, Health, Benchmarks and Aida read.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard/business" className="text-sky-400 hover:underline">
            Business Profile →
          </Link>
          <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
            Business Brain →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            Ask Aida →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        {needsMoreContext ? (
          <section className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-4">
            <p className="font-medium text-amber-100">Your Digital Twin can be improved</p>
            <p className="mt-1 text-sm text-slate-400">
              DigitalGate has identified missing or incomplete business context. Add the missing data
              or ask Aida to guide you to the most useful next fix.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ResolutionAction
                href="/dashboard/settings/connectors"
                mode="guided"
                label="Fix connected data"
              />
              <ResolutionAction
                href="/dashboard/business"
                mode="guided"
                label="Complete Business Profile"
              />
              <ResolutionAction
                href="/dashboard/advisor"
                mode="guided"
                label="Help me improve this"
              />
            </div>
          </section>
        ) : null}
        <DigitalTwinDashboard data={data} />
      </main>
    </>
  );
}
