import { resolveAddress } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  authenticatePlatformOrConnector,
  isNextResponse,
} from "@/lib/platform-api";

/** Resolve AU address — session auth or connector API key (WordPress / server) */
export async function POST(req: Request) {
  const auth = await authenticatePlatformOrConnector(req);
  if (isNextResponse(auth)) return auth;

  const body = await req.json().catch(() => null);
  const rawAddress = (body?.rawAddress ?? body?.address ?? body?.property_address ?? "")
    .toString()
    .trim();

  if (!rawAddress) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "rawAddress is required" } },
      { status: 422 },
    );
  }

  const resolved = await resolveAddress(rawAddress, {
    geocode: body?.geocode !== false,
    forceGeocode: Boolean(body?.forceGeocode),
    regionBias:
      typeof body?.regionBias === "string"
        ? body.regionBias
        : "Gold Coast, QLD, Australia",
    // Optional Cotality enrichment when CORELOGIC_* credentials are set.
    // Pass corelogic: false to skip; omit or true to attempt.
    corelogic: body?.corelogic === false ? false : body?.corelogic === true ? true : undefined,
  });

  return NextResponse.json({
    data: resolved,
    meta: {
      auth: auth.mode,
      corelogic:
        resolved.metadata.corelogic_property_id != null
          ? "matched"
          : resolved.metadata.corelogic_error
            ? "error"
            : resolved.metadata.corelogic_source
              ? "no_match"
              : "skipped",
    },
  });
}
