/**
 * Google Business Profile OAuth (platform credentials + per-org tokens).
 *
 * Env (Vercel):
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REDIRECT_URI (default https://app.digitalgate.com.au/api/connectors/google/callback)
 *   GOOGLE_OAUTH_SCOPES (optional)
 *
 * Distinct from GOOGLE_GEOCODING_API_KEY / GOOGLE_PLACES_API_KEY.
 */

import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

export const GOOGLE_AUTH_AUTHORIZE_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_AUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_GBP_ACCOUNTS_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

/** GBP management + identity (offline refresh via access_type=offline). */
export const GOOGLE_DEFAULT_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/business.manage",
].join(" ");

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
};

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
};

export type GoogleTokenBundle = GoogleTokenResponse & {
  obtainedAt: string;
  expiresAt: string;
};

export type OrgGoogleGbpConnectorTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
  label?: string;
  lastError?: string;
};

export function getGoogleOAuthConfig():
  | { ok: true; config: GoogleOAuthConfig }
  | { ok: false; message: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    "https://app.digitalgate.com.au/api/connectors/google/callback";
  const scopes =
    process.env.GOOGLE_OAUTH_SCOPES?.trim() || GOOGLE_DEFAULT_OAUTH_SCOPES;

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — add them on Vercel (and .env.local)",
    };
  }

  return {
    ok: true,
    config: { clientId, clientSecret, redirectUri, scopes },
  };
}

export function googleCredentialsConfigured(): boolean {
  return getGoogleOAuthConfig().ok;
}

function bundleToken(raw: GoogleTokenResponse): GoogleTokenBundle {
  const obtainedAt = new Date();
  const expiresAt = new Date(
    obtainedAt.getTime() + Math.max(0, raw.expires_in - 60) * 1000,
  );
  return {
    ...raw,
    obtainedAt: obtainedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

async function postToken(
  body: URLSearchParams,
): Promise<
  | { ok: true; token: GoogleTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const res = await fetch(GOOGLE_AUTH_TOKEN_URL, {
    method: "POST",
    headers: {
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
          : `Google token HTTP ${res.status}`;
    return { ok: false, status: res.status, message: err, raw: json };
  }
  const token = json as GoogleTokenResponse;
  if (!token?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: "Google token response missing access_token",
      raw: json,
    };
  }
  return { ok: true, token: bundleToken(token) };
}

export function buildGoogleAuthorizeUrl(input: {
  state: string;
  scopes?: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  const cfg = getGoogleOAuthConfig();
  if (!cfg.ok) return { ok: false, message: cfg.message };
  const scope = input.scopes?.trim() || cfg.config.scopes;
  const url = new URL(GOOGLE_AUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", cfg.config.clientId);
  url.searchParams.set("redirect_uri", cfg.config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", input.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return { ok: true, url: url.toString() };
}

export async function exchangeGoogleAuthorizationCode(input: {
  code: string;
}): Promise<
  | { ok: true; token: GoogleTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getGoogleOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: cfg.config.redirectUri,
      client_id: cfg.config.clientId,
      client_secret: cfg.config.clientSecret,
    }),
  );
}

export async function refreshGoogleAccessToken(input: {
  refreshToken: string;
}): Promise<
  | { ok: true; token: GoogleTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getGoogleOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
      client_id: cfg.config.clientId,
      client_secret: cfg.config.clientSecret,
    }),
  );
}

export async function googleApiGet(
  url: string,
  accessToken: string,
): Promise<{ ok: true; status: number; data: unknown } | { ok: false; status: number; message: string }> {
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
        typeof data === "object" && data && "error" in data
          ? JSON.stringify((data as { error?: unknown }).error)
          : `Google API HTTP ${res.status}`,
    };
  }
  return { ok: true, status: res.status, data };
}

function encryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return encryptSecret(value);
}

function decryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return decryptSecret(value) || value;
}

export async function getOrgGoogleGbpConnectorTokens(
  organisationId: string,
): Promise<OrgGoogleGbpConnectorTokens | null> {
  const blob = await getOrgConnectorSettings(organisationId, "google-gbp");
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

export async function saveOrgGoogleGbpConnectorTokens(
  organisationId: string,
  tokens: OrgGoogleGbpConnectorTokens,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, "google-gbp", {
    accessToken: encryptTokenField(tokens.accessToken),
    refreshToken: encryptTokenField(tokens.refreshToken),
    expiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    connectedAt: tokens.connectedAt ?? new Date().toISOString(),
    label: tokens.label ?? null,
    lastError: tokens.lastError ?? null,
  });
}

export async function clearOrgGoogleGbpConnectorTokens(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, "google-gbp");
}

/** Refresh if expired / near expiry; returns usable access token. */
export async function ensureValidOrgGoogleAccessToken(
  organisationId: string,
): Promise<
  | { ok: true; accessToken: string; tokens: OrgGoogleGbpConnectorTokens }
  | { ok: false; message: string }
> {
  const tokens = await getOrgGoogleGbpConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return { ok: false, message: "Google Business Profile not connected for this organisation" };
  }

  const expiresAt = tokens.expiresAt ? Date.parse(tokens.expiresAt) : 0;
  const needsRefresh =
    Boolean(tokens.refreshToken) &&
    (!tokens.accessToken || !Number.isFinite(expiresAt) || expiresAt < Date.now() + 60_000);

  if (!needsRefresh && tokens.accessToken) {
    return { ok: true, accessToken: tokens.accessToken, tokens };
  }

  if (!tokens.refreshToken) {
    return { ok: false, message: "Google access token expired — reconnect the account" };
  }

  const refreshed = await refreshGoogleAccessToken({ refreshToken: tokens.refreshToken });
  if (!refreshed.ok) {
    await saveOrgGoogleGbpConnectorTokens(organisationId, {
      ...tokens,
      lastError: refreshed.message,
    });
    return { ok: false, message: refreshed.message };
  }

  const next: OrgGoogleGbpConnectorTokens = {
    ...tokens,
    accessToken: refreshed.token.access_token,
    refreshToken: refreshed.token.refresh_token || tokens.refreshToken,
    expiresAt: refreshed.token.expiresAt,
    scope: refreshed.token.scope || tokens.scope,
    lastError: undefined,
  };
  await saveOrgGoogleGbpConnectorTokens(organisationId, next);
  return { ok: true, accessToken: next.accessToken!, tokens: next };
}

/** Org-token probe against GBP accounts API. */
export async function probeOrgGoogleGbpConnection(organisationId: string): Promise<{
  ok: boolean;
  connected: boolean;
  apiOk?: boolean;
  expiresAt?: string;
  message: string;
  accountCount?: number;
}> {
  const ensured = await ensureValidOrgGoogleAccessToken(organisationId);
  if (!ensured.ok) {
    return { ok: false, connected: false, message: ensured.message };
  }

  const probe = await googleApiGet(GOOGLE_GBP_ACCOUNTS_URL, ensured.accessToken);
  if (!probe.ok) {
    return {
      ok: false,
      connected: true,
      apiOk: false,
      expiresAt: ensured.tokens.expiresAt,
      message: `Token OK · GBP probe: ${probe.message}`,
    };
  }

  const accounts =
    probe.data && typeof probe.data === "object" && "accounts" in probe.data
      ? (probe.data as { accounts?: unknown[] }).accounts
      : null;
  const accountCount = Array.isArray(accounts) ? accounts.length : undefined;

  return {
    ok: true,
    connected: true,
    apiOk: true,
    expiresAt: ensured.tokens.expiresAt,
    accountCount,
    message:
      accountCount != null
        ? `Google GBP connected · ${accountCount} account(s)`
        : "Google GBP connected · accounts probe OK",
  };
}
