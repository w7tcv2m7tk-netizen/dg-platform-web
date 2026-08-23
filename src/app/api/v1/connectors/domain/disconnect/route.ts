import { clearOrgDomainConnectorTokens } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** POST /api/v1/connectors/domain/disconnect */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;


  await clearOrgDomainConnectorTokens(session.organisationId);
  return NextResponse.json({ data: { disconnected: true } });
}
