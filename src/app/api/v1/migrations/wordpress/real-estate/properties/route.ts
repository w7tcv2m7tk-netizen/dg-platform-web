import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";
import { syncWordPressProperties } from "@/lib/wordpress-sync";

/** Explicit legacy WordPress → Gen 2 property migration boundary. */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const outcome = await syncWordPressProperties(session);
  if (!outcome.ok) {
    return NextResponse.json(
      { error: { code: "migration_import_failed", message: outcome.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({
    data: {
      direction: "wordpress_to_gen2",
      migrationOnly: true,
      resource: "properties",
      result: outcome.result,
    },
  });
}
