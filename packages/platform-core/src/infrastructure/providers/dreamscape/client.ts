import {
  DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER,
  buildDreamscapeAuthHeaders,
} from "./auth";
import {
  DREAMSCAPE_SOAP_PROD_ENDPOINT,
  DREAMSCAPE_SOAP_SANDBOX_ENDPOINT,
} from "./soap";

export const DREAMSCAPE_PROD_BASE_URL = "https://reseller-api.ds.network";
export const DREAMSCAPE_SANDBOX_BASE_URL =
  "https://reseller-api.sandbox.ds.network";

/** REST (doc-reseller-api) vs SOAP SecureAPI (Reseller ID + API Key). */
export type DreamscapeApiMode = "soap" | "rest";

/** Dreamscape keys are 32 lowercase alphanumeric chars (docs FAQ). */
const DREAMSCAPE_API_KEY_RE = /^[a-f0-9]{32}$/;

/**
 * Normalize API key from env: trim whitespace and strip wrapping quotes
 * (common Vercel / .env paste mistakes that cause 401).
 */
export function normalizeDreamscapeApiKey(
  raw: string | undefined | null,
): string | null {
  if (raw == null) return null;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  return key || null;
}

export function isDreamscapeApiKeyFormatValid(apiKey: string): boolean {
  return DREAMSCAPE_API_KEY_RE.test(apiKey);
}

/**
 * Reseller ID from API Setup. Required for SOAP; optional for REST
 * (REST only sends it when DREAMSCAPE_SEND_RESELLER_ID=true).
 */
export function normalizeDreamscapeResellerId(
  raw: string | undefined | null,
): string | null {
  if (raw == null) return null;
  const id = raw.trim().replace(/^["']|["']$/g, "").trim();
  return id || null;
}

/** Extra Reseller ID header name override (still sends the standard trio). */
export function resolveDreamscapeResellerIdHeader(): string {
  const configured = readServerEnv("DREAMSCAPE_RESELLER_ID_HEADER")?.trim();
  return configured || DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER;
}

/**
 * Opt-in Reseller ID headers/query on REST only (support experiments).
 * Official REST docs use Api-Request-Id + Api-Signature only.
 * SOAP always authenticates with Reseller ID in the Authenticate header.
 */
export function shouldSendDreamscapeResellerId(): boolean {
  const raw = readServerEnv("DREAMSCAPE_SEND_RESELLER_ID")?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * API mode selection:
 * - DREAMSCAPE_API_MODE=soap|rest wins when set
 * - else SOAP when DREAMSCAPE_RESELLER_ID is set (API Setup / WHMCS pattern)
 * - else REST (doc-reseller-api signature auth)
 */
export function resolveDreamscapeApiMode(): DreamscapeApiMode {
  const raw = readServerEnv("DREAMSCAPE_API_MODE")?.trim().toLowerCase();
  if (raw === "soap" || raw === "rest") return raw;
  if (normalizeDreamscapeResellerId(readServerEnv("DREAMSCAPE_RESELLER_ID"))) {
    return "soap";
  }
  return "rest";
}

/**
 * Optional HTTPS proxy for Dreamscape egress (Fixie / QuotaGuard / similar).
 * Prefer `DREAMSCAPE_HTTPS_PROXY`; falls back to standard `HTTPS_PROXY` /
 * `https_proxy`. When set, all `dreamscapeFetch` calls tunnel through it so
 * Dreamscape can whitelist the proxy’s static outbound IP.
 */
export function resolveDreamscapeHttpsProxy(): string | null {
  const raw =
    readServerEnv("DREAMSCAPE_HTTPS_PROXY")?.trim() ||
    readServerEnv("HTTPS_PROXY")?.trim() ||
    readServerEnv("https_proxy")?.trim() ||
    "";
  return raw || null;
}

/**
 * Read server env at request time via bracket access.
 * Avoids accidental build-time inlining of empty values when identifier
 * form `process.env.FOO` is statically analyzed / bundled.
 * Server-only — never call from client components.
 */
function readServerEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" ? value : undefined;
}

/** Safe env presence for API debug — never includes secret values. */
export type DreamscapeEnvPresence = {
  hasKey: boolean;
  hasResellerId: boolean;
  hasBaseUrl: boolean;
  /** True when DREAMSCAPE_SEND_RESELLER_ID opt-in is enabled (REST only). */
  sendResellerId: boolean;
  apiMode: DreamscapeApiMode;
  /** Normalized key length (0 when missing). Never the key itself. */
  keyLength: number;
};

export function dreamscapeEnvPresence(): DreamscapeEnvPresence {
  const apiKey = normalizeDreamscapeApiKey(readServerEnv("DREAMSCAPE_API_KEY"));
  const resellerId = normalizeDreamscapeResellerId(
    readServerEnv("DREAMSCAPE_RESELLER_ID"),
  );
  const baseUrl = readServerEnv("DREAMSCAPE_API_BASE_URL")?.trim();
  return {
    hasKey: Boolean(apiKey),
    hasResellerId: Boolean(resellerId),
    hasBaseUrl: Boolean(baseUrl),
    sendResellerId: shouldSendDreamscapeResellerId(),
    apiMode: resolveDreamscapeApiMode(),
    keyLength: apiKey?.length ?? 0,
  };
}

type ProxyDispatcher = { close?: () => Promise<void> };

let cachedProxy: {
  url: string;
  dispatcher: ProxyDispatcher;
  fetch: typeof fetch;
} | null = null;

/** Test helper — clears cached ProxyAgent between cases. */
export function resetDreamscapeProxyDispatcherCache(): void {
  cachedProxy = null;
}

/**
 * Load undici only when a proxy is configured (Node runtime).
 * Opaque import() so Turbopack/webpack do not pull undici into the client
 * bundle — `@dg/platform-core` is imported by client components via the barrel.
 */
async function loadUndici(): Promise<typeof import("undici")> {
  const importer = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<typeof import("undici")>;
  return importer("undici");
}

async function resolveProxiedFetch(proxyUrl: string): Promise<{
  fetch: typeof fetch;
  dispatcher: ProxyDispatcher;
}> {
  if (cachedProxy?.url === proxyUrl) {
    return { fetch: cachedProxy.fetch, dispatcher: cachedProxy.dispatcher };
  }

  const undici = await loadUndici();
  const dispatcher = new undici.ProxyAgent(proxyUrl);
  const proxiedFetch = undici.fetch as unknown as typeof fetch;
  cachedProxy = { url: proxyUrl, dispatcher, fetch: proxiedFetch };
  return { fetch: proxiedFetch, dispatcher };
}

/**
 * Resolve SOAP endpoint. Override with DREAMSCAPE_SOAP_ENDPOINT.
 * Sandbox-first: soap-test unless REST base is explicitly production
 * (reseller-api.ds.network without sandbox) or SOAP endpoint override says so.
 */
export function resolveDreamscapeSoapEndpoint(opts?: {
  restBaseUrl?: string;
}): { endpoint: string; isSandbox: boolean } {
  const override = readServerEnv("DREAMSCAPE_SOAP_ENDPOINT")?.trim();
  if (override) {
    const isSandbox = /soap-test|sandbox/i.test(override);
    return { endpoint: override.replace(/\/$/, ""), isSandbox };
  }
  const restBase =
    opts?.restBaseUrl ??
    readServerEnv("DREAMSCAPE_API_BASE_URL")?.trim() ??
    DREAMSCAPE_SANDBOX_BASE_URL;
  const restIsProd =
    /reseller-api\.ds\.network/i.test(restBase) &&
    !/sandbox/i.test(restBase);
  if (restIsProd) {
    return { endpoint: DREAMSCAPE_SOAP_PROD_ENDPOINT, isSandbox: false };
  }
  return { endpoint: DREAMSCAPE_SOAP_SANDBOX_ENDPOINT, isSandbox: true };
}

/**
 * Resolve Dreamscape config at call/request time (not module init).
 * Trims / strip-quotes via normalize helpers. Server-only.
 *
 * REST: Api-Request-Id + Api-Signature (Reseller ID opt-in via SEND_RESELLER_ID).
 * SOAP: Reseller ID + API Key in Authenticate SOAP header.
 */
export function resolveDreamscapeConfig(): {
  apiKey: string | null;
  resellerId: string | null;
  resellerIdHeader: string;
  sendResellerId: boolean;
  apiMode: DreamscapeApiMode;
  baseUrl: string;
  soapEndpoint: string;
  activeEndpoint: string;
  isSandbox: boolean;
  httpsProxy: string | null;
} {
  const apiKey = normalizeDreamscapeApiKey(readServerEnv("DREAMSCAPE_API_KEY"));
  const resellerId = normalizeDreamscapeResellerId(
    readServerEnv("DREAMSCAPE_RESELLER_ID"),
  );
  const apiMode = resolveDreamscapeApiMode();
  const configured = readServerEnv("DREAMSCAPE_API_BASE_URL")?.trim();
  const baseUrl = (configured || DREAMSCAPE_SANDBOX_BASE_URL).replace(/\/$/, "");
  const soap = resolveDreamscapeSoapEndpoint({ restBaseUrl: baseUrl });
  const isSandbox =
    apiMode === "soap" ? soap.isSandbox : baseUrl.includes("sandbox");
  return {
    apiKey,
    resellerId,
    resellerIdHeader: resolveDreamscapeResellerIdHeader(),
    sendResellerId: shouldSendDreamscapeResellerId(),
    apiMode,
    /** REST base URL (always). For the active transport URL see activeEndpoint. */
    baseUrl,
    soapEndpoint: soap.endpoint,
    /** Endpoint currently used for provider calls (SOAP or REST). */
    activeEndpoint: apiMode === "soap" ? soap.endpoint : baseUrl,
    isSandbox,
    httpsProxy: resolveDreamscapeHttpsProxy(),
  };
}

/**
 * REST: API key only.
 * SOAP: API key + Reseller ID (API Setup credentials).
 */
export function isDreamscapeConfigured(): boolean {
  const { apiKey, resellerId, apiMode } = resolveDreamscapeConfig();
  if (!apiKey) return false;
  if (apiMode === "soap") return Boolean(resellerId);
  return true;
}

/** Safe request metadata for staff debug — never includes API key or signature. */
export type DreamscapeRequestDebug = {
  path: string;
  method: string;
  headersSent: string[];
  resellerIdHeadersSent: string[];
  queryKeysSent: string[];
  hasResellerIdQuery: boolean;
  sendResellerId: boolean;
  signatureAlgo: "md5(request_id + api_key)";
  isSandbox: boolean;
  apiMode?: DreamscapeApiMode;
};

/**
 * Sanitize Dreamscape error body for API responses — truncate, strip anything
 * that looks like a key/signature hex blob beyond a short excerpt.
 */
export function sanitizeDreamscapeBodySnippet(
  body: unknown,
  maxLen = 400,
): string | null {
  if (body == null) return null;
  let text: string;
  if (typeof body === "string") {
    text = body;
  } else {
    try {
      text = JSON.stringify(body);
    } catch {
      text = String(body);
    }
  }
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  // Redact long hex strings that could be keys/signatures (32+ hex chars).
  text = text.replace(/\b[a-f0-9]{32,}\b/gi, "[redacted]");
  if (text.length > maxLen) {
    return `${text.slice(0, maxLen)}…`;
  }
  return text;
}

export class DreamscapeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code?: string;
  readonly hint?: string;
  /** Sanitized provider response excerpt (safe for clients). */
  readonly providerBodySnippet?: string | null;
  /** Staff debug metadata (headers/query names only — no secrets). */
  readonly requestDebug?: DreamscapeRequestDebug;

  constructor(
    status: number,
    message: string,
    body?: unknown,
    opts?: {
      code?: string;
      hint?: string;
      providerBodySnippet?: string | null;
      requestDebug?: DreamscapeRequestDebug;
    },
  ) {
    super(message);
    this.name = "DreamscapeApiError";
    this.status = status;
    this.body = body;
    this.code = opts?.code;
    this.hint = opts?.hint;
    this.providerBodySnippet = opts?.providerBodySnippet;
    this.requestDebug = opts?.requestDebug;
  }
}

/** User-facing 401 guidance — never echo the key. */
export function describeDreamscapeAuthFailure(
  isSandbox: boolean,
  apiKey: string,
  opts?: { sendResellerId?: boolean; apiMode?: DreamscapeApiMode },
): { code: string; message: string; hint: string } {
  if (!isDreamscapeApiKeyFormatValid(apiKey)) {
    return {
      code: "auth_invalid_key_format",
      message:
        "Dreamscape API key format is invalid (expected 32 lowercase alphanumeric characters).",
      hint: "Trim spaces and remove wrapping quotes from DREAMSCAPE_API_KEY. Example shape: c4ca4238a0b923820dcc509a6f75849b (docs example only — not a real key).",
    };
  }

  if (opts?.apiMode === "soap") {
    return {
      code: isSandbox
        ? "auth_soap_sandbox_rejected"
        : "auth_soap_production_rejected",
      message:
        "Dreamscape SOAP rejected the request (401). Reseller ID + API Key auth failed.",
      hint: isSandbox
        ? "1) DREAMSCAPE_RESELLER_ID + DREAMSCAPE_API_KEY from API & WHMCS → API Setup. 2) DREAMSCAPE_API_MODE=soap (or leave unset when Reseller ID is set). 3) Sandbox SOAP: https://soap-test.secureapi.com.au/server.php?v=1.3. 4) Support’s Reseller ID pattern is SOAP — not REST Api-Signature. 5) Redeploy after env changes."
        : "1) Live Reseller ID + API Key. 2) Production SOAP: https://soap.secureapi.com.au/server.php?v=1.3. 3) DREAMSCAPE_API_MODE=soap. 4) Whitelist egress if required. 5) Redeploy.",
    };
  }

  if (isSandbox) {
    return {
      code: "auth_sandbox_key_rejected",
      message:
        "Dreamscape REST sandbox rejected the request (401). Usual causes: wrong sandbox key, key/base URL mismatch, or regenerated key not redeployed.",
      hint: "1) Key from https://reseller.sandbox.ds.network → API Setup (not live). 2) DREAMSCAPE_API_BASE_URL=https://reseller-api.sandbox.ds.network. 3) REST auth is Api-Request-Id + Api-Signature only (no Reseller ID). 4) If support insists on Reseller ID, set DREAMSCAPE_API_MODE=soap + DREAMSCAPE_RESELLER_ID instead. 5) Redeploy. Retry with ?debug=1.",
    };
  }

  return {
    code: "auth_production_key_rejected",
    message:
      "Dreamscape REST production rejected the request (401). Usual causes: wrong live key, key/base URL mismatch, or IP whitelist blocking dynamic egress.",
    hint: "1) Live key from https://reseller.ds.network → API Setup. 2) Matching production REST base URL. 3) Auth is Api-Request-Id + Api-Signature. 4) Whitelist stable egress if needed. 5) Or switch to SOAP with Reseller ID if that is what API Setup credentials are for.",
  };
}

/**
 * Serialize query params for Dreamscape.
 * Docs use literal `domain_names[]=…` — URLSearchParams would encode brackets
 * as %5B%5D which some PHP backends reject.
 */
export function serializeDreamscapeSearchParams(
  params: URLSearchParams,
): string {
  const parts: string[] = [];
  params.forEach((value, key) => {
    const encodedKey = encodeURIComponent(key)
      .replace(/%5B/gi, "[")
      .replace(/%5D/gi, "]");
    parts.push(`${encodedKey}=${encodeURIComponent(value)}`);
  });
  return parts.join("&");
}

export async function dreamscapeFetch<T = unknown>(
  path: string,
  init?: RequestInit & { searchParams?: URLSearchParams },
): Promise<T> {
  const {
    apiKey,
    resellerId,
    resellerIdHeader,
    sendResellerId,
    baseUrl,
    isSandbox,
    apiMode,
  } = resolveDreamscapeConfig();
  if (!apiKey) {
    throw new DreamscapeApiError(503, "DREAMSCAPE_API_KEY is not configured", undefined, {
      code: "missing_api_key",
      hint: "Set DREAMSCAPE_API_KEY from the Reseller Console that matches DREAMSCAPE_API_BASE_URL (sandbox by default). REST auth uses Api-Request-Id + Api-Signature; SOAP needs Reseller ID too.",
    });
  }

  const url = new URL(
    path.startsWith("http")
      ? path
      : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
  );

  const mergedParams = new URLSearchParams(url.search);
  // Clear so we re-serialize with bracket-safe encoding.
  url.search = "";

  if (init?.searchParams) {
    init.searchParams.forEach((value, key) => {
      mergedParams.append(key, value);
    });
  }

  // Reseller ID query only when opt-in (support experiments).
  if (sendResellerId && resellerId && !mergedParams.has("reseller_id")) {
    mergedParams.set("reseller_id", resellerId);
  }

  const queryString = serializeDreamscapeSearchParams(mergedParams);
  if (queryString) {
    url.search = queryString;
  }

  const {
    searchParams: _sp,
    headers: initHeaders,
    method,
    body: requestBody,
    signal,
  } = init ?? {};

  const auth = buildDreamscapeAuthHeaders(apiKey, {
    sendResellerId,
    resellerId: sendResellerId ? resellerId : null,
    resellerIdHeader: sendResellerId ? resellerIdHeader : null,
  });

  const headers: Record<string, string> = {
    ...auth.headers,
    ...(initHeaders as Record<string, string> | undefined),
  };

  const requestDebug: DreamscapeRequestDebug = {
    path: url.pathname,
    method: (method ?? "GET").toUpperCase(),
    headersSent: Object.keys(headers),
    resellerIdHeadersSent: auth.resellerIdHeadersSent,
    queryKeysSent: [...mergedParams.keys()],
    hasResellerIdQuery: mergedParams.has("reseller_id"),
    sendResellerId,
    signatureAlgo: auth.signatureAlgo,
    isSandbox,
    apiMode,
  };

  // Log header names only — never the API key or signature value.
  console.info("[dreamscape] request auth", {
    path: requestDebug.path,
    method: requestDebug.method,
    isSandbox,
    headersSent: requestDebug.headersSent,
    resellerIdHeadersSent: requestDebug.resellerIdHeadersSent,
    queryKeysSent: requestDebug.queryKeysSent,
    sendResellerId: requestDebug.sendResellerId,
    signatureAlgo: requestDebug.signatureAlgo,
  });

  const proxyUrl = resolveDreamscapeHttpsProxy();
  let response: Response;

  // Prefer href with our serialized search; avoid URLSearchParams re-encode.
  // Docs: GET {base}/domains/availability?domain_names[]=…
  const requestUrl = `${url.origin}${url.pathname}${queryString ? `?${queryString}` : ""}`;

  if (proxyUrl) {
    // undici ProxyAgent — Node runtime only (Fixie / QuotaGuard / HTTPS_PROXY)
    const { fetch: proxiedFetch, dispatcher } =
      await resolveProxiedFetch(proxyUrl);
    response = await proxiedFetch(requestUrl, {
      method: method ?? "GET",
      body: requestBody,
      signal: signal ?? undefined,
      headers,
      // undici RequestInit
      ...({ dispatcher } as RequestInit),
    });
  } else {
    response = await fetch(requestUrl, {
      method: method ?? "GET",
      body: requestBody,
      signal: signal ?? undefined,
      headers,
    });
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  const providerBodySnippet = sanitizeDreamscapeBodySnippet(body);

  if (!response.ok) {
    if (response.status === 401) {
      const authFail = describeDreamscapeAuthFailure(isSandbox, apiKey, {
        sendResellerId,
        apiMode: "rest",
      });
      throw new DreamscapeApiError(401, authFail.message, body, {
        code: authFail.code,
        hint: authFail.hint,
        providerBodySnippet,
        requestDebug,
      });
    }

    const message =
      typeof body === "object" &&
      body &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Dreamscape API ${response.status}`;
    throw new DreamscapeApiError(response.status, message, body, {
      code: "provider_error",
      providerBodySnippet,
      requestDebug,
    });
  }

  return body as T;
}
