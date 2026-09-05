import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/** Retired normal-runtime sync surface. Legacy import is migration-only. */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  return NextResponse.json(
    {
      error: {
        code: "migration_only",
        message: "Legacy WordPress property import is available only through the migration boundary.",
      },
    },
    { status: 410 },
  );
}
