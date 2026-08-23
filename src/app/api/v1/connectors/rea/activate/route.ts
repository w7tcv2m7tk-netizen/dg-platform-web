import { activateOrgReaAgency, bootConnectorEngine } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

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
