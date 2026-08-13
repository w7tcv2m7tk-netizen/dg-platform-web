import {
  bootConnectorEngine,
  ensureReaSyndicationRegistered,
  getProperty,
  publishPropertyToRea,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

bootConnectorEngine();
ensureReaSyndicationRegistered();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/properties/[id]/syndicate/rea
 * Upload this property to REA Listing Upload (REAXML) → placement pending.
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

  const result = await publishPropertyToRea({
    organisationId: session.organisationId,
    propertyId: id,
    actorId: session.clerkUserId,
    reaAgencyId: typeof body?.reaAgencyId === "string" ? body.reaAgencyId : undefined,
  });

  if (!result.ok) {
    const status =
      result.reason === "not_found"
        ? 404
        : result.reason === "not_configured" ||
            result.reason === "not_connected" ||
            result.reason === "not_implemented"
          ? 503
          : result.reason === "validation"
            ? 422
            : 502;
    return NextResponse.json(
      {
        error: {
          code: result.reason,
          message: result.message,
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
