import { getCloudflareAnalyticsSummary, getCloudflareZoneStatus } from "./client";
import { isCloudflareConfigured, resolveCloudflareConfig } from "./config";

export * from "./config";
export * from "./client";

export type CloudflareInfrastructureOverview = {
  checkedAt: string;
  configured: boolean;
  zoneId: string | null;
  accountId: string | null;
  zone: Awaited<ReturnType<typeof getCloudflareZoneStatus>>;
  analytics: Awaited<ReturnType<typeof getCloudflareAnalyticsSummary>>;
  nextSteps: string[];
  docsPath: string;
};

export async function getCloudflareInfrastructureOverview(): Promise<CloudflareInfrastructureOverview> {
  const config = resolveCloudflareConfig();
  const configured = isCloudflareConfigured();

  const nextSteps: string[] = [];
  if (!configured) {
    nextSteps.push(
      "Set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ZONE_ID on Vercel (Cache Purge + Zone Read + Analytics Read)",
    );
    nextSteps.push(
      "Token template: Edit zone DNS (optional later) · Cache Purge · Zone · Analytics Read",
    );
    nextSteps.push("Purge after Design Studio publish or WordPress deploys");
  } else {
    nextSteps.push("Purge everything after major publishes, or purge specific URLs for surgical clears");
    nextSteps.push("WordPress Roe/CVH sites can still use Site Tools → Cache until per-zone mapping ships");
  }

  const zone = configured
    ? await getCloudflareZoneStatus()
    : { configured: false, message: "Not configured" };
  const analytics = configured
    ? await getCloudflareAnalyticsSummary()
    : { success: false, message: "Not configured" };

  return {
    checkedAt: new Date().toISOString(),
    configured,
    zoneId: config?.zoneId ?? null,
    accountId: config?.accountId ?? null,
    zone,
    analytics,
    nextSteps,
    docsPath: "docs/foundations/INFRASTRUCTURE.md",
  };
}
