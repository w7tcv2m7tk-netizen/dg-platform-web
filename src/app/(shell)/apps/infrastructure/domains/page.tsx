import { DomainsConsole } from "@/components/infrastructure/DomainsConsole";
import { AppFeaturePlaceholder } from "@/components/platform/AppFeaturePlaceholder";

/** DigitalGate Domains — search, register (gated), connect, DNS. */
export default function Page() {
  return (
    <>
      <AppFeaturePlaceholder itemId="infra.domains" />
      <DomainsConsole />
    </>
  );
}
