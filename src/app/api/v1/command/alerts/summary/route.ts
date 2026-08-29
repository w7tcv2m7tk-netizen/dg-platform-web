import {
  canAccessCommandCentre,
  getPlatformAlertsBadgeCount,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

/** Lightweight badge count for Command Centre sidebar (actionable Platform Alerts). */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.view");
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

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ alertCount: 0 });
  }

  const data = await getPlatformAlertsBadgeCount();
  return NextResponse.json({
    alertCount: data.alertCount,
    generatedAt: data.generatedAt,
  });
}
