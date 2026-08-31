import { NextResponse } from "next/server";

import { fetchPortalMe } from "@/lib/dg-api";
import { syncOrganisationFromPortal } from "@dg/platform-core";
import { verifyWebhookSecret } from "@/lib/webhook-auth";


/** Force onboarding/purchase sync after WP form submit. */
export async function POST(req: Request) {
  const auth = verifyWebhookSecret(req, [
    "DG_ONBOARDING_SYNC_WEBHOOK_SECRET",
    // Legacy fallback during WP cutover — remove once WordPress is updated.
    "DG_DISCOVERY_WEBHOOK_SECRET",
  ] as const);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "not_configured" ? 503 : 401 },
    );
  }

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "email is required" } },
      { status: 422 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "database_not_configured", message: "DATABASE_URL not set" } },
      { status: 503 },
    );
  }

  const { prisma } = await import("@dg/database");
  const membership = await prisma.membership.findFirst({
    where: { email },
    include: { organisation: true },
    orderBy: { createdAt: "desc" },
  });

  if (!membership) {
    return NextResponse.json(
      { error: { code: "not_found", message: "No platform account for this email yet — sign up at app.digitalgate.com.au first" } },
      { status: 404 },
    );
  }

  /**
   * Tenant identity comes from the membership matched on the verified email —
   * never from the request body. Previously an explicit body organisationId
   * won, letting any secret holder sync arbitrary tenants.
   */
  const organisationId = membership.organisationId;

  if (!organisationId) {
    return NextResponse.json(
      {
        error: {
          code: "org_not_resolved",
          message: "Membership has no organisation",
        },
      },
      { status: 422 },
    );
  }

  const portal = await fetchPortalMe(email, membership.clerkUserId);
  const result = await syncOrganisationFromPortal({
    organisationId,
    organisationName: membership.organisation.name,
    portal,
    force: true,
  });

  return NextResponse.json({ data: result });
}
