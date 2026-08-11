/**
 * Cotality / CoreLogic Asia (RP Data) — OAuth2 client credentials.
 *
 * Sandbox token: POST https://api-sbox.corelogic.asia/access/as/token.oauth2
 * Auth: HTTP Basic base64(client_id:client_secret) + grant_type=client_credentials
 *
 * Platform env (server-only):
 *   CORELOGIC_CLIENT_ID
 *   CORELOGIC_CLIENT_SECRET
 *   CORELOGIC_TOKEN_URL (default sandbox as/token.oauth2)
 *   CORELOGIC_API_BASE / CORELOGIC_SEARCH_BASE (Search + Address Match host)
 *   CORELOGIC_PROPERTY_DETAILS_BASE (attributes / sales / features)
 *   CORELOGIC_AVM_BASE (IntelliVal)
 *   CORELOGIC_CLIENT_NAME (Address Match clientName query; default digitalgate-property-data)
 *
 * @see docs/connectors/COTALITY-CORELOGIC.md
 */

export const CORELOGIC_DEFAULT_TOKEN_URL =
  "https://api-sbox.corelogic.asia/access/as/token.oauth2";

/** Sandbox Search API host (Address Match lives under /au/matcher/address). */
export const CORELOGIC_DEFAULT_SEARCH_BASE =
  "https://api-sbox.corelogic.asia/search";

/** Sandbox Property Details host (attributes / sales / features). */
export const CORELOGIC_DEFAULT_PROPERTY_DETAILS_BASE =
  "https://api-sbox.corelogic.asia/property-details";

/** Sandbox AVM / IntelliVal host. */
export const CORELOGIC_DEFAULT_AVM_BASE =
  "https://api-sbox.corelogic.asia/avm";

export const CORELOGIC_DEFAULT_CLIENT_NAME = "digitalgate-property-data";

export type CoreLogicOAuthConfig = {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  searchBase: string;
  /** Alias for searchBase — general API host override. */
  apiBase: string;
  propertyDetailsBase: string;
  avmBase: string;
  clientName: string;
};

export type CoreLogicTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

export type CoreLogicTokenBundle = CoreLogicTokenResponse & {
  obtainedAt: string;
  expiresAt: string;
};

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let tokenCache: CachedToken | null = null;

export function getCoreLogicOAuthConfig():
  | { ok: true; config: CoreLogicOAuthConfig }
  | { ok: false; message: string } {
  const clientId = process.env.CORELOGIC_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.CORELOGIC_CLIENT_SECRET?.trim() || "";
  const tokenUrl =
    process.env.CORELOGIC_TOKEN_URL?.trim() || CORELOGIC_DEFAULT_TOKEN_URL;
  const searchBase =
    process.env.CORELOGIC_SEARCH_BASE?.trim() ||
    process.env.CORELOGIC_API_BASE?.trim() ||
    CORELOGIC_DEFAULT_SEARCH_BASE;
  const apiBase = process.env.CORELOGIC_API_BASE?.trim() || searchBase;
  const propertyDetailsBase =
    process.env.CORELOGIC_PROPERTY_DETAILS_BASE?.trim() ||
    CORELOGIC_DEFAULT_PROPERTY_DETAILS_BASE;
  const avmBase =
    process.env.CORELOGIC_AVM_BASE?.trim() || CORELOGIC_DEFAULT_AVM_BASE;
  const clientName =
    process.env.CORELOGIC_CLIENT_NAME?.trim() || CORELOGIC_DEFAULT_CLIENT_NAME;

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "CORELOGIC_CLIENT_ID / CORELOGIC_CLIENT_SECRET not set — add them to .env.local (never commit the secret)",
    };
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      tokenUrl,
      searchBase: searchBase.replace(/\/$/, ""),
      apiBase: apiBase.replace(/\/$/, ""),
      propertyDetailsBase: propertyDetailsBase.replace(/\/$/, ""),
      avmBase: avmBase.replace(/\/$/, ""),
      clientName,
    },
  };
}

export function coreLogicCredentialsConfigured(): boolean {
  return getCoreLogicOAuthConfig().ok;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function bundleToken(raw: CoreLogicTokenResponse): CoreLogicTokenBundle {
  const obtainedAt = new Date();
  const expiresAt = new Date(
    obtainedAt.getTime() + Math.max(0, (raw.expires_in ?? 3600) - 60) * 1000,
  );
  return {
    ...raw,
    obtainedAt: obtainedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/** Clear in-memory token cache (tests / credential rotation). */
export function clearCoreLogicTokenCache(): void {
  tokenCache = null;
}

export async function fetchCoreLogicClientCredentialsToken(): Promise<
  | { ok: true; token: CoreLogicTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getCoreLogicOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };

  const res = await fetch(cfg.config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(cfg.config.clientId, cfg.config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 400) };
  }

  if (!res.ok) {
    const err =
      json && typeof json === "object" && "error_description" in json
        ? String((json as { error_description?: string }).error_description)
        : json && typeof json === "object" && "error" in json
          ? String((json as { error?: string }).error)
          : `CoreLogic token HTTP ${res.status}`;
    return { ok: false, status: res.status, message: err, raw: json };
  }

  const token = json as CoreLogicTokenResponse;
  if (!token?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: "CoreLogic token response missing access_token",
      raw: json,
    };
  }

  const bundled = bundleToken(token);
  tokenCache = {
    accessToken: bundled.access_token,
    expiresAtMs: Date.parse(bundled.expiresAt),
  };
  return { ok: true, token: bundled };
}

/** Return a cached token or fetch a fresh one. Never logs the secret or token. */
export async function ensureCoreLogicAccessToken(): Promise<
  | { ok: true; accessToken: string; expiresAt?: string }
  | { ok: false; status: number; message: string }
> {
  if (tokenCache && tokenCache.expiresAtMs > Date.now() + 15_000) {
    return {
      ok: true,
      accessToken: tokenCache.accessToken,
      expiresAt: new Date(tokenCache.expiresAtMs).toISOString(),
    };
  }

  const fetched = await fetchCoreLogicClientCredentialsToken();
  if (!fetched.ok) {
    return { ok: false, status: fetched.status, message: fetched.message };
  }
  return {
    ok: true,
    accessToken: fetched.token.access_token,
    expiresAt: fetched.token.expiresAt,
  };
}

/** Authenticated GET against Search / Property Details / AVM / API base. */
export async function coreLogicApiGet(
  path: string,
  accessToken: string,
  options?: { base?: "search" | "api" | "propertyDetails" | "avm" },
): Promise<
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; message: string; data?: unknown }
> {
  const cfg = getCoreLogicOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };

  const base =
    options?.base === "api"
      ? cfg.config.apiBase
      : options?.base === "propertyDetails"
        ? cfg.config.propertyDetailsBase
        : options?.base === "avm"
          ? cfg.config.avmBase
          : cfg.config.searchBase;
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text.slice(0, 500);
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message:
        typeof data === "object" && data && "message" in data
          ? String((data as { message?: string }).message)
          : `CoreLogic API HTTP ${res.status}`,
      data,
    };
  }
  return { ok: true, status: res.status, data };
}

/** Smoke: client-credentials token (+ optional Search health). */
export async function probeCoreLogicConnection(): Promise<{
  ok: boolean;
  configured: boolean;
  tokenOk?: boolean;
  apiOk?: boolean;
  expiresAt?: string;
  message: string;
}> {
  const cfg = getCoreLogicOAuthConfig();
  if (!cfg.ok) {
    return { ok: false, configured: false, message: cfg.message };
  }

  const token = await fetchCoreLogicClientCredentialsToken();
  if (!token.ok) {
    return {
      ok: false,
      configured: true,
      tokenOk: false,
      message: token.message,
    };
  }

  const health = await coreLogicApiGet("/env/health", token.token.access_token);
  if (!health.ok) {
    return {
      ok: true,
      configured: true,
      tokenOk: true,
      apiOk: false,
      expiresAt: token.token.expiresAt,
      message: `Token OK · Search health: ${health.message}`,
    };
  }

  return {
    ok: true,
    configured: true,
    tokenOk: true,
    apiOk: true,
    expiresAt: token.token.expiresAt,
    message: "CoreLogic client credentials + Search health OK",
  };
}
