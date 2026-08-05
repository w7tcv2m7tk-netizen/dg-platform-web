import { fetchWpVendorLeads, getWpConnectorBase } from "@/lib/dg-api";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

/** Debug WordPress connector config — does not expose API keys */
export async function GET() {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const hasDgApiKey = Boolean(process.env.DG_API_KEY?.trim());
  const hasConnectorKey = Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim());
  const baseUrl = getWpConnectorBase();

  const probe = await fetchWpVendorLeads(5);

  return NextResponse.json({
    data: {
      connectorBaseUrl: baseUrl,
      env: {
        DG_API_KEY: hasDgApiKey,
        DG_WP_CONNECTOR_API_KEY: hasConnectorKey,
        usingKey: hasConnectorKey
          ? "DG_WP_CONNECTOR_API_KEY"
          : hasDgApiKey
            ? "DG_API_KEY (fallback)"
            : "none",
      },
      probe: probe.ok
        ? { ok: true, leadCount: probe.leads.length }
        : {
            ok: false,
            code: probe.code,
            message: probe.message,
            httpStatus: probe.status,
          },
    },
  });
}
