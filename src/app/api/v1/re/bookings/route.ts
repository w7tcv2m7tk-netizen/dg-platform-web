import { listReBookings, syncReBookingsFromWordPress, createReBooking } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchWpRecentBookings, fetchWpReSummary } from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const source = searchParams.get("source");
  const connector = await wpConnectorForOrg(session.organisationId);

  if (view === "summary") {
    const summary = await fetchWpReSummary(30, connector);
    if (!summary.ok) {
      return NextResponse.json(
        { error: { code: summary.code, message: summary.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: summary.data });
  }

  const limit = Number(searchParams.get("limit") ?? 50);

  if (source === "wp") {
    const bookings = await fetchWpRecentBookings(limit, connector);
    if (!bookings.ok) {
      return NextResponse.json(
        { error: { code: bookings.code, message: bookings.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: bookings.bookings });
  }

  const bookings = await listReBookings(session.organisationId, limit);
  return NextResponse.json({ data: bookings });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));

  if (body.action === "sync_wordpress") {
    const connector = await wpConnectorForOrg(session.organisationId);
    const wp = await fetchWpRecentBookings(100, connector);
    if (!wp.ok) {
      return NextResponse.json(
        { error: { code: "sync_failed", message: wp.message } },
        { status: 422 },
      );
    }
    const result = await syncReBookingsFromWordPress({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      bookings: wp.bookings,
    });
    return NextResponse.json({ data: result });
  }

  const contactName =
    typeof body.contactName === "string" ? body.contactName.trim() : "";
  if (!contactName) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "contactName required (or action: sync_wordpress)",
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
