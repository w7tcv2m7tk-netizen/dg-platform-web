import { getCloudflareInfrastructureOverview } from "@dg/platform-core";

import { CloudflareConsole } from "@/components/infrastructure/CloudflareConsole";
import { InfrastructureNav } from "@/components/infrastructure/InfrastructureNav";

export default async function InfrastructureCloudflarePage() {
  const overview = await getCloudflareInfrastructureOverview();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Cloudflare</h1>
        <p className="text-sm text-slate-400">
          CDN, WAF, and edge cache — purge after publishes. Dreamscape remains V1 for domain
          registration; Cloudflare sits in front of live sites.
        </p>
      </header>
      <main className="dg-page-main max-w-2xl">
        <InfrastructureNav active="cloudflare" />
        <CloudflareConsole initialOverview={overview} />
      </main>
    </>
  );
}
