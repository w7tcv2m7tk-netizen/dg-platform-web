import { PlatformFeaturePageGate } from "@/components/platform/PlatformFeaturePageGate";

export default function ConsultationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformFeaturePageGate featureId="crm.opportunities.read" label="CRM consultations">
      {children}
    </PlatformFeaturePageGate>
  );
}
