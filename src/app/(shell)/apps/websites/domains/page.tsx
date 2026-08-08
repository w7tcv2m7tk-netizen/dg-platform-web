import Link from "next/link";

import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default function DomainsStubPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Domains</h1>
        <p className="text-sm text-slate-400">
          Custom domains · DG DNS — productized later
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <WebsitesSubnav active="domains" />
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 max-w-xl space-y-3">
          <p className="text-slate-300 text-sm">
            Domains / DG DNS / auto-SSL ship after the native builder MVP. For now,
            preview and publish on <code className="text-slate-200">/sites/[slug]</code>.
          </p>
          <p className="text-slate-500 text-sm">
            WordPress migration cutover uses this surface to point DNS at DG
            hosting once dual-run is complete.
          </p>
          <Link href="/apps/websites" className="text-sm underline text-slate-300">
            ← Sites
          </Link>
        </div>
      </main>
    </>
  );
}
