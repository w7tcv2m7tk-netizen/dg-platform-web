import Link from "next/link";

import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";

export default function ProspectingProspectsPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Prospects</h1>
        <p className="text-sm text-slate-400">
          Target businesses organised for outreach — promote to CRM when qualified.
        </p>
        <ProspectingSubnav active="/apps/prospecting/prospects" />
      </header>
      <main className="dg-page-main">
        <div className="dg-card space-y-3">
          <p className="text-sm text-slate-300">
            Prospect lists and enrichment live in the Prospecting & Opportunity Engine. Import
            from Discovery, score, then convert into Contacts and Opportunities.
          </p>
          <p className="text-sm text-slate-500">
            DigitalGate staff GTM list:{" "}
            <Link href="/command/growth-engine" className="text-sky-400 hover:underline">
              Command Centre · Prospecting
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
