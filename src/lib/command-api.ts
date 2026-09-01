import {
  assertPlatformOperator,
  canAccessCommandCentre,
  type PlatformOperatorContext,
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
    principalId: session.clerkUserId,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Command Centre is internal only" } },
      { status: 403 },
    );
  }

  return session;
}

/**
 * Auth + platform-operator capability for deliberately cross-tenant routes.
 *
 * Returns the capability object that cross-tenant service functions require,
 * so a route cannot reach those functions without proving platform authority.
 */
export async function requirePlatformOperator(
  req: Request,
  feature = "command.view",
): Promise<
  { session: PlatformSession; operator: PlatformOperatorContext } | NextResponse
> {
  const session = await requireCommandCentre(req, feature);
  if (isNextResponse(session)) return session;

  const operator = assertPlatformOperator(session);
  if (!operator) {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator authority is required",
        },
      },
      { status: 403 },
    );
  }

  return { session, operator };
}
