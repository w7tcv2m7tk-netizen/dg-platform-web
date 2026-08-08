import { AppFeaturePlaceholder } from "@/components/platform/AppFeaturePlaceholder";
import { DomainAvailabilitySearch } from "@/components/infrastructure/DomainAvailabilitySearch";

/** DigitalGate Domains — Core Infrastructure UX stub (provider brand hidden). */
export default function Page() {
  return (
    <>
      <AppFeaturePlaceholder itemId="infra.domains" />
      <DomainAvailabilitySearch />
    </>
  );
}
