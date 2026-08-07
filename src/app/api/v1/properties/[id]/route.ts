import {
  geocodePropertyAddress,
  getProperty,
  listPropertyActivities,
  PROPERTY_STATUSES,
  publishPropertyToWordPress,
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

  if (body?.action === "publish_to_website") {
    const result = await publishPropertyToWordPress({
      organisationId: session.organisationId,
      propertyId: id,
      actorId: session.clerkUserId,
      force: Boolean(body.force),
    });

    if (!result.ok) {
      const status =
        result.reason === "not_found"
          ? 404
          : result.reason === "skipped_status"
            ? 422
            : 502;
      return NextResponse.json(
        { error: { code: result.reason, message: result.message } },
        { status },
      );
    }

    const property = await getProperty(session.organisationId, id);
    return NextResponse.json({ data: { property, publish: result } });
  }

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

  if (listingPriceCents !== undefined || marketing || body?.images || body?.propertyType !== undefined || body?.bedrooms !== undefined || body?.bathrooms !== undefined || body?.details || body?.inspectionTimes !== undefined) {
    const details = (body?.details as Record<string, unknown> | undefined) ?? {};
    const updated = await updatePropertyListing(
      session.organisationId,
      id,
      {
        listingPriceCents,
        marketing: marketing ?? (details.marketing as Record<string, unknown> | undefined),
        propertyType:
          (body?.propertyType as string | null | undefined) ??
          (details.propertyType as string | null | undefined),
        bedrooms:
          (body?.bedrooms as number | null | undefined) ??
          (details.bedrooms as number | null | undefined),
        bathrooms:
          (body?.bathrooms as number | null | undefined) ??
          (details.bathrooms as number | null | undefined),
        images:
          (body?.images as string[] | undefined) ??
          (details.images as string[] | undefined),
        carSpaces:
          (body?.carSpaces as number | null | undefined) ??
          (details.carSpaces as number | null | undefined),
        landSize:
          (body?.landSize as string | null | undefined) ??
          (details.landSize as string | null | undefined),
        buildingSize:
          (body?.buildingSize as string | null | undefined) ??
          (details.buildingSize as string | null | undefined),
        inspectionTimes:
          (body?.inspectionTimes as string | null | undefined) ??
          (details.inspectionTimes as string | null | undefined),
        syncToWebsite: body?.syncToWebsite !== false,
      },
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
