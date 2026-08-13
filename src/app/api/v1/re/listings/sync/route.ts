import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { syncWordPressProperties } from "@/lib/wordpress-sync";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const outcome = await syncWordPressProperties(session);
  if (!outcome.ok) {
    return NextResponse.json(
      { error: { code: "sync_failed", message: outcome.message } },
      { status: 502 },
    );
  }

  return NextResponse.json({ data: { result: outcome.result } });
}
