import {
  resolveOrganisationIdForReSync,
  upsertLeadFromPublicCapture,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

function verifyWebhookSecret(req: Request): boolean {
  const secrets = [
    process.env.DG_LEADS_WEBHOOK_SECRET?.trim(),
    process.env.DG_DISCOVERY_WEBHOOK_SECRET?.trim(),
    process.env.DG_WP_CONNECTOR_API_KEY?.trim(),
    process.env.DG_API_KEY?.trim(),
  ].filter((s): s is string => Boolean(s));

  if (!secrets.length) return false;

  const provided =
    req.headers.get("X-DG-Webhook-Secret")?.trim() ||
    req.headers.get("X-API-Key")?.trim() ||
    "";

  return secrets.includes(provided);
}

/**
 * WP → Gen 2 dual-write for Roe public capture (WP-D-103).
 * Gen 2 Lead is SoT after import; pull-sync remains backup.
 */
export async function POST(req: Request) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid webhook secret" } },
      { status: 401 },
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

  const organisationId = await resolveOrganisationIdForReSync({
    organisationId:
      typeof body.organisationId === "string"
        ? body.organisationId
        : typeof body.organisation_id === "string"
          ? body.organisation_id
          : undefined,
    siteUrl:
      typeof body.siteUrl === "string"
        ? body.siteUrl
        : typeof body.site_url === "string"
          ? body.site_url
          : undefined,
  });

  if (!organisationId) {
    return NextResponse.json(
      {
        error: {
          code: "org_not_resolved",
          message:
            "Could not resolve RE organisation — set DG_RE_ORGANISATION_ID or Roe brand/connector on the org",
        },
      },
      { status: 422 },
    );
  }

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
