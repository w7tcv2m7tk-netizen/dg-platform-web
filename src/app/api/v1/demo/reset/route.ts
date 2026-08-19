import { NextResponse } from "next/server";
import {
  canAccessCommandCentre,
  grantDemoAccess,
  resetDemoOrganisation,
} from "@dg/platform-core";
import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function POST() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const staff = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
  const demoMember =
    session.role === "demo:partner" ||
    session.role === "demo:customer" ||
    session.organisationSlug === "harbour-and-co-demo";

  if (!staff && !demoMember) {
    return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  }

  const access =
    session.role === "demo:customer"
      ? "customer"
      : staff
        ? "partner"
        : "partner";
  await grantDemoAccess({
    clerkUserId: session.clerkUserId,
    email: session.email,
    displayName: session.name,
    access,
  });
  const result = await resetDemoOrganisation();
  return NextResponse.json({ data: result });
}
