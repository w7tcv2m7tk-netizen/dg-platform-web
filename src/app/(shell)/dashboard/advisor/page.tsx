import Link from "next/link";

import { AiAdvisorDashboard } from "@/components/intelligence/AiAdvisorDashboard";
import { loadAdvisorPageData } from "@/lib/advisor-page-data";

export default async function AiAdvisorPage() {
  const data = await loadAdvisorPageData();

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Business · Advisor
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">AI Advisor</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to think with DigitalGate.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
          Business · Advisor
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">AI Advisor</h1>
        <p className="mt-1 text-base font-medium text-violet-100/90">
          Turn Business Brain context and live business signals into decisions.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          DigitalGate&apos;s Advisor understands the business through its Digital Twin, Business
          Brain, Goals, connected systems, Business Health and live activity — then helps determine
          what matters, why it matters and what to do next.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/dashboard" className="text-sky-400 hover:underline">
            Open Command Centre →
          </Link>
          <Link href="/dashboard/brain" className="text-sky-400 hover:underline">
            Explore Business Brain →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        <AiAdvisorDashboard data={data} />
      </main>
    </>
  );
}
