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
  const {
    activeEndpoint,
    isSandbox,
    apiMode,
    soapEndpoint,
    soapEnv,
    soapHost,
    baseUrl,
  } = resolveDreamscapeConfig();
  const configured = isDreamscapeConfigured();
  const env = dreamscapeEnvPresence();
  const displayEndpoint = apiMode === "soap" ? soapEndpoint : baseUrl;

  if (!configured) {
    const missing: string[] = [];
    if (!env.hasKey) missing.push("DREAMSCAPE_API_KEY");
    if (apiMode === "soap" && !env.hasResellerId) {
      missing.push("DREAMSCAPE_RESELLER_ID");
    }

    return NextResponse.json({
      configured: false,
      provider: null,
      apiMode,
      baseUrl: displayEndpoint,
      restBaseUrl: baseUrl,
      soapEndpoint,
      soapEnv,
      soapHost,
      isSandbox,
      env,
      data: [] as DomainAvailability[],
      error: {
        code: "provider_not_configured",
        message:
          missing.length > 0
            ? `Domain provider is not configured. Missing: ${missing.join(", ")}.`
            : "Domain provider is not configured.",
        hint:
          apiMode === "soap"
            ? "SOAP mode: set DREAMSCAPE_API_KEY + DREAMSCAPE_RESELLER_ID from API Setup. Live console → DREAMSCAPE_SOAP_ENV=production → https://soap.secureapi.com.au/API-1.3. Sandbox → DREAMSCAPE_SOAP_ENV=sandbox (soap-test …/API-1.3). Never use …/server.php (empty body). Redeploy after Vercel env changes."
            : "REST mode: set DREAMSCAPE_API_KEY (Api-Request-Id + Api-Signature). If support insists on Reseller ID, set DREAMSCAPE_RESELLER_ID (auto-selects SOAP) or DREAMSCAPE_API_MODE=soap.",
      },
    });
  }

  const provider = getDomainProvider();
  if (!provider) {
    return NextResponse.json({
      configured: false,
      provider: null,
      apiMode,
      baseUrl: displayEndpoint,
      soapEnv,
      soapHost,
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
      apiMode,
      baseUrl: activeEndpoint,
      restBaseUrl: baseUrl,
      soapEndpoint,
      soapEnv,
      soapHost,
      isSandbox,
      data,
    };
    if (debug) {
      payload.debug =
        apiMode === "soap"
          ? {
              note: "SOAP DomainCheck — Authenticate header (ResellerID + APIKey)",
              endpoint: soapEndpoint,
              soapEnv,
              soapHost,
              soapAction: "urn:API-1.3#API-1.3Server#DomainCheck",
              auth: "SOAP header Authenticate",
            }
          : {
              note: "REST request succeeded — auth headers accepted by Dreamscape",
              expectedHeaders: ["Accept", "Api-Request-Id", "Api-Signature"],
              expectedQueryKeys: ["domain_names[]"],
              signatureAlgo: "md5(request_id + api_key)",
              sendResellerId: env.sendResellerId,
            };
    }
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json({
        configured: false,
        provider: provider.id,
        apiMode,
        baseUrl: activeEndpoint,
        soapEnv,
        soapHost,
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
          apiMode,
          baseUrl: activeEndpoint,
          soapEndpoint,
          soapEnv,
          soapHost,
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
        apiMode,
        baseUrl: activeEndpoint,
        soapEnv,
        soapHost,
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
    sendResellerId: debug.sendResellerId,
    signatureAlgo: debug.signatureAlgo,
    isSandbox: debug.isSandbox,
    apiMode: debug.apiMode,
  };
}
