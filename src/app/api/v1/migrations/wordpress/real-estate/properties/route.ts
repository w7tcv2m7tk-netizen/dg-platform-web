import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { syncWordPressProperties } from "@/lib/wordpress-sync";

/**
 * Explicit legacy WordPress → Gen 2 property migration boundary.
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

  const outcome = await syncWordPressProperties(session);
  if (!outcome.ok) {
    return NextResponse.json(
      {
        error: {
          code: "wordpress_migration_failed",
          message: outcome.message,
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: { result: outcome.result },
    boundary: "wordpress_to_platform_only",
  });
}
