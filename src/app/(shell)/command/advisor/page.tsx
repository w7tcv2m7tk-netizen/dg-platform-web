import Link from "next/link";
import { getClientIntelligence } from "@dg/platform-core";

import { AiAdvisorPanel } from "@/components/command/AiAdvisorPanel";

interface PageProps {
  searchParams: Promise<{ org?: string }>;
}

export default async function CommandAdvisorPage({ searchParams }: PageProps) {
  const { org } = await searchParams;
  const data = process.env.DATABASE_URL ? await getClientIntelligence() : null;
  const orgs =
    data?.clients.map((c) => ({
      organisationId: c.organisationId,
      organisationName: c.organisationName,
      successScore: c.successScore,
      scoreProvisional: c.scoreProvisional,
      needsAttention: c.needsAttention,
    })) ?? [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-violet-400">
          DigitalGate · Operator OS
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">AI Advisor</h1>
        <p className="mt-1 text-base font-medium text-violet-100/90">
          Turn Customer Intelligence and live platform signals into decisions.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          DigitalGate&apos;s Advisor understands each organisation through Organisation Health,
          connectors, billing and live activity — then helps the team determine what matters, why it
          matters and what to do next.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — advisor unavailable.
          </div>
        ) : (
          <AiAdvisorPanel orgs={orgs} initialOrgId={org} />
        )}
      </main>
    </>
  );
}
