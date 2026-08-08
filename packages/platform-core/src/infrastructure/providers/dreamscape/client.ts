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
} {
  const apiKey = normalizeDreamscapeApiKey(process.env.DREAMSCAPE_API_KEY);
  const configured = process.env.DREAMSCAPE_API_BASE_URL?.trim();
  const baseUrl = (configured || DREAMSCAPE_SANDBOX_BASE_URL).replace(/\/$/, "");
  const isSandbox = baseUrl.includes("sandbox");
  return { apiKey, baseUrl, isSandbox };
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
        "Dreamscape sandbox rejected the request (401). Usual causes: sandbox/prod key mismatch, or IP whitelist blocking Vercel’s dynamic egress.",
      hint: "1) Key from https://reseller.sandbox.ds.network → Account Settings → API & WHMCS → API Setup (not live). 2) On that same page, clear/disable IP whitelist for sandbox, or enable Vercel Static IPs and whitelist those IPs — standard Vercel egress is dynamic. 3) Set DREAMSCAPE_API_KEY + DREAMSCAPE_API_BASE_URL=https://reseller-api.sandbox.ds.network, then redeploy. Reseller ID is not used for REST.",
    };
  }

  return {
    code: "auth_production_key_rejected",
    message:
      "Dreamscape production rejected the request (401). Usual causes: sandbox/prod key mismatch, or IP whitelist blocking Vercel’s dynamic egress.",
    hint: "1) Key from https://reseller.ds.network → Account Settings → API & WHMCS → API Setup (not sandbox). 2) Whitelist stable egress (Vercel Static IPs) or proxy via a static-IP host — do not rely on dynamic Vercel IPs. 3) Redeploy after env changes. Reseller ID is not used for REST.",
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

  const { searchParams: _sp, headers: initHeaders, ...rest } = init ?? {};
  const response = await fetch(url.toString(), {
    ...rest,
    headers: {
      ...dreamscapeAuthHeaders(apiKey),
      ...(initHeaders as Record<string, string> | undefined),
    },
  });

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
