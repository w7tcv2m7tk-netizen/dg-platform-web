import { PartnersAdminNav } from "@/components/command/PartnersAdminNav";
import { DeliveryOperatingModel } from "@/components/command/PartnerEcosystemContent";

export default function PartnerDeliveryPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Delivery operating model</h1>
        <p className="mt-1 text-sm text-slate-400">
          Hub-and-spoke: resellers introduce, DigitalGate closes, Head of Implementation owns the
          standard, Delivery Team provides scalable capacity. Customer relationship stays with
          DigitalGate.
        </p>
      </header>
      <PartnersAdminNav active="operating-model" />
      <DeliveryOperatingModel />
    </div>
  );
}
