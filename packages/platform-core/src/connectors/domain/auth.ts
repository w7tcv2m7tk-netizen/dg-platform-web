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
 * API:  https://api.domain.com.au
 *
 * Platform env (Vercel):
 *   DOMAIN_CLIENT_ID
 *   DOMAIN_CLIENT_SECRET
 *   DOMAIN_REDIRECT_URI (default https://app.digitalgate.com.au/api/connectors/domain/callback)
 *   DOMAIN_OAUTH_SCOPES (optional space-separated)
 *
 * @see docs/foundations/PROPERTY-SYNDICATION.md
 */

export const DOMAIN_AUTH_TOKEN_URL = "https://auth.domain.com.au/v1/connect/token";
export const DOMAIN_AUTH_AUTHORIZE_URL =
  "https://auth.domain.com.au/v1/connect/authorize";
export const DOMAIN_API_BASE_URL = "https://api.domain.com.au";

/** Default scopes for client-credentials smoke tests (read APIs). Expand per product access. */
export const DOMAIN_DEFAULT_CLIENT_CREDENTIAL_SCOPES =
  "api_agencies_read api_listings_read";

/** Auth-code scopes for agency-context listing management (add write scopes when approved). */
export const DOMAIN_DEFAULT_AUTH_CODE_SCOPES =
  "openid profile offline_access api_agencies_read api_listings_read";

export type DomainOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  clientCredentialScopes: string;
  authCodeScopes: string;
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
    },
  };
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

/** Lightweight authenticated GET against Domain API. */
export async function domainApiGet(
  path: string,
  accessToken: string,
): Promise<{ ok: true; status: number; data: unknown } | { ok: false; status: number; message: string }> {
  const url = path.startsWith("http")
    ? path
    : `${DOMAIN_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
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
    data = text;
  }
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message:
        typeof data === "object" && data && "message" in data
          ? String((data as { message?: string }).message)
          : `Domain API HTTP ${res.status}`,
    };
  }
  return { ok: true, status: res.status, data };
}

/** Smoke: client-credentials token + agencies read. */
export async function probeDomainConnection(): Promise<{
  ok: boolean;
  configured: boolean;
  tokenOk?: boolean;
  apiOk?: boolean;
  expiresAt?: string;
  message: string;
}> {
  const cfg = getDomainOAuthConfig();
  if (!cfg.ok) {
    return { ok: false, configured: false, message: cfg.message };
  }
  const token = await fetchDomainClientCredentialsToken();
  if (!token.ok) {
    return {
      ok: false,
      configured: true,
      tokenOk: false,
      message: token.message,
    };
  }
  const probe = await domainApiGet("/v1/agencies", token.token.access_token);
  if (!probe.ok) {
    // Token worked even if this endpoint is out of plan — still report partial success.
    return {
      ok: true,
      configured: true,
      tokenOk: true,
      apiOk: false,
      expiresAt: token.token.expiresAt,
      message: `Token OK · API probe: ${probe.message}`,
    };
  }
  return {
    ok: true,
    configured: true,
    tokenOk: true,
    apiOk: true,
    expiresAt: token.token.expiresAt,
    message: "Domain client credentials + API probe OK",
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

/** Org-token probe against Domain agencies API. */
export async function probeOrgDomainConnection(organisationId: string): Promise<{
  ok: boolean;
  connected: boolean;
  apiOk?: boolean;
  expiresAt?: string;
  message: string;
}> {
  const ensured = await ensureValidOrgDomainAccessToken(organisationId);
  if (!ensured.ok) {
    return { ok: false, connected: false, message: ensured.message };
  }

  const probe = await domainApiGet("/v1/agencies", ensured.accessToken);
  if (!probe.ok) {
    return {
      ok: false,
      connected: true,
      apiOk: false,
      expiresAt: ensured.tokens.expiresAt,
      message: `Token OK · API probe: ${probe.message}`,
    };
  }

  return {
    ok: true,
    connected: true,
    apiOk: true,
    expiresAt: ensured.tokens.expiresAt,
    message: "Domain org token + agencies probe OK",
  };
}
