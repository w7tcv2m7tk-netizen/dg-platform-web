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
  });

  return NextResponse.json({
    data: resolved,
    meta: { auth: auth.mode },
  });
}
