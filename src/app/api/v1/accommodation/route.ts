import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";
import {
  fetchWpAccommodationBookings,
  fetchWpAccommodationSummary,
  fetchWpAccommodationUnits,
  listWpAccommodationSites,
} from "@/lib/dg-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const resource = searchParams.get("resource") ?? "summary";

  if (resource === "sites") {
    return NextResponse.json({ data: listWpAccommodationSites() });
  }

  if (resource === "units") {
    const units = await fetchWpAccommodationUnits(siteId);
    if (!units.ok) {
      return NextResponse.json(
        { error: { code: units.code, message: units.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: units.units, meta: { site: units.site } });
  }

  if (resource === "bookings") {
    const limit = Number(searchParams.get("limit") ?? 50);
    const bookings = await fetchWpAccommodationBookings(siteId, limit);
    if (!bookings.ok) {
      return NextResponse.json(
        { error: { code: bookings.code, message: bookings.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({
      data: bookings.bookings,
      meta: { total: bookings.total, site: bookings.site },
    });
  }

  const summary = await fetchWpAccommodationSummary(siteId);
  if (!summary.ok) {
    return NextResponse.json(
      { error: { code: summary.code, message: summary.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: summary.data });
}
