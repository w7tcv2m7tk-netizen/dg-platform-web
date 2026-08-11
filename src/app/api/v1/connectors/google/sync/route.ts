import { syncOrgGoogleGbp } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** POST /api/v1/connectors/google/sync — pull accounts, locations, reviews (if allowed). */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const result = await syncOrgGoogleGbp(session.organisationId);

  return NextResponse.json(
    {
      data: {
        ok: result.ok,
        syncedAt: result.syncedAt,
        health: result.health,
        accounts: result.accounts,
        locations: result.locations,
        reviewsCached: result.reviews.length,
        reviewsAttempted: result.reviewsAttempted,
        reviewsOk: result.reviewsOk,
        reviewsBlockedReason: result.health.reviewsBlockedReason ?? null,
        errors: result.errors,
        message: result.health.message,
      },
    },
    { status: result.ok ? 200 : result.health.status === "disconnected" ? 400 : 502 },
  );
}
