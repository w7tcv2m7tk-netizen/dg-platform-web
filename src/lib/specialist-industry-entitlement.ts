import { industryIdForAppOrTemplate } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { canUseIndustryIntegrations, type PlatformTier } from "@/lib/plans";

type OrgSettings = { profile?: { purchasedApps?: unknown } };

export async function specialistIndustryEntitlementBlock(
  organisationId: string,
  requiredIndustryId: string,
): Promise<NextResponse | null> {
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
    return NextResponse.json(
      { error: { code: "industry_integration_plan_required", message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan." } },
      { status: 403 },
    );
  }

  const settings = (organisation?.settings as OrgSettings | null) ?? {};
  const purchasedApps = Array.isArray(settings.profile?.purchasedApps)
    ? settings.profile.purchasedApps.filter((key): key is string => typeof key === "string")
    : [];
  const purchased = purchasedApps.some(
    (key) => industryIdForAppOrTemplate(key) === requiredIndustryId,
  );
  if (!purchased) {
    return NextResponse.json(
      { error: { code: "industry_app_purchase_required", message: "Purchase the relevant Industry App before using this specialist integration." } },
      { status: 403 },
    );
  }

  const active = await prisma.appInstallation.findFirst({
    where: {
      organisationId,
      appId: { in: requiredIndustryId === "property" ? ["property", "real-estate"] : [requiredIndustryId] },
      enabled: true,
    },
    select: { id: true },
  });
  if (!active) {
    return NextResponse.json(
      { error: { code: "industry_app_required", message: "The relevant Industry App must be active before using this specialist integration." } },
      { status: 403 },
    );
  }
  return null;
}
