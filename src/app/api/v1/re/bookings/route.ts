import { NextResponse } from "next/server";
import { listReBookings, syncReBookingsFromWordPress } from "@dg/platform-core";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { fetchWpRecentBookings, fetchWpReSummary } from "@/lib/dg-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");
  const source = searchParams.get("source");

  if (view === "summary") {
    const summary = await fetchWpReSummary(30);
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
    const bookings = await fetchWpRecentBookings(limit);
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
    const wp = await fetchWpRecentBookings(100);
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

  return NextResponse.json(
    { error: { code: "unknown_action", message: "Unsupported action" } },
    { status: 400 },
  );
}
