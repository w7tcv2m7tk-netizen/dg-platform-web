import { PlatformFeaturePageGate } from "@/components/platform/PlatformFeaturePageGate";

export default function OpportunitiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformFeaturePageGate featureId="crm.opportunities.read" label="CRM opportunities">
      {children}
    </PlatformFeaturePageGate>
  );
}
