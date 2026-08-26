import { PartnerEcosystemOverview } from "@/components/command/PartnerEcosystemContent";

export default function PartnerEcosystemPage() {
  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Partner Ecosystem</h1>
        <p className="mt-1 text-sm text-slate-400">
          Acquisition, implementation, specialists and success — not one generic reseller role.
        </p>
      </header>
      <main className="dg-page-main">
        <PartnerEcosystemOverview />
      </main>
    </>
  );
}
