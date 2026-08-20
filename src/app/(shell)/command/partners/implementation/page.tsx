import { PartnersAdminNav } from "@/components/command/PartnersAdminNav";
import { ImplementationPartnerProgramme } from "@/components/command/PartnerEcosystemContent";

export default function ImplementationPartnersPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
          Partners
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">Implementation Partners</h1>
        <p className="mt-1 text-sm text-slate-400">
          Founding wave: Head of Implementation builds the system first. 2–3 certified partners.
          Invitation only. Not public marketplace yet.
        </p>
      </header>
      <PartnersAdminNav active="implementation" />
      <ImplementationPartnerProgramme />
    </div>
  );
}
