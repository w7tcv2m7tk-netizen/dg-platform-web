import {
  getOrgWordPressConnectorSettings,
  resolveOrgWordPressConnector,
  updateOrgWordPressConnectorSettings,
  WP_CONNECTOR_PRESETS,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { probeWordPressConnector } from "@/lib/dg-api";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const [settings, resolved] = await Promise.all([
    getOrgWordPressConnectorSettings(session.organisationId),
    resolveOrgWordPressConnector(session.organisationId),
  ]);

  const probe = await probeWordPressConnector({
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    label: resolved.label,
  });

  return NextResponse.json({
    data: {
      settings: {
        baseUrl: settings?.baseUrl ?? "",
        label: settings?.label ?? "",
        hasApiKey: Boolean(settings?.apiKey?.trim()),
      },
      resolved: {
        baseUrl: resolved.baseUrl,
        label: resolved.label,
        source: resolved.source,
        hasApiKey: Boolean(resolved.apiKey),
      },
      presets: WP_CONNECTOR_PRESETS,
      probe: probe.ok
        ? {
            ok: true,
            kind: probe.kind,
            detail: probe.detail,
            leadCount: probe.leadCount,
            occupancyRate: probe.occupancyRate,
          }
        : { ok: false, code: probe.code, message: probe.message },
      envFallback: {
        DG_WP_CONNECTOR_API_KEY: Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()),
        DG_WP_CONNECTOR_BASE_URL: Boolean(process.env.DG_WP_CONNECTOR_BASE_URL?.trim()),
      },
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const preset = body.preset as keyof typeof WP_CONNECTOR_PRESETS | undefined;

  let patch: { baseUrl?: string; apiKey?: string; label?: string } = {
    baseUrl: body.baseUrl,
    apiKey: body.apiKey,
    label: body.label,
  };

  if (preset && WP_CONNECTOR_PRESETS[preset]) {
    patch = { ...WP_CONNECTOR_PRESETS[preset], apiKey: body.apiKey ?? patch.apiKey };
  }

  const updated = await updateOrgWordPressConnectorSettings(
    session.organisationId,
    patch,
  );

  return NextResponse.json({
    data: {
      baseUrl: updated.baseUrl ?? "",
      label: updated.label ?? "",
      hasApiKey: Boolean(updated.apiKey?.trim()),
    },
  });
}
