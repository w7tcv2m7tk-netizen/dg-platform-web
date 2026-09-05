import { PlatformFeaturePageGate } from "@/components/platform/PlatformFeaturePageGate";

export default function TimelineLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformFeaturePageGate featureId="crm.timeline.read" label="CRM timeline">
      {children}
    </PlatformFeaturePageGate>
  );
}
