export type IndustryIntegrationTier = "starter" | "professional" | "business" | "enterprise";

export type OrgIndustryIntegrationEntitlement =
  | { ok: true; tier: "business" | "enterprise" }
  | {
      ok: false;
      reason: "industry_integration_plan_required" | "industry_app_required";
      message: string;
    };

export async function checkOrgIndustryIntegrationEntitlement(
  organisationId: string,
  relevantAppIds: string[],
): Promise<OrgIndustryIntegrationEntitlement> {
  const { prisma } = await import("@dg/database");

  const subscription = await prisma.platformSubscription.findUnique({
    where: { organisationId },
    select: { planTier: true },
  });
  const tier = subscription?.planTier as IndustryIntegrationTier | null;

  if (tier !== "business" && tier !== "enterprise") {
    return {
      ok: false,
      reason: "industry_integration_plan_required",
      message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan.",
    };
  }

  const app = await prisma.appInstallation.findFirst({
    where: {
      organisationId,
      appId: { in: relevantAppIds },
      enabled: true,
    },
    select: { id: true },
  });

  if (!app) {
    return {
      ok: false,
      reason: "industry_app_required",
      message: "The relevant Industry App must be active before using this specialist integration.",
    };
  }

  return { ok: true, tier };
}
