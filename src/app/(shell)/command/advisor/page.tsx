import Link from "next/link";
import { getClientIntelligence } from "@dg/platform-core";

import { AiAdvisorPanel } from "@/components/command/AiAdvisorPanel";
import { CommandCentreNav } from "@/components/command/CommandCentreNav";

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
    })) ?? [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">AI Business Advisor</h1>
        <p className="mt-1 text-sm text-slate-400">
          Staff insights from Success Score™, CRM, connectors, and billing — LLM when configured.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="advisor" />
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
