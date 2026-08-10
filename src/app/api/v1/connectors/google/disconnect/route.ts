import { clearOrgGoogleGbpConnectorTokens } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** POST /api/v1/connectors/google/disconnect */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  await clearOrgGoogleGbpConnectorTokens(session.organisationId);
  return NextResponse.json({ data: { disconnected: true } });
}
