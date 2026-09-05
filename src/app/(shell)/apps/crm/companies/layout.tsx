import { PlatformFeaturePageGate } from "@/components/platform/PlatformFeaturePageGate";

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformFeaturePageGate featureId="crm.companies.read" label="CRM companies">
      {children}
    </PlatformFeaturePageGate>
  );
}
