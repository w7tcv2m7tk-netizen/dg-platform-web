import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

/**
 * Domain.com.au OAuth + API client (platform credentials).
 *
 * Auth: https://auth.domain.com.au/v1/connect/token
 * API:  https://api.domain.com.au  (sandbox paths: /sandbox/v1/…)
 *
 * Platform env (Vercel):
 *   DOMAIN_CLIENT_ID
 *   DOMAIN_CLIENT_SECRET
 *   DOMAIN_REDIRECT_URI (default https://app.digitalgate.com.au/api/connectors/domain/callback)
 *   DOMAIN_OAUTH_SCOPES (optional; client-credentials only — often N/A for Listing Mgmt clients)
 *   DOMAIN_AUTH_CODE_SCOPES (optional; Authorization Code agency connect)
 *   DOMAIN_API_PATH_PREFIX (optional; set to `/sandbox` for Listing Management Sandbox)
 *
 * Listing Management CRM clients use **Authorization Code** (not client_credentials).
 * Org probes hit Listings Management endpoints (`/v1/me`), not Agents & Listings (`/v1/agencies`).
 *
 * @see docs/foundations/PROPERTY-SYNDICATION.md
 */

export const DOMAIN_AUTH_TOKEN_URL = "https://auth.domain.com.au/v1/connect/token";
export const DOMAIN_AUTH_AUTHORIZE_URL =
  "https://auth.domain.com.au/v1/connect/authorize";
export const DOMAIN_API_BASE_URL = "https://api.domain.com.au";

/**
 * Listings Management identity probe (works with agency user-context tokens).
 * Prefer this over `/v1/agencies` which belongs to Agents & Listings product access.
 */
export const DOMAIN_ORG_PROBE_PATH = "/v1/me";
export const DOMAIN_ORG_AGENCIES_PROBE_PATH = "/v1/me/agencies";

/** Default scopes for optional client-credentials smoke tests (separate Domain credential type). */
export const DOMAIN_DEFAULT_CLIENT_CREDENTIAL_SCOPES =
  "api_agencies_read api_listings_read";

/**
 * Auth-code scopes for Listings Management (Domain upload-listings guide).
 * Write scopes are required before publish; keep them in the consent request once the package allows them.
 */
export const DOMAIN_DEFAULT_AUTH_CODE_SCOPES =
  "openid profile offline_access api_listings_read api_listings_write api_agencies_read api_agencies_write";

export type DomainOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  clientCredentialScopes: string;
  authCodeScopes: string;
  /** e.g. `/sandbox` for Listing Management Sandbox; empty for Primary. */
  apiPathPrefix: string;
};

export type DomainTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
};

export type DomainTokenBundle = DomainTokenResponse & {
  obtainedAt: string;
  expiresAt: string;
};

export function getDomainOAuthConfig():
  | { ok: true; config: DomainOAuthConfig }
  | { ok: false; message: string } {
  const clientId = process.env.DOMAIN_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.DOMAIN_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.DOMAIN_REDIRECT_URI?.trim() ||
    "https://app.digitalgate.com.au/api/connectors/domain/callback";
  const clientCredentialScopes =
    process.env.DOMAIN_OAUTH_SCOPES?.trim() || DOMAIN_DEFAULT_CLIENT_CREDENTIAL_SCOPES;
  const authCodeScopes =
    process.env.DOMAIN_AUTH_CODE_SCOPES?.trim() || DOMAIN_DEFAULT_AUTH_CODE_SCOPES;
  const rawPrefix = process.env.DOMAIN_API_PATH_PREFIX?.trim() || "";
  const apiPathPrefix = rawPrefix
    ? `/${rawPrefix.replace(/^\/+|\/+$/g, "")}`
    : "";

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "DOMAIN_CLIENT_ID / DOMAIN_CLIENT_SECRET not set — add them on Vercel (and .env.local)",
    };
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      redirectUri,
      clientCredentialScopes,
      authCodeScopes,
      apiPathPrefix,
    },
  };
}

/** Resolve a Domain API path, applying optional sandbox prefix (`DOMAIN_API_PATH_PREFIX`). */
export function resolveDomainApiPath(path: string): string {
  if (path.startsWith("http")) return path;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  const cfg = getDomainOAuthConfig();
  const prefix = cfg.ok ? cfg.config.apiPathPrefix : "";
  if (!prefix) return normalised;
  // Avoid double-prefixing if caller already included /sandbox
  if (normalised === prefix || normalised.startsWith(`${prefix}/`)) return normalised;
  return `${prefix}${normalised}`;
}

export function domainCredentialsConfigured(): boolean {
  return getDomainOAuthConfig().ok;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function bundleToken(raw: DomainTokenResponse): DomainTokenBundle {
  const obtainedAt = new Date();
  const expiresAt = new Date(obtainedAt.getTime() + Math.max(0, raw.expires_in - 60) * 1000);
  return {
    ...raw,
    obtainedAt: obtainedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

async function postToken(
  config: DomainOAuthConfig,
  body: URLSearchParams,
): Promise<
  | { ok: true; token: DomainTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const res = await fetch(DOMAIN_AUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(config.clientId, config.clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err =
      json && typeof json === "object" && "error_description" in json
        ? String((json as { error_description?: string }).error_description)
        : json && typeof json === "object" && "error" in json
          ? String((json as { error?: string }).error)
          : `Domain token HTTP ${res.status}`;
    return { ok: false, status: res.status, message: err, raw: json };
  }
  const token = json as DomainTokenResponse;
  if (!token?.access_token) {
    return { ok: false, status: res.status, message: "Domain token response missing access_token", raw: json };
  }
  return { ok: true, token: bundleToken(token) };
}

/** Platform app token (no user context) — smoke tests + public read APIs. */
export async function fetchDomainClientCredentialsToken(options?: {
  scopes?: string;
}): Promise<
  | { ok: true; token: DomainTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getDomainOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };
  const scope = options?.scopes?.trim() || cfg.config.clientCredentialScopes;
  return postToken(
    cfg.config,
    new URLSearchParams({
      grant_type: "client_credentials",
      scope,
    }),
  );
}

export function buildDomainAuthorizeUrl(input: {
  state: string;
  nonce: string;
  scopes?: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  const cfg = getDomainOAuthConfig();
  if (!cfg.ok) return { ok: false, message: cfg.message };
  const scope = input.scopes?.trim() || cfg.config.authCodeScopes;
  const url = new URL(DOMAIN_AUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", cfg.config.clientId);
  url.searchParams.set("redirect_uri", cfg.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  return { ok: true, url: url.toString() };
}

export async function exchangeDomainAuthorizationCode(input: {
  code: string;
}): Promise<
  | { ok: true; token: DomainTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getDomainOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };
  return postToken(
    cfg.config,
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: cfg.config.redirectUri,
    }),
  );
}

export async function refreshDomainAccessToken(input: {
  refreshToken: string;
}): Promise<
  | { ok: true; token: DomainTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getDomainOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };
  return postToken(
    cfg.config,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    }),
  );
}

function extractDomainApiErrorMessage(
  status: number,
  data: unknown,
  securityReason: string | null,
): string {
  const parts: string[] = [];
  if (securityReason) parts.push(securityReason);

  if (typeof data === "string" && data.trim()) {
    parts.push(data.trim().slice(0, 300));
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["message", "title", "detail", "error_description", "error"] as const) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        parts.push(value.trim());
        break;
      }
    }
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
      const first = obj.errors[0];
      if (typeof first === "string") parts.push(first);
      else if (first && typeof first === "object" && "message" in first) {
        parts.push(String((first as { message?: string }).message));
      }
    }
  }

  const detail = parts.filter(Boolean).join(" · ");
  return detail ? `Domain API HTTP ${status}: ${detail}` : `Domain API HTTP ${status}`;
}

/** Lightweight authenticated GET against Domain API. */
export async function domainApiGet(
  path: string,
  accessToken: string,
): Promise<
  | { ok: true; status: number; data: unknown; path: string }
  | {
      ok: false;
      status: number;
      message: string;
      path: string;
      securityReason?: string | null;
      raw?: unknown;
    }
> {
  const resolvedPath = resolveDomainApiPath(path);
  const url = resolvedPath.startsWith("http")
    ? resolvedPath
    : `${DOMAIN_API_BASE_URL}${resolvedPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const securityReason = res.headers.get("X-Domain-Security-Reason");
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      path: resolvedPath,
      securityReason,
      raw: data,
      message: extractDomainApiErrorMessage(res.status, data, securityReason),
    };
  }
  return { ok: true, status: res.status, data, path: resolvedPath };
}

function isUnauthorizedClientError(message: string, raw?: unknown): boolean {
  const hay = `${message} ${typeof raw === "string" ? raw : JSON.stringify(raw ?? "")}`.toLowerCase();
  return hay.includes("unauthorized_client");
}

export type DomainPlatformProbeResult = {
  ok: boolean;
  configured: boolean;
  /** true when client_credentials is not enabled on this OAuth client (expected for Listing Mgmt). */
  skipped?: boolean;
  tokenOk?: boolean;
  apiOk?: boolean;
  probePath?: string;
  expiresAt?: string;
  message: string;
};

/**
 * Optional platform smoke: client-credentials token + identity probe.
 * Listing Management credentials are usually Authorization Code only — `unauthorized_client`
 * is treated as skipped (not fatal) when org OAuth works.
 */
export async function probeDomainConnection(): Promise<DomainPlatformProbeResult> {
  const cfg = getDomainOAuthConfig();
  if (!cfg.ok) {
    return { ok: false, configured: false, message: cfg.message };
  }
  const token = await fetchDomainClientCredentialsToken();
  if (!token.ok) {
    if (isUnauthorizedClientError(token.message, token.raw)) {
      return {
        ok: true,
        configured: true,
        skipped: true,
        tokenOk: false,
        message:
          "N/A — this OAuth client does not allow client_credentials (expected for Listing Management Authorization Code clients). Org connect is the real check.",
      };
    }
    return {
      ok: false,
      configured: true,
      tokenOk: false,
      message: token.message,
    };
  }
  const probe = await domainApiGet(DOMAIN_ORG_PROBE_PATH, token.token.access_token);
  if (!probe.ok) {
    return {
      ok: true,
      configured: true,
      tokenOk: true,
      apiOk: false,
      probePath: probe.path,
      expiresAt: token.token.expiresAt,
      message: `Client-credentials token OK · API probe (${probe.path}): ${probe.message}`,
    };
  }
  return {
    ok: true,
    configured: true,
    tokenOk: true,
    apiOk: true,
    probePath: probe.path,
    expiresAt: token.token.expiresAt,
    message: `Domain client credentials + ${probe.path} OK`,
  };
}

export type OrgDomainConnectorTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
  /** Domain user / agency hint from last connect */
  label?: string;
  lastError?: string;
};

function encryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return encryptSecret(value);
}

function decryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  const decrypted = decryptSecret(value);
  return decrypted || value;
}

export async function getOrgDomainConnectorTokens(
  organisationId: string,
): Promise<OrgDomainConnectorTokens | null> {
  const blob = await getOrgConnectorSettings(organisationId, "domain");
  if (!blob) return null;
  return {
    accessToken: decryptTokenField(
      typeof blob.accessToken === "string" ? blob.accessToken : undefined,
    ),
    refreshToken: decryptTokenField(
      typeof blob.refreshToken === "string" ? blob.refreshToken : undefined,
    ),
    expiresAt: typeof blob.expiresAt === "string" ? blob.expiresAt : undefined,
    scope: typeof blob.scope === "string" ? blob.scope : undefined,
    connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : undefined,
    label: typeof blob.label === "string" ? blob.label : undefined,
    lastError: typeof blob.lastError === "string" ? blob.lastError : undefined,
  };
}

export async function saveOrgDomainConnectorTokens(
  organisationId: string,
  tokens: OrgDomainConnectorTokens,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, "domain", {
    accessToken: encryptTokenField(tokens.accessToken),
    refreshToken: encryptTokenField(tokens.refreshToken),
    expiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    connectedAt: tokens.connectedAt ?? new Date().toISOString(),
    label: tokens.label ?? null,
    lastError: tokens.lastError ?? null,
  });
}

export async function clearOrgDomainConnectorTokens(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, "domain");
}

/** Refresh if expired / near expiry; returns usable org access token. */
export async function ensureValidOrgDomainAccessToken(
  organisationId: string,
): Promise<
  | { ok: true; accessToken: string; tokens: OrgDomainConnectorTokens }
  | { ok: false; message: string }
> {
  const tokens = await getOrgDomainConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return { ok: false, message: "Domain account not connected for this organisation" };
  }

  const expiresAt = tokens.expiresAt ? Date.parse(tokens.expiresAt) : 0;
  const needsRefresh =
    Boolean(tokens.refreshToken) &&
    (!tokens.accessToken || !Number.isFinite(expiresAt) || expiresAt < Date.now() + 60_000);

  if (!needsRefresh && tokens.accessToken) {
    return { ok: true, accessToken: tokens.accessToken, tokens };
  }

  if (!tokens.refreshToken) {
    return { ok: false, message: "Domain access token expired — reconnect the account" };
  }

  const refreshed = await refreshDomainAccessToken({ refreshToken: tokens.refreshToken });
  if (!refreshed.ok) {
    await saveOrgDomainConnectorTokens(organisationId, {
      ...tokens,
      lastError: refreshed.message,
    });
    return { ok: false, message: refreshed.message };
  }

  const next: OrgDomainConnectorTokens = {
    ...tokens,
    accessToken: refreshed.token.access_token,
    refreshToken: refreshed.token.refresh_token || tokens.refreshToken,
    expiresAt: refreshed.token.expiresAt,
    scope: refreshed.token.scope || tokens.scope,
    lastError: undefined,
  };
  await saveOrgDomainConnectorTokens(organisationId, next);
  return { ok: true, accessToken: next.accessToken!, tokens: next };
}

export type DomainOrgProbeResult = {
  ok: boolean;
  connected: boolean;
  tokenOk?: boolean;
  apiOk?: boolean;
  probePath?: string;
  expiresAt?: string;
  scope?: string;
  message: string;
};

/**
 * Org-token probe against Listings Management identity endpoints.
 * Uses GET /v1/me (then /v1/me/agencies) — not Agents & Listings GET /v1/agencies.
 */
export async function probeOrgDomainConnection(
  organisationId: string,
): Promise<DomainOrgProbeResult> {
  const ensured = await ensureValidOrgDomainAccessToken(organisationId);
  if (!ensured.ok) {
    return { ok: false, connected: false, tokenOk: false, message: ensured.message };
  }

  const me = await domainApiGet(DOMAIN_ORG_PROBE_PATH, ensured.accessToken);
  if (!me.ok) {
    return {
      ok: false,
      connected: true,
      tokenOk: true,
      apiOk: false,
      probePath: me.path,
      expiresAt: ensured.tokens.expiresAt,
      scope: ensured.tokens.scope,
      message: `Token OK · API probe (${me.path}): ${me.message}`,
    };
  }

  const agencies = await domainApiGet(DOMAIN_ORG_AGENCIES_PROBE_PATH, ensured.accessToken);
  if (!agencies.ok) {
    // /v1/me succeeded — connection is usable; agencies list may need package/consent.
    return {
      ok: true,
      connected: true,
      tokenOk: true,
      apiOk: true,
      probePath: me.path,
      expiresAt: ensured.tokens.expiresAt,
      scope: ensured.tokens.scope,
      message: `Token OK · ${me.path} OK · agencies list (${agencies.path}): ${agencies.message}`,
    };
  }

  return {
    ok: true,
    connected: true,
    tokenOk: true,
    apiOk: true,
    probePath: agencies.path,
    expiresAt: ensured.tokens.expiresAt,
    scope: ensured.tokens.scope,
    message: `Domain org token + ${me.path} + ${agencies.path} OK`,
  };
}
