import { clearOrgGoogleGmailConnectorTokens } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
import { tenantWriteEntitlementBlock, writeEntitlementResponse } from "@/lib/write-entitlement";
  isNextResponse,
  requirePermission,
  requirePlatformAuth,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** POST /api/v1/connectors/google-gmail/disconnect */
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

  await clearOrgGoogleGmailConnectorTokens(session.organisationId);
  return NextResponse.json({ data: { disconnected: true } });
}
