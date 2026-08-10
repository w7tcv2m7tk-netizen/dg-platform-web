import { getServicesOverview } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "services.jobs.read");
  if (denied) return denied;

  const data = await getServicesOverview(session.organisationId);
  return NextResponse.json({ data });
}
