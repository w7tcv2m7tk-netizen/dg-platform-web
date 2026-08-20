import { PartnersAdminNav } from "@/components/command/PartnersAdminNav";
import { PartnerEcosystemOverview } from "@/components/command/PartnerEcosystemContent";

export default function PartnerEcosystemPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Partner Ecosystem</h1>
        <p className="mt-1 text-sm text-slate-400">
          Acquisition, implementation, specialists and success — not one generic reseller role.
        </p>
      </header>
      <PartnersAdminNav active="ecosystem" />
      <PartnerEcosystemOverview />
    </div>
  );
}
