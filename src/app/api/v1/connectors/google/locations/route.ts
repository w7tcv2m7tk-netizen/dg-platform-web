import { getOrgGbpSyncSnapshot } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/google/locations — cached GBP locations (run sync first). */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const snapshot = await getOrgGbpSyncSnapshot(session.organisationId);
  if (!snapshot) {
    return NextResponse.json(
      {
        error: {
          code: "not_connected",
          message: "Google Business Profile is not connected for this organisation",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: {
      health: snapshot.health,
      accounts: snapshot.accounts,
      locations: snapshot.locations,
      reviewsCached: snapshot.reviews.length,
      reviewsAvailable: snapshot.health.reviewsAvailable ?? false,
      reviewsBlockedReason: snapshot.health.reviewsBlockedReason ?? null,
    },
  });
}
