import {
  abrCredentialsConfigured,
  abrGuidEnvKeyPresent,
  getAbrConnectorStatus,
  searchBusinessIdentityByName,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/business-identity/name?q=…
 * Auth-protected ABR name search → shortlist (not ASIC availability).
 * Never returns the authentication GUID.
 */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_request",
          message: "Query param q must be at least 3 characters",
        },
        data: {
          configured: abrCredentialsConfigured(),
          guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        },
      },
      { status: 400 },
    );
  }

  if (!abrCredentialsConfigured()) {
    return NextResponse.json(
      {
        data: {
          connector: "abr",
          method: "ABRSearchByNameAdvancedSimpleProtocol2017",
          status: getAbrConnectorStatus(),
          configured: false,
          guidEnvKeyPresent: abrGuidEnvKeyPresent(),
          query: q,
          matches: [],
          note: "ABR not configured. Paste ABN_LOOKUP_GUID (or ABR_GUID) into server .env.local.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const result = await searchBusinessIdentityByName(q, 12);
    return NextResponse.json({
      data: {
        connector: "abr",
        method: "ABRSearchByNameAdvancedSimpleProtocol2017",
        status: getAbrConnectorStatus(),
        configured: result.configured,
        guidEnvKeyPresent: abrGuidEnvKeyPresent(),
        query: result.query,
        matches: result.matches,
        note: result.note,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ABR name search failed";
    return NextResponse.json(
      {
        error: { code: "upstream_error", message },
        data: {
          configured: true,
          guidEnvKeyPresent: abrGuidEnvKeyPresent(),
          query: q,
          matches: [],
        },
      },
      { status: 502 },
    );
  }
}
