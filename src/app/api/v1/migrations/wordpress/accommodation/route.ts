import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { migrateAccommodationFromWordPress } from "@/lib/wordpress-migration";

/**
 * Explicit legacy migration boundary.
 * This endpoint is not part of the native Accommodation runtime surface.
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
  const resource =
    body.resource === "units" || body.resource === "bookings" ? body.resource : "all";
  const outcome = await migrateAccommodationFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    resource,
    limit: typeof body.limit === "number" ? body.limit : undefined,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        error: {
          code: "wordpress_migration_failed",
          message: outcome.message,
          resource: outcome.resource,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: outcome });
}
