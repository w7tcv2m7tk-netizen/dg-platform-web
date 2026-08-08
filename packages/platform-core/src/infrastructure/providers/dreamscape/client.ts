import { dreamscapeAuthHeaders } from "./auth";

export const DREAMSCAPE_PROD_BASE_URL = "https://reseller-api.ds.network";
export const DREAMSCAPE_SANDBOX_BASE_URL =
  "https://reseller-api.sandbox.ds.network";

/**
 * Sandbox-first: default base URL is always sandbox.
 * Production URL is only used when explicitly set via env — never guess.
 */
export function resolveDreamscapeConfig(): {
  apiKey: string | null;
  baseUrl: string;
  isSandbox: boolean;
} {
  const apiKey = process.env.DREAMSCAPE_API_KEY?.trim() || null;
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

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "DreamscapeApiError";
    this.status = status;
    this.body = body;
  }
}

export async function dreamscapeFetch<T = unknown>(
  path: string,
  init?: RequestInit & { searchParams?: URLSearchParams },
): Promise<T> {
  const { apiKey, baseUrl } = resolveDreamscapeConfig();
  if (!apiKey) {
    throw new DreamscapeApiError(503, "DREAMSCAPE_API_KEY is not configured");
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
    const message =
      typeof body === "object" &&
      body &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Dreamscape API ${response.status}`;
    throw new DreamscapeApiError(response.status, message, body);
  }

  return body as T;
}
