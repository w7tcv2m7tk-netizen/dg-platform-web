import { NextResponse } from "next/server";
import {
  getOrganisationBusinessProfile,
  syncOrganisationFromPortal,
} from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const profile = await getOrganisationBusinessProfile(session.organisationId);
  return NextResponse.json({ data: profile });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const portal = await fetchPortalMe(session.email, session.clerkUserId);
  const result = await syncOrganisationFromPortal({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    portal,
    force: true,
  });

  if (!portal.linked) {
    return NextResponse.json(
      {
        error: {
          code: "not_linked",
          message:
            "No onboarding record found for this email. Complete onboarding on digitalgate.com.au first.",
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      synced: result.synced,
      profile: result.profile ?? (await getOrganisationBusinessProfile(session.organisationId)),
    },
  });
}
