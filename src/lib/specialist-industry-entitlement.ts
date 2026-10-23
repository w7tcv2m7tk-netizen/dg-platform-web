import { NextResponse } from "next/server";

import { canUseIndustryIntegrations, type PlatformTier } from "@/lib/plans";
import { requireFinanceAppAccess } from "@/lib/finance-app-access";
import { isIndustryAppPurchased } from "@dg/platform-core/industry/purchase-authority";
import { organisationHasSelectedIndustryApp, type IndustrySelectionSettings } from "@/lib/industry-app-selection";


export async function specialistIndustryEntitlementBlock(
  organisationId: string,
  requiredIndustryId: string,
): Promise<NextResponse | null> {
  const { prisma } = await import("@dg/database");
  const subscription = await prisma.platformSubscription.findUnique({
      where: { organisationId },
      select: { organisationId: true, planTier: true, industryApps: true, premiumApps: true, status: true, entitlement: true,
        stripeStatus: true, stripeSubscriptionId: true, stripeCustomerId: true, trialEnd: true,
        currentPeriodEnd: true, gracePeriodEndsAt: true, cancelAtPeriodEnd: true },
    });

  const tier = subscription?.planTier as PlatformTier | null;
  if (!canUseIndustryIntegrations(tier)) {
    return NextResponse.json(
      { error: { code: "industry_integration_plan_required", message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan." } },
      { status: 403 },
    );
  }

  if (requiredIndustryId === "finance") {
    const financeBlock = await requireFinanceAppAccess(organisationId);
    if (financeBlock) return financeBlock;
  }

  const purchased = isIndustryAppPurchased(subscription, organisationId, requiredIndustryId);
  if (!purchased) {
    return NextResponse.json(
      { error: { code: "industry_app_purchase_required", message: "Purchase the relevant Industry App before using this specialist integration." } },
      { status: 403 },
    );
  }

  const organisation = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { settings: true } });
  if (!organisationHasSelectedIndustryApp(organisation?.settings as IndustrySelectionSettings | null, requiredIndustryId)) {
    return NextResponse.json(
      { error: { code: "industry_app_not_selected", message: "Select the relevant Industry App for this organisation before using this integration." } },
      { status: 403 },
    );
  }

  const active = await prisma.appInstallation.findFirst({
    where: {
      organisationId,
      appId: { in: requiredIndustryId === "real-estate" ? ["property", "real-estate"] : [requiredIndustryId] },
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
