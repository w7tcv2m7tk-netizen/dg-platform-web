import { activateOrgReaAgency, bootConnectorEngine } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";
import { tenantWriteEntitlementBlock, writeEntitlementResponse } from "@/lib/write-entitlement";
import { canUseIndustryIntegrations, type PlatformTier } from "@/lib/plans";

export const dynamic = "force-dynamic";

bootConnectorEngine();

/**
 * POST /api/v1/connectors/rea/activate
 * Bind this organisation to a REA agency id (agentID / Integrations ownerId).
 * Body: { reaAgencyId: string, label?: string }
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;
  const writeBlock = await tenantWriteEntitlementBlock(session);
  if (writeBlock) return writeEntitlementResponse(writeBlock);

  const { prisma } = await import("@dg/database");
  const subscription = await prisma.platformSubscription.findUnique({
    where: { organisationId: session.organisationId },
    select: { planTier: true },
  });
  const tier = subscription?.planTier as PlatformTier | null;
  if (!canUseIndustryIntegrations(tier)) {
    return NextResponse.json(
      {
        error: {
          code: "industry_integration_plan_required",
          message: "Specialist Industry integrations require the Scale or Enterprise Core Platform plan.",
        },
      },
      { status: 403 },
    );
  }

  const industryApp = await prisma.appInstallation.findFirst({
    where: {
      organisationId: session.organisationId,
      appId: { in: ["property", "real-estate"] },
      enabled: true,
    },
    select: { id: true },
  });
  if (!industryApp) {
    return NextResponse.json(
      {
        error: {
          code: "industry_app_required",
          message: "The relevant Property / Real Estate Industry App must be active before connecting REA.",
        },
      },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const reaAgencyId =
    typeof body?.reaAgencyId === "string" ? body.reaAgencyId.trim() : "";
  if (!reaAgencyId) {
    return NextResponse.json(
      {
        error: {
          code: "validation",
          message: "reaAgencyId is required (REA agency / agentID from Ignite)",
        },
      },
      { status: 422 },
    );
  }

  const result = await activateOrgReaAgency({
    organisationId: session.organisationId,
    reaAgencyId,
    label: typeof body?.label === "string" ? body.label : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "activate_failed", message: result.message } },
      { status: 502 },
    );
  }

  return NextResponse.json({
    data: {
      connected: true,
      reaAgencyId: result.tokens.reaAgencyId,
      scope: result.tokens.scope ?? null,
      integration: result.integration ?? null,
      warning: result.tokens.lastError ?? null,
    },
  });
}
