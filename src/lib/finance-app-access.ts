import type { PlatformAuthorityInput } from "@dg/platform-core/access/platform-authority";
import { NextResponse } from "next/server";
import { cache } from "react";

import {
  financeAppAccessDenial,
  financeAppAccessStateOrDenied,
  resolveFinanceAppAccessState,
  type FinanceEntitlementAuthority,
  type FinanceAppAccessState,
} from "@/lib/finance-app-access-policy";

type FinanceOrganisationSettings = {
  featureFlags?: Record<string, boolean>;
};

export const getFinanceAppAccessState = cache(async function getFinanceAppAccessState(
  organisationId: string,
  actor?: PlatformAuthorityInput,
): Promise<FinanceAppAccessState> {
  const { prisma } = await import("@dg/database");
  const [organisation, canonicalSubscription] = await Promise.all([
    prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { settings: true },
    }),
    prisma.platformSubscription.findUnique({
      where: { organisationId },
      select: {
        organisationId: true,
        platformExempt: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        stripeStatus: true,
        entitlement: true,
        status: true,
        industryApps: true,
        premiumApps: true,
        trialEnd: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        gracePeriodEndsAt: true,
      },
    }),
  ]);
  const settings = (organisation?.settings ?? {}) as FinanceOrganisationSettings;
  const base = {
    organisationId,
    actor,
    featureFlags: settings.featureFlags,
    organisationSettings: organisation?.settings as Parameters<typeof resolveFinanceAppAccessState>[0]["organisationSettings"],
    canonicalSubscription: canonicalSubscription as FinanceEntitlementAuthority | null,
  };
  return resolveFinanceAppAccessState(base);
});

export async function requireFinanceAppAccess(
  organisationId: string,
  actor?: PlatformAuthorityInput,
): Promise<NextResponse | null> {
  const denial = financeAppAccessDenial(
    await financeAppAccessStateOrDenied(() => getFinanceAppAccessState(organisationId, actor)),
  );
  if (denial === "beta_required") {
    return NextResponse.json(
      {
        error: {
          code: denial,
          message: "Finance is not enabled for this organisation. Contact DigitalGate.",
        },
      },
      { status: 403 },
    );
  }
  if (denial === "industry_app_purchase_required") {
    return NextResponse.json(
      {
        error: {
          code: denial,
          message: "Purchase the Finance Industry App before using this workspace.",
        },
      },
      { status: 403 },
    );
  }
  if (denial === "industry_app_not_selected") {
    return NextResponse.json(
      { error: { code: denial, message: "Select Finance for this organisation before using the Finance workspace." } },
      { status: 403 },
    );
  }
  return null;
}
