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
        host: (() => {
          try {
            return new URL(resolved.baseUrl).hostname;
          } catch {
            return null;
          }
        })(),
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
        DG_WP_ACCOMMODATION_API_KEY: Boolean(
          process.env.DG_WP_ACCOMMODATION_API_KEY?.trim(),
        ),
      },
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const preset = body.preset as keyof typeof WP_CONNECTOR_PRESETS | undefined;
  const runProbe = body.probe !== false;

  let patch: { baseUrl?: string; apiKey?: string; label?: string } = {
    baseUrl: body.baseUrl,
    apiKey: body.apiKey,
    label: body.label,
  };

  if (preset && WP_CONNECTOR_PRESETS[preset]) {
    patch = { ...WP_CONNECTOR_PRESETS[preset], apiKey: body.apiKey ?? patch.apiKey };
  }

  if (typeof patch.apiKey === "string" && patch.apiKey.trim()) {
    const key = patch.apiKey.trim();
    const looksOk =
      /^dg(dev|live)?_[A-Za-z0-9]+/i.test(key) || key.length >= 16;
    if (!looksOk) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_api_key",
            message:
              "API key should look like dgdev_… from WordPress → DG Platform → API Settings for this site.",
          },
        },
        { status: 422 },
      );
    }
  }

  const nextBase =
    (patch.baseUrl || "").trim() ||
    (await resolveOrgWordPressConnector(session.organisationId)).baseUrl;
  const isCvhHost = /currumbinvalleyhideaway/i.test(nextBase);
  if (isCvhHost) {
    const existing = await getOrgWordPressConnectorSettings(session.organisationId);
    if (!patch.apiKey?.trim() && !existing?.apiKey?.trim()) {
      return NextResponse.json(
        {
          error: {
            code: "cvh_key_required",
            message:
              "CVH requires a site-specific Dev API key. Paste the key from currumbinvalleyhideaway.com.au — do not rely on Roe/DigitalGate env keys.",
          },
        },
        { status: 422 },
      );
    }
  }

  const updated = await updateOrgWordPressConnectorSettings(
    session.organisationId,
    patch,
  );

  const resolved = await resolveOrgWordPressConnector(session.organisationId);
  const probe = runProbe
    ? await probeWordPressConnector({
        baseUrl: resolved.baseUrl,
        apiKey: resolved.apiKey,
        label: resolved.label,
      })
    : null;

  return NextResponse.json({
    data: {
      baseUrl: updated.baseUrl ?? "",
      label: updated.label ?? "",
      hasApiKey: Boolean(updated.apiKey?.trim()),
      resolvedHasApiKey: Boolean(resolved.apiKey?.trim()),
      resolvedHost: (() => {
        try {
          return new URL(resolved.baseUrl).hostname;
        } catch {
          return null;
        }
      })(),
      probe: probe
        ? probe.ok
          ? {
              ok: true,
              kind: probe.kind,
              detail: probe.detail,
              leadCount: probe.leadCount,
              occupancyRate: probe.occupancyRate,
            }
          : { ok: false, code: probe.code, message: probe.message }
        : null,
    },
  });
}
