import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  InfrastructureNotImplementedError,
  dreamscapeEnvPresence,
  getDomainProvider,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
  type DomainAvailability,
  type DreamscapeRequestDebug,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * Node only — Dreamscape auth uses node:crypto; undici proxy needs Node.
 * Server env vars (non-NEXT_PUBLIC) are read at request time here.
 */
export const runtime = "nodejs";

/**
 * GET /api/v1/infrastructure/domains/availability?q=example.com.au
 *
 * Optional staff debug: ?debug=1 (requires platform auth) returns headers
 * sent (names only) and a sanitized Dreamscape response body snippet.
 *
 * Browser → DigitalGate API → Dreamscape (server-side key only).
 * Sandbox-first: defaults to reseller-api.sandbox.ds.network.
 */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const fromArray = url.searchParams.getAll("domain_names[]");
  const query = [q, ...fromArray].filter(Boolean).join(",");
  const debug =
    url.searchParams.get("debug") === "1" ||
    url.searchParams.get("debug") === "true";

  if (!query) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Query parameter q (or domain_names[]) is required",
        },
      },
      { status: 400 },
    );
  }

  // Read at request time — never cache empty env from module init.
  const { baseUrl, isSandbox } = resolveDreamscapeConfig();
  const configured = isDreamscapeConfigured();
  const env = dreamscapeEnvPresence();

  if (!configured) {
    const missing: string[] = [];
    if (!env.hasKey) missing.push("DREAMSCAPE_API_KEY");
    if (!env.hasResellerId) missing.push("DREAMSCAPE_RESELLER_ID");

    return NextResponse.json({
      configured: false,
      provider: null,
      baseUrl,
      isSandbox,
      env,
      data: [] as DomainAvailability[],
      error: {
        code: "provider_not_configured",
        message:
          missing.length > 0
            ? `Domain provider is not configured. Missing: ${missing.join(", ")}.`
            : "Domain provider is not configured. Set DREAMSCAPE_API_KEY and DREAMSCAPE_RESELLER_ID against the sandbox API first.",
        hint: "Vercel → Settings → Environment Variables: set DREAMSCAPE_API_KEY and DREAMSCAPE_RESELLER_ID (e.g. 25735) for Production, Preview, and Development. Server-only (not NEXT_PUBLIC). Redeploy after changes. Reseller Console (sandbox) → Account Settings → API & WHMCS → API Setup.",
      },
    });
  }

  const provider = getDomainProvider();
  if (!provider) {
    return NextResponse.json({
      configured: false,
      provider: null,
      baseUrl,
      isSandbox,
      env,
      data: [] as DomainAvailability[],
      error: {
        code: "provider_not_configured",
        message: "No domain provider available",
      },
    });
  }

  try {
    const data = await provider.search(query);
    const payload: Record<string, unknown> = {
      configured: true,
      provider: provider.id,
      baseUrl,
      isSandbox,
      data,
    };
    if (debug) {
      payload.debug = {
        note: "Request succeeded — auth headers accepted by Dreamscape",
        expectedHeaders: [
          "Accept",
          "Api-Request-Id",
          "Api-Signature",
          "X-Reseller-Id",
          "Reseller-Id",
          "Api-Reseller-Id",
        ],
        expectedQueryKeys: ["domain_names[]", "reseller_id"],
        signatureAlgo: "md5(request_id + api_key)",
      };
    }
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json({
        configured: false,
        provider: provider.id,
        baseUrl,
        isSandbox,
        env,
        data: [] as DomainAvailability[],
        error: { code: err.code, message: err.message },
      });
    }

    if (err instanceof DreamscapeApiError) {
      const errorPayload: Record<string, unknown> = {
        code: err.code ?? "provider_error",
        message: err.message,
        hint: err.hint,
        status: err.status,
      };
      if (err.providerBodySnippet) {
        errorPayload.providerBodySnippet = err.providerBodySnippet;
      }
      if (debug && err.requestDebug) {
        errorPayload.debug = sanitizeRequestDebug(err.requestDebug);
      }

      return NextResponse.json(
        {
          configured: true,
          provider: provider.id,
          baseUrl,
          isSandbox,
          data: [] as DomainAvailability[],
          error: errorPayload,
        },
        {
          status:
            err.status === 401
              ? 502
              : err.status >= 400 && err.status < 500
                ? 400
                : 502,
        },
      );
    }

    if (err instanceof InfrastructureNotImplementedError) {
      return NextResponse.json(
        { error: { code: "not_implemented", message: err.message } },
        { status: 501 },
      );
    }

    const message =
      err instanceof Error ? err.message : "Domain availability check failed";
    return NextResponse.json(
      {
        configured: true,
        provider: provider.id,
        baseUrl,
        isSandbox,
        data: [] as DomainAvailability[],
        error: { code: "provider_error", message },
      },
      { status: 502 },
    );
  }
}

/** Strip anything unexpected from request debug before returning to client. */
function sanitizeRequestDebug(
  debug: DreamscapeRequestDebug,
): DreamscapeRequestDebug {
  return {
    path: debug.path,
    method: debug.method,
    headersSent: [...debug.headersSent],
    resellerIdHeadersSent: [...debug.resellerIdHeadersSent],
    queryKeysSent: [...debug.queryKeysSent],
    hasResellerIdQuery: debug.hasResellerIdQuery,
    signatureAlgo: debug.signatureAlgo,
    isSandbox: debug.isSandbox,
  };
}
