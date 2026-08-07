import { NextResponse } from "next/server";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import {
  fetchWpAccommodationBookings,
  fetchWpAccommodationHousekeeping,
  fetchWpAccommodationSummary,
  fetchWpAccommodationUnits,
  listWpAccommodationSites,
  patchWpAccommodationHousekeeping,
} from "@/lib/dg-api";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const resource = searchParams.get("resource") ?? "summary";
  const connector = await accommodationConnectorForSession(session.organisationId);

  if (resource === "sites") {
    return NextResponse.json({ data: listWpAccommodationSites() });
  }

  if (resource === "units") {
    const units = await fetchWpAccommodationUnits(siteId, connector);
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
    const bookings = await fetchWpAccommodationBookings(siteId, limit, connector);
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

  if (resource === "housekeeping") {
    const board = await fetchWpAccommodationHousekeeping(siteId, connector);
    if (!board.ok) {
      return NextResponse.json(
        { error: { code: board.code, message: board.message } },
        { status: 422 },
      );
    }
    return NextResponse.json({
      data: {
        items: board.items,
        summary: board.summary,
        statuses: board.statuses,
      },
      meta: { site: board.site },
    });
  }

  const summary = await fetchWpAccommodationSummary(siteId, 30, connector);
  if (!summary.ok) {
    return NextResponse.json(
      { error: { code: summary.code, message: summary.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: summary.data });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const updates = Array.isArray(body.updates) ? body.updates : [];
  if (!updates.length) {
    return NextResponse.json(
      { error: { code: "missing_updates", message: "updates[] is required" } },
      { status: 400 },
    );
  }

  const connector = await accommodationConnectorForSession(session.organisationId);
  const result = await patchWpAccommodationHousekeeping(updates, connector);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result.data });
}
