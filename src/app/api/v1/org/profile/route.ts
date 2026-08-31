import { NextResponse } from "next/server";
import { getOrganisationBusinessProfile } from "@dg/platform-core";

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

  let body: import("@dg/platform-core").BusinessProfilePatch;
  try {
    body = (await req.json()) as import("@dg/platform-core").BusinessProfilePatch;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const { updateOrganisationBusinessProfile } = await import("@dg/platform-core");
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

/** @deprecated P1 — WordPress portal pull retired. Use PATCH for Gen 2 profile updates. */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  return NextResponse.json(
    {
      error: {
        code: "deprecated",
        message:
          "WordPress portal sync is retired. Update your Business Profile via Gen 2 onboarding or PATCH /api/v1/org/profile.",
      },
    },
    { status: 410 },
  );
}
