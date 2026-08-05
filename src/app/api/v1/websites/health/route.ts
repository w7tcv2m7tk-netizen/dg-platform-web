import { fetchWpSiteHealth, getWpHealthSite } from "@/lib/dg-api";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";
import { normalizeSiteHealthSnapshot } from "@dg/platform-core";

/** Live site health from WordPress connector(s) */
export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("site");
  const site = getWpHealthSite(siteId);
  const result = await fetchWpSiteHealth(site.id);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: result.code,
          message: result.message,
        },
        meta: {
          siteId: site.id,
          connectorBaseUrl: site.baseUrl,
          organisationId: session.organisationId,
        },
      },
      { status: result.status ?? (result.code === "missing_api_key" ? 503 : 502) },
    );
  }

  return NextResponse.json({
    data: normalizeSiteHealthSnapshot(result.payload),
    meta: {
      siteId: site.id,
      siteLabel: site.label,
      connectorBaseUrl: site.baseUrl,
      organisationId: session.organisationId,
    },
  });
}
