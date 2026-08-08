import { dreamscapeAuthHeaders } from "./auth";

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
 * Optional HTTPS proxy for Dreamscape egress (Fixie / QuotaGuard / similar).
 * Prefer `DREAMSCAPE_HTTPS_PROXY`; falls back to standard `HTTPS_PROXY` /
 * `https_proxy`. When set, all `dreamscapeFetch` calls tunnel through it so
 * Dreamscape can whitelist the proxy’s static outbound IP.
 */
export function resolveDreamscapeHttpsProxy(): string | null {
  const raw =
    process.env.DREAMSCAPE_HTTPS_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    "";
  return raw || null;
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
 * Optional later: DREAMSCAPE_API_KEY_SANDBOX vs prod — for now one key
 * must match the console for DREAMSCAPE_API_BASE_URL.
 */
export function resolveDreamscapeConfig(): {
  apiKey: string | null;
  baseUrl: string;
  isSandbox: boolean;
  httpsProxy: string | null;
} {
  const apiKey = normalizeDreamscapeApiKey(process.env.DREAMSCAPE_API_KEY);
  const configured = process.env.DREAMSCAPE_API_BASE_URL?.trim();
  const baseUrl = (configured || DREAMSCAPE_SANDBOX_BASE_URL).replace(/\/$/, "");
  const isSandbox = baseUrl.includes("sandbox");
  return {
    apiKey,
    baseUrl,
    isSandbox,
    httpsProxy: resolveDreamscapeHttpsProxy(),
  };
}

export function isDreamscapeConfigured(): boolean {
  return Boolean(resolveDreamscapeConfig().apiKey);
}

export class DreamscapeApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code?: string;
  readonly hint?: string;

  constructor(
    status: number,
    message: string,
    body?: unknown,
    opts?: { code?: string; hint?: string },
  ) {
    super(message);
    this.name = "DreamscapeApiError";
    this.status = status;
    this.body = body;
    this.code = opts?.code;
    this.hint = opts?.hint;
  }
}

/** User-facing 401 guidance — never echo the key. */
export function describeDreamscapeAuthFailure(
  isSandbox: boolean,
  apiKey: string,
): { code: string; message: string; hint: string } {
  if (!isDreamscapeApiKeyFormatValid(apiKey)) {
    return {
      code: "auth_invalid_key_format",
      message:
        "Dreamscape API key format is invalid (expected 32 lowercase alphanumeric characters).",
      hint: "Trim spaces and remove wrapping quotes from DREAMSCAPE_API_KEY. Example shape: c4ca4238a0b923820dcc509a6f75849b (docs example only — not a real key).",
    };
  }

  if (isSandbox) {
    return {
      code: "auth_sandbox_key_rejected",
      message:
        "Dreamscape sandbox rejected the request (401). Usual causes: sandbox/prod key mismatch, or IP whitelist blocking dynamic egress (empty/0.0.0.0/0 are rejected).",
      hint: "1) Key from https://reseller.sandbox.ds.network → Account Settings → API & WHMCS → API Setup (not live). 2) Whitelist a real IP — Dreamscape rejects empty whitelist and 0.0.0.0/0. Local: your public IP. Vercel: there is no reliable free public IP range — use Vercel Static IPs (Pro) or set DREAMSCAPE_HTTPS_PROXY / HTTPS_PROXY (Fixie/QuotaGuard) and whitelist that static egress IP. 3) Redeploy after env changes. Reseller ID is not used for REST.",
    };
  }

  return {
    code: "auth_production_key_rejected",
    message:
      "Dreamscape production rejected the request (401). Usual causes: sandbox/prod key mismatch, or IP whitelist blocking dynamic egress (empty/0.0.0.0/0 are rejected).",
    hint: "1) Key from https://reseller.ds.network → Account Settings → API & WHMCS → API Setup (not sandbox). 2) Whitelist a stable egress IP — Vercel Static IPs (Pro) or DREAMSCAPE_HTTPS_PROXY / HTTPS_PROXY (Fixie/QuotaGuard). Do not leave whitelist empty or use 0.0.0.0/0. 3) Redeploy after env changes. Reseller ID is not used for REST.",
  };
}

export async function dreamscapeFetch<T = unknown>(
  path: string,
  init?: RequestInit & { searchParams?: URLSearchParams },
): Promise<T> {
  const { apiKey, baseUrl, isSandbox } = resolveDreamscapeConfig();
  if (!apiKey) {
    throw new DreamscapeApiError(503, "DREAMSCAPE_API_KEY is not configured", undefined, {
      code: "missing_api_key",
      hint: "Set DREAMSCAPE_API_KEY from the Reseller Console that matches DREAMSCAPE_API_BASE_URL (sandbox by default).",
    });
  }

  const url = new URL(
    path.startsWith("http")
      ? path
      : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (init?.searchParams) {
    init.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }

  const {
    searchParams: _sp,
    headers: initHeaders,
    method,
    body: requestBody,
    signal,
  } = init ?? {};

  const headers: Record<string, string> = {
    ...dreamscapeAuthHeaders(apiKey),
    ...(initHeaders as Record<string, string> | undefined),
  };

  const proxyUrl = resolveDreamscapeHttpsProxy();
  let response: Response;

  if (proxyUrl) {
    // undici ProxyAgent — Node runtime only (Fixie / QuotaGuard / HTTPS_PROXY)
    const { fetch: proxiedFetch, dispatcher } =
      await resolveProxiedFetch(proxyUrl);
    response = await proxiedFetch(url.toString(), {
      method: method ?? "GET",
      body: requestBody,
      signal: signal ?? undefined,
      headers,
      // undici RequestInit
      ...({ dispatcher } as RequestInit),
    });
  } else {
    response = await fetch(url.toString(), {
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

  if (!response.ok) {
    if (response.status === 401) {
      const auth = describeDreamscapeAuthFailure(isSandbox, apiKey);
      throw new DreamscapeApiError(401, auth.message, body, {
        code: auth.code,
        hint: auth.hint,
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
    });
  }

  return body as T;
}
