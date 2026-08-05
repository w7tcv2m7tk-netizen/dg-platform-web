import { fetchWpSiteHealth, getWpConnectorBase } from "@/lib/dg-api";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";
import { normalizeSiteHealthSnapshot } from "@dg/platform-core";

/** Live site health from Roe WordPress connector */
export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const result = await fetchWpSiteHealth();

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: result.code,
          message: result.message,
        },
        meta: {
          connectorBaseUrl: getWpConnectorBase(),
          organisationId: session.organisationId,
        },
      },
      { status: result.status ?? (result.code === "missing_api_key" ? 503 : 502) },
    );
  }

  return NextResponse.json({
    data: normalizeSiteHealthSnapshot(result.payload),
    meta: {
      connectorBaseUrl: getWpConnectorBase(),
      organisationId: session.organisationId,
    },
  });
}
