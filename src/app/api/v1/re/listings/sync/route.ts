import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * Retired runtime sync route.
 * WordPress property import is available only through the explicit migration boundary.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  return NextResponse.json(
    {
      error: {
        code: "migration_only",
        message: "Legacy WordPress property import is migration-only.",
      },
      migrationPath: "/api/v1/migrations/wordpress/real-estate/properties",
    },
    { status: 410 },
  );
}
