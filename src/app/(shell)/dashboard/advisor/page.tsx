import Link from "next/link";

import { AiAdvisorDashboard } from "@/components/intelligence/AiAdvisorDashboard";
import { loadAdvisorPageData } from "@/lib/advisor-page-data";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export default async function AiAdvisorPage() {
  await ensureOrganisationOnboardingSync();
  const data = await loadAdvisorPageData();

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
            Intelligence · AI Advisor
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
          Intelligence · AI Advisor
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">AI Advisor</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Turn your Business Brain into better decisions. Advisor brings together your Business
          Brain, Digital Twin, Goals, Business Health, Benchmarks, and live activity to help you
          understand what is happening, why it matters, and what you should do next.
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
