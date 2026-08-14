import {
  createCommercialLease,
  createCommercialProperty,
  listCommercialLeases,
  listCommercialProperties,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") ?? "properties";
  if (kind === "leases") {
    const result = await listCommercialLeases(session.organisationId);
    return NextResponse.json({ data: result.items, meta: result.meta });
  }
  const result = await listCommercialProperties(session.organisationId);
  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "body required" } },
      { status: 422 },
    );
  }

  if (body.kind === "lease") {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "title is required" } },
        { status: 422 },
      );
    }
    const rentRaw = body.rentCents;
    const rentCents =
      typeof rentRaw === "number"
        ? rentRaw
        : typeof rentRaw === "string" && rentRaw.trim()
          ? Number.parseInt(rentRaw, 10)
          : undefined;
    const lease = await createCommercialLease({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      title: body.title,
      commercialPropertyId:
        typeof body.commercialPropertyId === "string"
          ? body.commercialPropertyId
          : undefined,
      stage: typeof body.stage === "string" ? body.stage : undefined,
      landlordContactId:
        typeof body.landlordContactId === "string" ? body.landlordContactId : undefined,
      tenantContactId:
        typeof body.tenantContactId === "string" ? body.tenantContactId : undefined,
      rentCents:
        rentCents !== undefined && !Number.isNaN(rentCents) ? rentCents : undefined,
      startDate: typeof body.startDate === "string" ? body.startDate : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
    });
    return NextResponse.json({ data: lease }, { status: 201 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }
  for (const key of ["addressLine1", "suburb", "state", "postcode"] as const) {
    if (typeof body[key] !== "string" || !(body[key] as string).trim()) {
      return NextResponse.json(
        { error: { code: "validation_error", message: `${key} is required` } },
        { status: 422 },
      );
    }
  }

  const property = await createCommercialProperty({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    name: body.name as string,
    addressLine1: body.addressLine1 as string,
    suburb: body.suburb as string,
    state: body.state as string,
    postcode: body.postcode as string,
    country: typeof body.country === "string" ? body.country : undefined,
    propertyType: typeof body.propertyType === "string" ? body.propertyType : undefined,
  });
  return NextResponse.json({ data: property }, { status: 201 });
}
