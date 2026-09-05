import { PlatformFeaturePageGate } from "@/components/platform/PlatformFeaturePageGate";

export default function ContactsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformFeaturePageGate featureId="crm.contacts.read" label="CRM contacts">
      {children}
    </PlatformFeaturePageGate>
  );
}
