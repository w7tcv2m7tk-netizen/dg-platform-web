import Link from "next/link";

import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default function FunnelsStubPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Funnels</h1>
        <p className="text-sm text-slate-400">
          Conversion paths — planned after Studio + CRM forms
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <WebsitesSubnav active="funnels" />
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 max-w-xl space-y-3">
          <p className="text-sm text-slate-300">
            Funnel builder is not in this demo slice. Contact forms already
            capture into CRM from published pages — use Studio → Contact form,
            then track leads in CRM.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/apps/websites" className="text-sm text-sky-400 hover:underline">
              ← Sites
            </Link>
            <Link href="/apps/crm" className="text-sm text-slate-400 hover:underline">
              CRM →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
