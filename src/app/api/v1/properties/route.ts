import {
  createProperty,
  createPropertyFromLead,
  listProperties,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const result = await listProperties({
    organisationId: session.organisationId,
    status,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);

  if (body?.action === "from_lead") {
    const leadId = body.leadId as string | undefined;
    if (!leadId) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "leadId required" } },
        { status: 422 },
      );
    }

    const property = await createPropertyFromLead({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      leadId,
      addressLine1: body.addressLine1,
      suburb: body.suburb,
      state: body.state,
      postcode: body.postcode,
    });

    if (!property) {
      return NextResponse.json(
        { error: { code: "lead_not_found", message: "Lead not found" } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: property }, { status: 201 });
  }

  const rawAddress = (body?.rawAddress ?? body?.addressLine1 ?? "").toString().trim();
  const suburb = (body?.suburb ?? "").toString().trim();
  const state = (body?.state ?? "QLD").toString().trim();
  const postcode = (body?.postcode ?? "0000").toString().trim();

  if (!rawAddress) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "rawAddress or addressLine1 is required",
        },
      },
      { status: 422 },
    );
  }

  const property = await createProperty({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    addressLine1: rawAddress,
    addressLine2: body.addressLine2,
    suburb: suburb || "Gold Coast",
    state,
    postcode,
    status: body.status,
    propertyType: body.propertyType,
    ownerContactId: body.ownerContactId,
    leadId: body.leadId,
    listingPriceCents: body.listingPriceCents,
  });

  return NextResponse.json({ data: property }, { status: 201 });
}
