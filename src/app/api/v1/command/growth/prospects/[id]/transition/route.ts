import { transitionGrowthProspectToClient } from "@dg/platform-core";
import type { OrgTemplate } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const TEMPLATES: OrgTemplate[] = [
  "default",
  "real-estate",
  "accommodation",
  "creator",
];

/**
 * POST — create or link a platform Organisation from a Growth prospect.
 * Body: { template?, existingOrganisationId? }
 * No billing is created — staff complete Stripe/apps separately.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.manage");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const templateRaw =
    typeof body?.template === "string" ? body.template.trim() : "";
  const template = TEMPLATES.includes(templateRaw as OrgTemplate)
    ? (templateRaw as OrgTemplate)
    : undefined;
  const existingOrganisationId =
    typeof body?.existingOrganisationId === "string"
      ? body.existingOrganisationId.trim()
      : undefined;

  const result = await transitionGrowthProspectToClient({
    prospectId: id,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
    actorEmail: session.email,
    actorName: session.name,
    template,
    existingOrganisationId: existingOrganisationId || undefined,
  });

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json(
        { error: { code: "not_found", message: "Prospect not found" } },
        { status: 404 },
      );
    }
    if (result.error === "org_not_found") {
      return NextResponse.json(
        {
          error: {
            code: "org_not_found",
            message: "Organisation to link was not found",
          },
        },
        { status: 404 },
      );
    }
    if (result.error === "already_converted") {
      return NextResponse.json(
        {
          error: {
            code: "already_converted",
            message: "Prospect already linked to a client organisation",
            organisationId: result.organisationId,
          },
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: result.message,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json(
    {
      data: {
        ...result,
        transitionedAt: result.transitionedAt.toISOString(),
        clientsHref: result.nextSteps.clientsHref,
      },
    },
    { status: 201 },
  );
}
