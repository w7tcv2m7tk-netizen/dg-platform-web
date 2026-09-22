import { industryIdForAppOrTemplate } from "@dg/platform-core";

import { canUseIndustryIntegrations, type PlatformTier } from "@/lib/plans";

type OrgSettings = {
  profile?: {
    purchasedApps?: unknown;
  };
};

export async function checkSpecialistIndustryIntegrationEntitlement(
  organisationId: string,
  requiredIndustryId: string,
): Promise<
  | { ok: true }
  | { ok: false; code: "industry_integration_plan_required" | "industry_app_required"; message: string }
> {
  const { prisma } = await import("@dg/database");
  const [subscription, organisation] = await Promise.all([
    prisma.platformSubscription.findUnique({
      where: { organisationId },
      select: { planTier: true },
    }),
    prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { settings: true },
    }),
  ]);

  const tier = subscription?.planTier as PlatformTier | null;
  if (!canUseIndustryIntegrations(tier)) {
    return {
      ok: false,
      code: "industry_integration_plan_required",
      message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan.",
    };
  }

  const settings = (organisation?.settings as OrgSettings | null) ?? {};
  const purchasedApps = Array.isArray(settings.profile?.purchasedApps)
    ? settings.profile.purchasedApps.filter((value): value is string => typeof value === "string")
    : [];
  const purchased = purchasedApps.some(
    (key) => industryIdForAppOrTemplate(key) === requiredIndustryId,
  );

  if (!purchased) {
    return {
      ok: false,
      code: "industry_app_required",
      message: "The relevant paid Industry App must be active on this subscription before using this specialist integration.",
    };
  }

  return { ok: true };
}
