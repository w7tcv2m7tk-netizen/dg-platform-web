import { listUserOrganisations } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const organisations = await listUserOrganisations(session.clerkUserId);

  return NextResponse.json({
    data: {
      activeOrganisationId: session.organisationId,
      organisations,
    },
  });
}
