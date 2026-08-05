import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";
import { fetchWpRecentBookings, fetchWpReSummary } from "@/lib/dg-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view");

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
  const bookings = await fetchWpRecentBookings(limit);
  if (!bookings.ok) {
    return NextResponse.json(
      { error: { code: bookings.code, message: bookings.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: bookings.bookings });
}
