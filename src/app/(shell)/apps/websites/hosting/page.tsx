import Link from "next/link";

import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default function HostingStubPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Hosting</h1>
        <p className="text-sm text-slate-400">
          DG Hosting · SSL · CDN — productized later
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <WebsitesSubnav active="hosting" />
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 max-w-xl space-y-3">
          <p className="text-slate-300 text-sm">
            Full DG hosting/SSL productization is out of this MVP. Published sites
            render on the platform Next.js path until dedicated hosting lands.
          </p>
          <Link href="/apps/websites" className="text-sm underline text-slate-300">
            ← Sites
          </Link>
        </div>
      </main>
    </>
  );
}
