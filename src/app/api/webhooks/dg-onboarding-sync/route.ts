/**
 * Legacy WordPress → Gen 2 migration webhook (push-only).
 *
 * P1: Must NOT fetch WordPress portal data or participate in the Gen 2 onboarding journey.
 * WP may POST a portal payload here for one-way historical import when explicitly configured.
 */
import { syncOrganisationFromPortal } from "@dg/platform-core";
import { NextResponse } from "next/server";

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

  const portalPayload = body?.portal;
  if (!portalPayload || typeof portalPayload !== "object") {
    return NextResponse.json(
      {
        error: {
          code: "deprecated_pull",
          message:
            "Push-only webhook: include portal payload in body. WordPress portal pull is retired.",
        },
      },
      { status: 422 },
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
      {
        error: {
          code: "not_found",
          message:
            "No platform account for this email yet — sign up at app.digitalgate.com.au first",
        },
      },
      { status: 404 },
    );
  }

  const organisationId =
    (typeof body?.organisationId === "string" && body.organisationId.trim()) ||
    membership.organisationId ||
    process.env.DG_OPERATOR_ORG_ID?.trim() ||
    null;

  if (!organisationId) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "organisationId or DG_OPERATOR_ORG_ID is required",
        },
      },
      { status: 422 },
    );
  }

  const portal = {
    linked: Boolean(portalPayload.linked ?? true),
    contact_id: portalPayload.contact_id,
    organisation_id: portalPayload.organisation_id,
    org_name: portalPayload.org_name,
    purchase_label: portalPayload.purchase_label,
    onboarding: portalPayload.onboarding ?? null,
    purchase: portalPayload.purchase ?? null,
  };

  const result = await syncOrganisationFromPortal({
    organisationId,
    organisationName: membership.organisation.name,
    portal,
    force: true,
  });

  return NextResponse.json({ data: { ...result, legacy: true } });
}
