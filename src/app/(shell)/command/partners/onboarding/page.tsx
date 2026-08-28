import { CustomerOnboardingWorkflow } from "@/components/command/PartnerEcosystemContent";

export default function PartnerOnboardingPage() {
  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Customer onboarding</h1>
        <p className="mt-1 text-sm text-slate-400">
          Standard 15-stage implementation framework — every customer follows this lifecycle.
          DigitalGate or a Certified Delivery Partner delivers; resellers do not.
        </p>
      </header>
      <main className="dg-page-main">
        <CustomerOnboardingWorkflow />
      </main>
    </>
  );
}
