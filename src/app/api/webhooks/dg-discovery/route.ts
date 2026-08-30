import {
  createGrowthProspect,
  createGrowthProspectAudit,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  resolveWebhookOrganisation,
  verifyWebhookSecret,
  webhookAllowedOrganisationIds,
} from "@/lib/webhook-auth";



/** WordPress discovery form → Growth Engine prospect + audit. */
export async function POST(req: Request) {
  const auth = verifyWebhookSecret(req, [
    "DG_DISCOVERY_WEBHOOK_SECRET",
    // Legacy fallback during WP cutover — remove once WordPress is updated.
    "DG_WP_CONNECTOR_API_KEY",
  ] as const);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "not_configured" ? 503 : 401 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.businessName !== "string" || !body.businessName.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "businessName is required" } },
      { status: 422 },
    );
  }

  // Server-resolved operator org; a body value may only confirm it.
  const target = resolveWebhookOrganisation({
    requested:
      typeof body.organisationId === "string" ? body.organisationId : undefined,
    resolved: process.env.DG_OPERATOR_ORG_ID,
    allowed: webhookAllowedOrganisationIds("DG_DISCOVERY_WEBHOOK_ORG_IDS"),
  });
  if (!target.ok) {
    return NextResponse.json(
      { error: { code: target.code, message: target.message } },
      { status: target.code === "forbidden" ? 403 : 422 },
    );
  }
  const organisationId = target.organisationId;

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
