import { NextResponse } from "next/server";
import {
  getOrganisationBusinessProfile,
  syncOrganisationFromPortal,
  updateOrganisationBusinessProfile,
  type BusinessProfilePatch,
} from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";
import { isNextResponse, rejectDemoLiveAction, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const profile = await getOrganisationBusinessProfile(session.organisationId);
  return NextResponse.json({ data: profile });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const blocked = await rejectDemoLiveAction(session);
  if (blocked) return blocked;

  let body: BusinessProfilePatch;
  try {
    body = (await req.json()) as BusinessProfilePatch;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const profile = await updateOrganisationBusinessProfile(
    session.organisationId,
    body,
  );

  if (!profile) {
    return NextResponse.json(
      { error: { code: "unavailable", message: "Profile storage unavailable" } },
      { status: 503 },
    );
  }

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
