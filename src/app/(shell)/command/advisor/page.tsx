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
        <h1 className="text-2xl font-bold text-white">AI Advisor</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Help me understand what to do — intelligence over Priorities and Alerts. From Portfolio,
          use Advise to open this Advisor with a customer already selected.
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
