import {
  createGrowthProspect,
  createGrowthProspectAudit,
} from "@dg/platform-core";
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

function resolveOperatorOrganisationId(body: Record<string, unknown>): string | null {
  const fromBody =
    typeof body.organisationId === "string" ? body.organisationId.trim() : "";
  const fromEnv = process.env.DG_OPERATOR_ORG_ID?.trim() ?? "";
  return fromBody || fromEnv || null;
}

/** WordPress discovery form → Growth Engine prospect + audit. */
export async function POST(req: Request) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Invalid webhook secret" } },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.businessName !== "string" || !body.businessName.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "businessName is required" } },
      { status: 422 },
    );
  }

  const organisationId = resolveOperatorOrganisationId(body as Record<string, unknown>);
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

  const prospect = await createGrowthProspect({
    organisationId,
    businessName: body.businessName,
    contactName: body.contactName,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    industry: body.industry,
    websiteUrl: body.websiteUrl,
    actorId: "wp:discovery",
    operatorOrganisationId: organisationId,
  });

  let audit = null;
  if (body.audit && typeof body.audit === "object") {
    audit = await createGrowthProspectAudit({
      prospectId: prospect.id,
      scores: {
        businessHealth: body.maturity?.score ?? body.audit.businessHealth,
        aiVisibility: body.audit.aiVisibility,
        seo: body.audit.seoScore,
        websiteHealth: body.audit.websiteHealth,
      },
      findings: {
        ...(body.audit.findings ?? {}),
        recommendation: body.recommendation,
        maturity: body.maturity,
        wpContactId: body.wpContactId,
        wpOrganisationId: body.wpOrganisationId,
      },
      actorId: "wp:discovery",
      operatorOrganisationId: organisationId,
    });
  }

  return NextResponse.json({ data: { prospect, audit } }, { status: 201 });
}
