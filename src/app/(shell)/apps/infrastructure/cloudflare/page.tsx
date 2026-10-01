import { notFound } from "next/navigation";
import { getCloudflareInfrastructureOverview, hasPlatformAuthority } from "@dg/platform-core";

import { CloudflareConsole } from "@/components/infrastructure/CloudflareConsole";
import { AppPageHeader } from "@/components/ui/AppPageHeader";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function InfrastructureCloudflarePage() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();
  if (
    !hasPlatformAuthority({
      organisationId: session.organisationId,
      role: session.role,
      principalId: session.clerkUserId,
    })
  ) {
    notFound();
  }

  const overview = await getCloudflareInfrastructureOverview();

  return (
    <>
      <AppPageHeader family="Infrastructure" title="Cloudflare" description={<>Platform edge operations · CDN · WAF · cache management</>} />
      <main className="dg-page-main">
        <CloudflareConsole initialOverview={overview} />
      </main>
    </>
  );
}
