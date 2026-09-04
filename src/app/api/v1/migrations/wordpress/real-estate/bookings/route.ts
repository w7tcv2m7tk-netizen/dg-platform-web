import { syncReBookingsFromWordPress } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchWpRecentBookings } from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * Explicit legacy WordPress → Gen 2 booking migration boundary.
 * This endpoint is not part of the native Real Estate runtime surface.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  if (session.role !== "owner" && session.role !== "admin" && session.role !== "dg:staff") {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Organisation admin access required" } },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const limit =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? Math.max(1, Math.min(200, Math.floor(body.limit)))
      : 100;

  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpRecentBookings(limit, connector);
  if (!wp.ok) {
    return NextResponse.json(
      { error: { code: "wordpress_migration_failed", message: wp.message } },
      { status: 422 },
    );
  }

  const result = await syncReBookingsFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    bookings: wp.bookings,
  });

  return NextResponse.json({
    data: { result },
    boundary: "wordpress_to_platform_only",
  });
}
