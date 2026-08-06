import {
  createGrowthProspect,
  createGrowthProspectAudit,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchPortalMe } from "@/lib/dg-api";
import { syncOrganisationFromPortal } from "@dg/platform-core";

function verifyWebhookSecret(req: Request): boolean {
  const secret = process.env.DG_DISCOVERY_WEBHOOK_SECRET?.trim()
    ?? process.env.DG_API_KEY?.trim()
    ?? process.env.DG_WP_CONNECTOR_API_KEY?.trim();

  if (!secret) return false;

  const provided = req.headers.get("X-DG-Webhook-Secret")?.trim()
    ?? req.headers.get("X-API-Key")?.trim()
    ?? "";

  return provided === secret;
}

/** Force onboarding/purchase sync after WP form submit. */
export async function POST(req: Request) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid webhook secret" } },
      { status: 401 },
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

  const portal = await fetchPortalMe(email, membership.clerkUserId);
  const result = await syncOrganisationFromPortal({
    organisationId: membership.organisationId,
    organisationName: membership.organisation.name,
    portal,
    force: true,
  });

  return NextResponse.json({ data: result });
}
