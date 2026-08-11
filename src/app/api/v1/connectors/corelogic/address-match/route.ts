import { matchCoreLogicAddress } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  authenticatePlatformOrConnector,
  isNextResponse,
} from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/connectors/corelogic/address-match
 * Auth: platform session or connector API key.
 * Body: { address | q | rawAddress }
 *
 * Returns Cotality propertyId + match metadata. Does not log the address in server logs.
 */
export async function POST(req: Request) {
  const auth = await authenticatePlatformOrConnector(req);
  if (isNextResponse(auth)) return auth;

  const body = await req.json().catch(() => null);
  const address = (
    body?.address ??
    body?.q ??
    body?.rawAddress ??
    body?.property_address ??
    ""
  )
    .toString()
    .trim();

  if (!address) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "address is required" } },
      { status: 422 },
    );
  }

  const result = await matchCoreLogicAddress(address, {
    clientName:
      typeof body?.clientName === "string" ? body.clientName : undefined,
    matchProfileId:
      body?.matchProfileId != null ? body.matchProfileId : undefined,
  });

  if (!result.ok) {
    const status = result.status >= 400 && result.status < 600 ? result.status : 502;
    return NextResponse.json(
      {
        error: {
          code: status === 503 ? "not_configured" : "upstream_error",
          message: result.message,
        },
      },
      { status },
    );
  }

  const { match } = result;
  return NextResponse.json({
    data: {
      propertyId: match.propertyId ?? null,
      matchType: match.matchType ?? null,
      matchRule: match.matchRule ?? null,
      address: match.address ?? null,
      matched: Boolean(match.propertyId) && (match.matchType || "").toUpperCase() !== "N",
    },
    meta: { auth: auth.mode, source: "corelogic.address_match" },
  });
}
