import { canUseIndustryIntegrations, type PlatformTier } from "@/lib/plans";

export type IndustryIntegrationAccess =
  | { ok: true; tier: PlatformTier }
  | { ok: false; status: 403; code: "industry_integration_plan_required" | "industry_app_required"; message: string };

export async function checkIndustryIntegrationAccess(
  organisationId: string,
  relevantAppIds: string[],
): Promise<IndustryIntegrationAccess> {
  const { prisma } = await import("@dg/database");

  const subscription = await prisma.platformSubscription.findUnique({
    where: { organisationId },
    select: { planTier: true },
  });
  const tier = subscription?.planTier as PlatformTier | null;

  if (!canUseIndustryIntegrations(tier)) {
    return {
      ok: false,
      status: 403,
      code: "industry_integration_plan_required",
      message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan.",
    };
  }

  const industryApp = await prisma.appInstallation.findFirst({
    where: {
      organisationId,
      appId: { in: relevantAppIds },
      enabled: true,
    },
    select: { id: true },
  });

  if (!industryApp) {
    return {
      ok: false,
      status: 403,
      code: "industry_app_required",
      message: "The relevant Industry App must be active before using this specialist integration.",
    };
  }

  return { ok: true, tier };
}
