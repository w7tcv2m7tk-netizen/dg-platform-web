import {
  normalizeSiteHealthSnapshot,
  organisationHasWordPressConnector,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchWpSiteHealth, getWpHealthSite } from "@/lib/dg-api";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/** Explicit WordPress connector diagnostic — not a normal Gen 2 health path. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const { searchParams } = new URL(req.url);
  if (searchParams.get("view") !== "wordpress") {
    return NextResponse.json(
      {
        error: {
          code: "not_found",
          message: "WordPress health is an explicit diagnostic view only",
        },
      },
      { status: 404 },
    );
  }

  const hasConnector = await organisationHasWordPressConnector(
    session.organisationId,
  );
  if (!hasConnector) {
    return NextResponse.json(
      {
        error: {
          code: "not_found",
          message: "WordPress health is an explicit diagnostic view only",
        },
      },
      { status: 404 },
    );
  }

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
