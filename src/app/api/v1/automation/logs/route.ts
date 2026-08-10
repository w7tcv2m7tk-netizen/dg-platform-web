import { listOrganisationActivities } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { items } = await listOrganisationActivities({
    organisationId: session.organisationId,
    sourceApp: "automation",
    limit: 50,
  });

  return NextResponse.json({ data: { items } });
}
