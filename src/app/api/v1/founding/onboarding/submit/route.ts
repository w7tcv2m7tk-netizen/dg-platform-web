import { NextResponse } from "next/server";
import { submitFoundingOnboarding } from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const result = await submitFoundingOnboarding({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    actorEmail: session.email,
    actorName: session.name,
  });
  if ("error" in result) {
    return NextResponse.json(
      { error: { code: "validation_error", message: result.error } },
      { status: 422 },
    );
  }
  return NextResponse.json({ data: result });
}
