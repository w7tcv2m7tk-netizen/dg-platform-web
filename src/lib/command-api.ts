import {
  canAccessCommandCentre,
  type PlatformSession,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

/** Auth + Command Centre staff gate for /api/v1/command/* routes. */
export async function requireCommandCentre(
  req: Request,
  feature = "command.view",
): Promise<PlatformSession | NextResponse> {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, feature);
  if (denied) return denied;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Command Centre is internal only" } },
      { status: 403 },
    );
  }

  return session;
}
