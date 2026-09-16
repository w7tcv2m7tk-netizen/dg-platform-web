import {
  discoverOrgGoogleAnalyticsProperties,
  discoverOrgGoogleSearchConsoleSites,
  getOrgGoogleGbpConnectorTokens,
  googleCredentialsConfigured,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const dynamic = "force-dynamic";

/** GET /api/v1/connectors/google/analytics/status */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const tokens = await getOrgGoogleGbpConnectorTokens(session.organisationId);
  const connected = Boolean(tokens?.accessToken || tokens?.refreshToken);
  if (!connected) {
    return NextResponse.json({ data: { platform: { configured: googleCredentialsConfigured() }, organisation: { connected: false, properties: [], sites: [] } } });
  }

  const [analytics, searchConsole] = await Promise.all([
    discoverOrgGoogleAnalyticsProperties(session.organisationId),
    discoverOrgGoogleSearchConsoleSites(session.organisationId),
  ]);

  return NextResponse.json({
    data: {
      platform: { configured: googleCredentialsConfigured() },
      organisation: {
        connected: true,
        scope: tokens?.scope ?? null,
        analytics: analytics.ok ? { available: true, properties: analytics.properties, error: null } : { available: false, properties: [], error: analytics.message },
        searchConsole: searchConsole.ok ? { available: true, sites: searchConsole.sites, error: null } : { available: false, sites: [], error: searchConsole.message },
      },
    },
  });
}
