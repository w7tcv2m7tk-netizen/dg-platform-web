import {
  DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER,
  buildDreamscapeAuthHeaders,
} from "./auth";

export const DREAMSCAPE_PROD_BASE_URL = "https://reseller-api.ds.network";
export const DREAMSCAPE_SANDBOX_BASE_URL =
  "https://reseller-api.sandbox.ds.network";

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
 * Reseller ID from API Setup (digits). Required per Dreamscape support
 * alongside the API key — public REST examples omit it.
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
 * Sandbox-first: default base URL is always sandbox.
 * Production URL is only used when explicitly set via env — never guess.
 *
 * Dreamscape support (Aug 2026): Reseller ID must be passed with the API key.
 * Sandbox has no IP whitelist (IP was a red herring for sandbox 401s).
 */
/**
 * Resolve Dreamscape config at call/request time (not module init).
 * Trims / strip-quotes via normalize helpers. Server-only.
 */
export function resolveDreamscapeConfig(): {
  apiKey: string | null;
  resellerId: string | null;
  resellerIdHeader: string;
  baseUrl: string;
  isSandbox: boolean;
  httpsProxy: string | null;
} {
  const apiKey = normalizeDreamscapeApiKey(readServerEnv("DREAMSCAPE_API_KEY"));
  const resellerId = normalizeDreamscapeResellerId(
    readServerEnv("DREAMSCAPE_RESELLER_ID"),
  );
  const configured = readServerEnv("DREAMSCAPE_API_BASE_URL")?.trim();
  const baseUrl = (configured || DREAMSCAPE_SANDBOX_BASE_URL).replace(/\/$/, "");
  const isSandbox = baseUrl.includes("sandbox");
  return {
    apiKey,
    resellerId,
    resellerIdHeader: resolveDreamscapeResellerIdHeader(),
    baseUrl,
    isSandbox,
    httpsProxy: resolveDreamscapeHttpsProxy(),
  };
}

/** Both API key and Reseller ID are required (Dreamscape support). */
export function isDreamscapeConfigured(): boolean {
  const { apiKey, resellerId } = resolveDreamscapeConfig();
  return Boolean(apiKey && resellerId);
}

/** Safe request metadata for staff debug — never includes API key or signature. */
export type DreamscapeRequestDebug = {
  path: string;
  method: string;
  headersSent: string[];
  resellerIdHeadersSent: string[];
  queryKeysSent: string[];
  hasResellerIdQuery: boolean;
  signatureAlgo: "md5(request_id + api_key)";
  isSandbox: boolean;
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
  opts?: { resellerId?: string | null },
): { code: string; message: string; hint: string } {
  if (!isDreamscapeApiKeyFormatValid(apiKey)) {
    return {
      code: "auth_invalid_key_format",
      message:
        "Dreamscape API key format is invalid (expected 32 lowercase alphanumeric characters).",
      hint: "Trim spaces and remove wrapping quotes from DREAMSCAPE_API_KEY. Example shape: c4ca4238a0b923820dcc509a6f75849b (docs example only — not a real key).",
    };
  }

  if (!opts?.resellerId) {
    return {
      code: "auth_missing_reseller_id",
      message:
        "Dreamscape rejected the request (401). Reseller ID is required alongside the API key (Dreamscape support).",
      hint: "Set DREAMSCAPE_RESELLER_ID from Reseller Console → Account Settings → API & WHMCS → API Setup (e.g. 25735). We send X-Reseller-Id, Reseller-Id, Api-Reseller-Id, and reseller_id query. Redeploy after env changes.",
    };
  }

  if (isSandbox) {
    return {
      code: "auth_sandbox_key_rejected",
      message:
        "Dreamscape sandbox rejected the request (401). Usual causes: wrong sandbox key, Reseller ID mismatch, or regenerated key not redeployed.",
      hint: "1) Key from https://reseller.sandbox.ds.network → Account Settings → API & WHMCS → API Setup (not live). 2) DREAMSCAPE_RESELLER_ID matches sandbox API Setup. 3) Sandbox has no IP whitelist. 4) If the key was exposed, regenerate, set DREAMSCAPE_API_KEY, redeploy. We send headers X-Reseller-Id + Reseller-Id + Api-Reseller-Id and query reseller_id. Retry with ?debug=1 for header names + response snippet.",
    };
  }

  return {
    code: "auth_production_key_rejected",
    message:
      "Dreamscape production rejected the request (401). Usual causes: wrong live key, Reseller ID mismatch, or IP whitelist blocking dynamic egress.",
    hint: "1) Key from https://reseller.ds.network → Account Settings → API & WHMCS → API Setup (not sandbox). 2) DREAMSCAPE_RESELLER_ID from live API Setup. 3) Whitelist stable egress (Vercel Static IPs or DREAMSCAPE_HTTPS_PROXY). 4) Redeploy. We send X-Reseller-Id + Reseller-Id + Api-Reseller-Id and reseller_id query. Retry with ?debug=1.",
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
  const { apiKey, resellerId, resellerIdHeader, baseUrl, isSandbox } =
    resolveDreamscapeConfig();
  if (!apiKey) {
    throw new DreamscapeApiError(503, "DREAMSCAPE_API_KEY is not configured", undefined, {
      code: "missing_api_key",
      hint: "Set DREAMSCAPE_API_KEY from the Reseller Console that matches DREAMSCAPE_API_BASE_URL (sandbox by default). Also set DREAMSCAPE_RESELLER_ID (required per Dreamscape support).",
    });
  }
  if (!resellerId) {
    throw new DreamscapeApiError(
      503,
      "DREAMSCAPE_RESELLER_ID is not configured",
      undefined,
      {
        code: "missing_reseller_id",
        hint: "Set DREAMSCAPE_RESELLER_ID from Reseller Console → Account Settings → API & WHMCS → API Setup. Dreamscape support requires Reseller ID alongside the API key. We send X-Reseller-Id, Reseller-Id, and Api-Reseller-Id.",
      },
    );
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

  // Always include reseller_id as a query param (support-implied identity).
  if (!mergedParams.has("reseller_id")) {
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
    resellerId,
    resellerIdHeader,
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
    signatureAlgo: auth.signatureAlgo,
    isSandbox,
  };

  // Log header names only — never the API key or signature value.
  console.info("[dreamscape] request auth", {
    path: requestDebug.path,
    method: requestDebug.method,
    isSandbox,
    headersSent: requestDebug.headersSent,
    resellerIdHeadersSent: requestDebug.resellerIdHeadersSent,
    queryKeysSent: requestDebug.queryKeysSent,
    signatureAlgo: requestDebug.signatureAlgo,
  });

  const proxyUrl = resolveDreamscapeHttpsProxy();
  let response: Response;

  // Prefer href with our serialized search; avoid URLSearchParams re-encode.
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
        resellerId,
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
