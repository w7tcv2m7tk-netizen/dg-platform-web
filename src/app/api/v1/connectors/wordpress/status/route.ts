import { resolveOrgWordPressConnector } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchWpVendorLeads } from "@/lib/dg-api";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/** Debug WordPress connector config — does not expose API keys */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const resolved = await resolveOrgWordPressConnector(session.organisationId);
  const probe = await fetchWpVendorLeads(5, {
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    label: resolved.label,
  });

  return NextResponse.json({
    data: {
      connectorBaseUrl: resolved.baseUrl,
      label: resolved.label,
      source: resolved.source,
      env: {
        DG_API_KEY: Boolean(process.env.DG_API_KEY?.trim()),
        DG_WP_CONNECTOR_API_KEY: Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()),
        hasEffectiveKey: Boolean(resolved.apiKey),
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
