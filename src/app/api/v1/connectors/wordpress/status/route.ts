import { resolveOrgWordPressConnector } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { fetchWpVendorLeads } from "@/lib/dg-api";
import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

/** Explicit legacy migration diagnostic. Never used by normal Gen 2 runtime. */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requirePermission(session, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });
  if (denied) return denied;

  const resolved = await resolveOrgWordPressConnector(session.organisationId);
  const probe = await fetchWpVendorLeads(5, {
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    label: resolved.label,
  });

  return NextResponse.json({
    data: {
      migrationOnly: true,
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
        : { ok: false, code: probe.code, message: probe.message, httpStatus: probe.status },
    },
  });
}
