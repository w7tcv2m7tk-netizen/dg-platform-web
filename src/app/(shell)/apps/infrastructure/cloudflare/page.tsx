import { notFound } from "next/navigation";
import { getCloudflareInfrastructureOverview, hasPlatformAuthority } from "@dg/platform-core";

import { CloudflareConsole } from "@/components/infrastructure/CloudflareConsole";
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
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Cloudflare</h1>
        <p className="text-sm text-slate-400">
          Platform edge operations · CDN · WAF · cache management
        </p>
      </header>
      <main className="dg-page-main max-w-2xl">
        <CloudflareConsole initialOverview={overview} />
      </main>
    </>
  );
}
