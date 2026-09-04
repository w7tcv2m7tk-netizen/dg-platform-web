import { createReBooking, listReBookings } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const requestedLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(200, Math.floor(requestedLimit)))
    : 50;

  const bookings = await listReBookings(session.organisationId, limit);
  return NextResponse.json({ data: bookings });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  const contactName =
    typeof body.contactName === "string" ? body.contactName.trim() : "";
  if (!contactName) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "contactName required",
        },
      },
      { status: 422 },
    );
  }

  const booking = await createReBooking({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    contactName,
    email: typeof body.email === "string" ? body.email : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    service: typeof body.service === "string" ? body.service : undefined,
    scheduledAt: typeof body.scheduledAt === "string" ? body.scheduledAt : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
    vendorLeadId: typeof body.vendorLeadId === "string" ? body.vendorLeadId : undefined,
  });

  return NextResponse.json({ data: booking }, { status: 201 });
}
