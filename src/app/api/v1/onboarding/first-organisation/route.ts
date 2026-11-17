import { auth, currentUser } from "@clerk/nextjs/server";
import { createFirstOrganisationForUser } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { writeActiveOrganisationId } from "@/lib/active-org-cookie";
import { hasVerifiedPrimaryEmail, matchesSignedInClerkIdentity } from "@/lib/first-organisation-auth";

/** Explicit bootstrap boundary for a verified Clerk user with no tenant context. */
export async function POST(req: Request) {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !matchesSignedInClerkIdentity(userId, user)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const emailAddress = user.primaryEmailAddress;
  if (!hasVerifiedPrimaryEmail(user) || !emailAddress?.emailAddress) {
    return NextResponse.json(
      { error: { code: "email_verification_required", message: "Verify your email before creating an organisation" } },
      { status: 403 },
    );
  }

  const body: unknown = await req.json().catch(() => ({}));
  const name =
    body && typeof body === "object" && "name" in body && typeof body.name === "string"
      ? body.name.trim()
      : "";
  if (!name || name.length > 120) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Enter an organisation name (up to 120 characters)" } },
      { status: 422 },
    );
  }

  const email = emailAddress.emailAddress;
  const displayName =
    user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? email;

  try {
    const result = await createFirstOrganisationForUser({
      clerkUserId: userId,
      email,
      name: displayName || email,
      orgName: name,
      template: "default",
    });
    await writeActiveOrganisationId(result.organisationId);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create organisation";
    const conflict = message.includes("existing organisation membership");
    const unconfigured = message.includes("database is not configured");
    return NextResponse.json(
      {
        error: {
          code: conflict ? "organisation_already_exists" : unconfigured ? "database_not_configured" : "create_failed",
          message: conflict
            ? "Your account already has organisation access. Continue with that organisation or contact support."
            : unconfigured
              ? "Platform database is not configured"
              : "Could not create organisation",
        },
      },
      { status: conflict ? 409 : unconfigured ? 503 : 500 },
    );
  }
}
