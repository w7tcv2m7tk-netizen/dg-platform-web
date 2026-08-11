import {
  bootConnectorEngine,
  ensureDomainSyndicationRegistered,
  getProperty,
  publishPropertyToDomain,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

bootConnectorEngine();
ensureDomainSyndicationRegistered();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/properties/[id]/syndicate/domain
 * Publish (upsert) this property as a residential listing on Domain Listings Management.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const property = await getProperty(session.organisationId, id);
  if (!property) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

  const result = await publishPropertyToDomain({
    organisationId: session.organisationId,
    propertyId: id,
    actorId: session.clerkUserId,
    domainAgencyId:
      typeof body?.domainAgencyId === "number" ? body.domainAgencyId : undefined,
    contact:
      body?.contact && typeof body.contact === "object"
        ? {
            firstName: String(body.contact.firstName ?? ""),
            lastName: String(body.contact.lastName ?? ""),
            email: String(body.contact.email ?? ""),
            phone:
              typeof body.contact.phone === "string" ? body.contact.phone : undefined,
          }
        : undefined,
  });

  if (!result.ok) {
    const status =
      result.reason === "not_found"
        ? 404
        : result.reason === "not_configured" || result.reason === "not_connected"
          ? 503
          : result.reason === "validation"
            ? 422
            : 502;
    return NextResponse.json(
      {
        error: {
          code: result.reason,
          message: result.message,
          securityReason: result.securityReason ?? null,
        },
        data: {
          property: await getProperty(session.organisationId, id),
          placement: result.placement ?? null,
        },
      },
      { status },
    );
  }

  const updated = await getProperty(session.organisationId, id);
  return NextResponse.json({
    data: {
      property: updated,
      publish: result,
    },
  });
}
