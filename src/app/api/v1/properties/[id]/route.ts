import {
  geocodePropertyAddress,
  getProperty,
  listPropertyActivities,
  PROPERTY_STATUSES,
  updatePropertyStatus,
  type PropertyStatus,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const property = await getProperty(session.organisationId, id);

  if (!property) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

  const activities = await listPropertyActivities(session.organisationId, id);

  return NextResponse.json({ data: { property, activities } });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (body?.action === "geocode_address") {
    const updated = await geocodePropertyAddress(
      session.organisationId,
      id,
      session.clerkUserId,
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "property_not_found", message: "Property not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: updated });
  }

  const status = body?.status as PropertyStatus | undefined;

  if (!status || !PROPERTY_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "valid status required" } },
      { status: 422 },
    );
  }

  const updated = await updatePropertyStatus(
    session.organisationId,
    id,
    status,
    session.clerkUserId,
  );

  if (!updated) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: updated });
}
