import { PartnersAdminNav } from "@/components/command/PartnersAdminNav";
import { FoundingResellerBriefingRunSheet } from "@/components/command/FoundingResellerBriefingRunSheet";

export default function PartnerBriefingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Founding Reseller briefing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Monday partner meeting run-sheet — for Ben. Partners see the playbook at /partner/playbook.
        </p>
      </header>
      <PartnersAdminNav active="briefing" />
      <FoundingResellerBriefingRunSheet />
    </div>
  );
}
