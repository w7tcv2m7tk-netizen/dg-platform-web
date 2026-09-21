import { createOrganisationForUser, type OrgTemplate } from "@dg/platform-core";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

const VALID_TEMPLATES = new Set<OrgTemplate>([
  "default",
  "real-estate",
  "accommodation",
  "creator",
  "services",
]);

export async function POST(req: Request) {
  // This is the explicit first-tenant boundary used by onboarding. Authentication
  // establishes identity; this route intentionally permits a memberless Clerk user.
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  }
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const displayName =
    user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? email;
  const existingSession = await resolveActivePlatformSession({
    clerkUserId: userId,
    email,
    name: displayName,
  });

  const body = await req.json().catch(() => ({}));
  const firstOrganisation = body.firstOrganisation === true;
  const name = (body.name as string | undefined)?.trim();
  const template = (body.template as OrgTemplate | undefined) ?? "default";

  if (!name) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }

  if (!VALID_TEMPLATES.has(template)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid template" } },
      { status: 422 },
    );
  }

  if (firstOrganisation && existingSession) {
    return NextResponse.json(
      { error: { code: "already_has_organisation", message: "This account already has an organisation" } },
      { status: 409 },
    );
  }

  try {
    const created = await createOrganisationForUser({
      clerkUserId: userId,
      email,
      name: displayName,
      orgName: name,
      template,
    });

    await writeActiveOrganisationId(created.organisationId);

    return NextResponse.json({ data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create organisation";
    return NextResponse.json(
      { error: { code: "create_failed", message } },
      { status: 422 },
    );
  }
}
