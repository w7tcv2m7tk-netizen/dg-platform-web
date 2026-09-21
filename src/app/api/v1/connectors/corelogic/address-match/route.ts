import { matchCoreLogicAddress } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { canUseIndustryIntegrations, type PlatformTier } from "@/lib/plans";

import {
  authenticatePlatformOrConnector,
  isNextResponse,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/connectors/corelogic/address-match
 * Auth: platform session or connector API key.
 * Body: { address | q | rawAddress }
 *
 * Returns Cotality propertyId + match metadata. Does not log the address in server logs.
 */
export async function POST(req: Request) {
  const auth = await authenticatePlatformOrConnector(req);
  if (isNextResponse(auth)) return auth;


  // Legacy platform-wide connector keys are not tenant-scoped and therefore
  // cannot satisfy per-organisation commercial entitlements.
  if (auth.mode !== "session") {
    return NextResponse.json(
      { error: { code: "tenant_auth_required", message: "A tenant-scoped platform session or API key is required for this specialist Industry integration." } },
      { status: 403 },
    );
  }
  const organisationId = auth.session.organisationId;

  const { prisma } = await import("@dg/database");
  const subscription = await prisma.platformSubscription.findUnique({
    where: { organisationId: organisationId },
    select: { planTier: true },
  });
  const tier = subscription?.planTier as PlatformTier | null;
  if (!canUseIndustryIntegrations(tier)) {
    return NextResponse.json(
      { error: { code: "industry_integration_plan_required", message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan." } },
      { status: 403 },
    );
  }
  const industryApp = await prisma.appInstallation.findFirst({
    where: { organisationId: organisationId, appId: { in: ["property", "real-estate"] }, enabled: true },
    select: { id: true },
  });
  if (!industryApp) {
    return NextResponse.json(
      { error: { code: "industry_app_required", message: "The relevant Property / Real Estate Industry App must be active before using Cotality/CoreLogic." } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const address = (
    body?.address ??
    body?.q ??
    body?.rawAddress ??
    body?.property_address ??
    ""
  )
    .toString()
    .trim();

  if (!address) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "address is required" } },
      { status: 422 },
    );
  }

  const result = await matchCoreLogicAddress(address, {
    clientName:
      typeof body?.clientName === "string" ? body.clientName : undefined,
    matchProfileId:
      body?.matchProfileId != null ? body.matchProfileId : undefined,
  });

  if (!result.ok) {
    const status = result.status >= 400 && result.status < 600 ? result.status : 502;
    return NextResponse.json(
      {
        error: {
          code: status === 503 ? "not_configured" : "upstream_error",
          message: result.message,
        },
      },
      { status },
    );
  }

  const { match } = result;
  return NextResponse.json({
    data: {
      propertyId: match.propertyId ?? null,
      matchType: match.matchType ?? null,
      matchRule: match.matchRule ?? null,
      address: match.address ?? null,
      matched: Boolean(match.propertyId) && (match.matchType || "").toUpperCase() !== "N",
    },
    meta: { auth: auth.mode, source: "corelogic.address_match" },
  });
}
