import {
  geocodePropertyAddress,
  getProperty,
  listPropertyActivities,
  PROPERTY_STATUSES,
  updatePropertyListing,
  updatePropertyStatus,
  updatePropertyContract,
  updateSettlementChecklist,
  type PropertyStatus,
  type PropertyContract,
  type SettlementChecklist,
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
  const listingPriceCents = body?.listingPriceCents as number | null | undefined;
  const marketing = body?.marketing as Record<string, unknown> | undefined;
  const settlementChecklist = body?.settlement_checklist as SettlementChecklist | undefined;
  const contract = body?.contract as PropertyContract | undefined;

  if (contract) {
    const updated = await updatePropertyContract(
      session.organisationId,
      id,
      contract,
      session.clerkUserId,
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "property_not_found", message: "Property not found" } },
        { status: 404 },
      );
    }

    const property = await getProperty(session.organisationId, id);
    return NextResponse.json({ data: property });
  }

  if (settlementChecklist) {
    const updated = await updateSettlementChecklist(
      session.organisationId,
      id,
      settlementChecklist,
      session.clerkUserId,
    );

    if (!updated) {
      return NextResponse.json(
        { error: { code: "property_not_found", message: "Property not found" } },
        { status: 404 },
      );
    }

    const property = await getProperty(session.organisationId, id);
    return NextResponse.json({ data: property });
  }

  if (listingPriceCents !== undefined || marketing) {
    const updated = await updatePropertyListing(
      session.organisationId,
      id,
      { listingPriceCents, marketing },
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
