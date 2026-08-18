import { NextResponse } from "next/server";
import { getFoundingImplementation, getFoundingOnboarding } from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;
  const [plan, onboarding] = await Promise.all([
    getFoundingImplementation(session.organisationId),
    getFoundingOnboarding(session.organisationId),
  ]);
  return NextResponse.json({ data: { plan, onboarding } });
}
