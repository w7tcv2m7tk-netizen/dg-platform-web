import Link from "next/link";

import { PartnerEcosystemOverview } from "@/components/command/PartnerEcosystemContent";

export default function PartnerEcosystemPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/partners" className="text-sm text-sky-400 hover:underline">
          ← Partner Programme
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Partners
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Partner Ecosystem</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          DigitalGate owns the platform. Partners extend acquisition, implementation and
          optimisation — never a generic reseller free-for-all.
        </p>
      </header>
      <main className="dg-page-main">
        <PartnerEcosystemOverview />
      </main>
    </>
  );
}
