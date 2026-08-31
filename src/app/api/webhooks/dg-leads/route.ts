import {
  resolveOrganisationIdForReSync,
  upsertLeadFromPublicCapture,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  resolveWebhookOrganisation,
  verifyWebhookSecret,
  webhookAllowedOrganisationIds,
} from "@/lib/webhook-auth";


/**
 * WP → Gen 2 dual-write for Roe public capture (WP-D-103).
 * Gen 2 Lead is SoT after import; pull-sync remains backup.
 */
export async function POST(req: Request) {
  const auth = verifyWebhookSecret(req, [
    "DG_LEADS_WEBHOOK_SECRET",
    // Legacy fallback during WP cutover — remove once WordPress is updated.
    "DG_WP_CONNECTOR_API_KEY",
  ] as const);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "not_configured" ? 503 : 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: { code: "database_not_configured", message: "DATABASE_URL not set" } },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const requestedOrganisationId =
    typeof body.organisationId === "string"
      ? body.organisationId
      : typeof body.organisation_id === "string"
        ? body.organisation_id
        : undefined;

  // Resolve server-side first; the body value may only confirm that answer.
  const serverResolved = await resolveOrganisationIdForReSync({
    siteUrl:
      typeof body.siteUrl === "string"
        ? body.siteUrl
        : typeof body.site_url === "string"
          ? body.site_url
          : undefined,
  });

  const target = resolveWebhookOrganisation({
    requested: requestedOrganisationId,
    resolved: serverResolved,
    allowed: webhookAllowedOrganisationIds("DG_LEADS_WEBHOOK_ORG_IDS"),
  });

  if (!target.ok) {
    return NextResponse.json(
      { error: { code: target.code, message: target.message } },
      { status: target.code === "forbidden" ? 403 : 422 },
    );
  }

  const organisationId = target.organisationId;


  const leadTypeRaw =
    typeof body.leadType === "string"
      ? body.leadType
      : typeof body.lead_type === "string"
        ? body.lead_type
        : "vendor";
  const leadType = leadTypeRaw === "buyer" ? "buyer" : "vendor";

  const wpLeadIdRaw = body.wpLeadId ?? body.wp_lead_id ?? body.id;
  const wpLeadId =
    typeof wpLeadIdRaw === "number"
      ? wpLeadIdRaw
      : Number.isFinite(Number(wpLeadIdRaw))
        ? Number(wpLeadIdRaw)
        : undefined;

  const result = await upsertLeadFromPublicCapture({
    organisationId,
    leadType,
    wpLeadId,
    name:
      typeof body.name === "string"
        ? body.name
        : typeof body.full_name === "string"
          ? body.full_name
          : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    propertyAddress:
      typeof body.propertyAddress === "string"
        ? body.propertyAddress
        : typeof body.property_address === "string"
          ? body.property_address
          : undefined,
    propertyUrl:
      typeof body.propertyUrl === "string"
        ? body.propertyUrl
        : typeof body.property_url === "string"
          ? body.property_url
          : undefined,
    source: typeof body.source === "string" ? body.source : undefined,
    stage: typeof body.stage === "string" ? body.stage : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    createdAt:
      typeof body.createdAt === "string"
        ? body.createdAt
        : typeof body.created_at === "string"
          ? body.created_at
          : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      organisationId,
      leadId: result.leadId,
      outcome: result.outcome,
      sot: "Lead",
    },
  });
}
