import { PlatformFeaturePageGate } from "@/components/platform/PlatformFeaturePageGate";

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformFeaturePageGate featureId="crm.tasks.read" label="CRM tasks">
      {children}
    </PlatformFeaturePageGate>
  );
}
