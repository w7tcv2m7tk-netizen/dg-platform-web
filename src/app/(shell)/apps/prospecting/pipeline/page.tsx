import Link from "next/link";

import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";

export default function ProspectingPipelinePage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-slate-400">
          Track prospects through the sales process before and after CRM conversion.
        </p>
        <ProspectingSubnav active="/apps/prospecting/pipeline" />
      </header>
      <main className="dg-page-main">
        <div className="dg-card space-y-3">
          <p className="text-sm text-slate-300">
            Prospecting pipeline stages feed qualified deals into CRM Opportunities — one
            ecosystem, not a siloed prospecting database.
          </p>
          <p className="text-sm text-slate-500">
            Staff pipeline:{" "}
            <Link
              href="/command/growth-engine/pipeline"
              className="text-sky-400 hover:underline"
            >
              Command Centre · Pipeline
            </Link>
            {" · "}
            <Link href="/apps/crm/opportunities" className="text-sky-400 hover:underline">
              CRM Opportunities
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
