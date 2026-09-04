import { ResellersProgrammeSurface } from "@/components/partners/ResellersProgrammeSurface";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";

export default async function AcquisitionPartnersPage() {
  await requirePlatformOperatorContext();
  return <ResellersProgrammeSurface />;
}
