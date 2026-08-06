import { NextResponse } from "next/server";
import {
  createPropertyOffer,
  listPropertyOffers,
  updatePropertyOfferStatus,
  type ReOfferStatus,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const propertyId = searchParams.get("propertyId");

  if (!propertyId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "propertyId required" } },
      { status: 422 },
    );
  }

  const offers = await listPropertyOffers(session.organisationId, propertyId);
  if (offers === null) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: offers });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const propertyId = body.propertyId as string | undefined;
  const amountCents = body.amountCents as number | undefined;

  if (!propertyId || !amountCents) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "propertyId and amountCents required" } },
      { status: 422 },
    );
  }

  const offer = await createPropertyOffer(session.organisationId, propertyId, {
    buyerLeadId: body.buyerLeadId,
    buyerName: body.buyerName,
    amountCents,
    conditions: body.conditions,
    actorId: session.clerkUserId,
  });

  if (!offer) {
    return NextResponse.json(
      { error: { code: "property_not_found", message: "Property not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: offer });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => null);
  const propertyId = body?.propertyId as string | undefined;
  const offerId = body?.offerId as string | undefined;
  const status = body?.status as ReOfferStatus | undefined;

  if (!propertyId || !offerId || !status) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "propertyId, offerId, and status required" } },
      { status: 422 },
    );
  }

  const offer = await updatePropertyOfferStatus(
    session.organisationId,
    propertyId,
    offerId,
    status,
    session.clerkUserId,
  );

  if (!offer) {
    return NextResponse.json(
      { error: { code: "offer_not_found", message: "Offer or property not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: offer });
}
