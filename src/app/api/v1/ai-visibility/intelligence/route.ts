import { getAiVisibilityIntelligenceSnapshot } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "growth",
    action: "view",
    scope: "organisation",
  });
  if (denied) return denied;

  const data = await getAiVisibilityIntelligenceSnapshot(session.organisationId);
  return NextResponse.json({ data });
}
