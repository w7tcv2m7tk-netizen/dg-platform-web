import {
  canAccessCommandCentre,
  getCommandCentreOpsHome,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.overview.read");
  if (denied) return denied;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
    organisations: session.organisations.map((o) => ({
      organisationId: o.organisationId,
      organisationName: o.organisationName,
      organisationSlug: o.organisationSlug,
    })),
  });

  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Command Centre is internal only" } },
      { status: 403 },
    );
  }

  const data = await getCommandCentreOpsHome();
  return NextResponse.json({ data });
}
