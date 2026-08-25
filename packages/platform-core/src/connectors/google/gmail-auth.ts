/**
 * Google Gmail OAuth — separate connector from GBP (`google-gmail`).
 *
 * Env:
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (shared with GBP)
 *   GOOGLE_GMAIL_REDIRECT_URI (default …/api/connectors/google-gmail/callback)
 *   GOOGLE_GMAIL_OAUTH_SCOPES (optional override)
 */

import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";
import {
  GOOGLE_AUTH_AUTHORIZE_URL,
  GOOGLE_AUTH_TOKEN_URL,
  googleApiGet,
  googleCredentialsConfigured,
  refreshGoogleAccessToken,
  type GoogleTokenBundle,
  type GoogleTokenResponse,
} from "./auth";

export const GOOGLE_GMAIL_CONNECTOR_ID = "google-gmail";

export const GOOGLE_GMAIL_DEFAULT_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
].join(" ");

export type OrgGoogleGmailConnectorTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
  /** Connected mailbox email (from Gmail profile / id token). */
  label?: string;
  lastError?: string;
  health?: {
    status: "connected" | "degraded" | "error" | "disconnected";
    lastSyncAt?: string | null;
    lastError?: string | null;
    messagesSynced?: number;
    message?: string | null;
  };
};

function getGmailRedirectUri(): string {
  return (
    process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim() ||
    "https://app.digitalgate.com.au/api/connectors/google-gmail/callback"
  );
}

function getGmailScopes(): string {
  return (
    process.env.GOOGLE_GMAIL_OAUTH_SCOPES?.trim() || GOOGLE_GMAIL_DEFAULT_OAUTH_SCOPES
  );
}

export function gmailCredentialsConfigured(): boolean {
  return googleCredentialsConfigured();
}

export function getGmailOAuthRedirectUri(): string {
  return getGmailRedirectUri();
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

export function buildGmailAuthorizeUrl(input: {
  state: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — add them on Vercel (and .env.local)",
    };
  }
  const url = new URL(GOOGLE_AUTH_AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getGmailRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getGmailScopes());
  url.searchParams.set("state", input.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return { ok: true, url: url.toString() };
}

export async function exchangeGmailAuthorizationCode(input: {
  code: string;
}): Promise<
  | { ok: true; token: GoogleTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      status: 503,
      message: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set",
    };
  }
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: getGmailRedirectUri(),
      client_id: clientId,
      client_secret: clientSecret,
    }),
  );
}

function encryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return encryptSecret(value);
}

function decryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return decryptSecret(value) || value;
}

export async function getOrgGoogleGmailConnectorTokens(
  organisationId: string,
): Promise<OrgGoogleGmailConnectorTokens | null> {
  const blob = await getOrgConnectorSettings(
    organisationId,
    GOOGLE_GMAIL_CONNECTOR_ID,
  );
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
    connectedAt:
      typeof blob.connectedAt === "string" ? blob.connectedAt : undefined,
    label: typeof blob.label === "string" ? blob.label : undefined,
    lastError: typeof blob.lastError === "string" ? blob.lastError : undefined,
    health:
      blob.health && typeof blob.health === "object"
        ? (blob.health as OrgGoogleGmailConnectorTokens["health"])
        : undefined,
  };
}

export async function saveOrgGoogleGmailConnectorTokens(
  organisationId: string,
  tokens: OrgGoogleGmailConnectorTokens,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, GOOGLE_GMAIL_CONNECTOR_ID, {
    accessToken: encryptTokenField(tokens.accessToken),
    refreshToken: encryptTokenField(tokens.refreshToken),
    expiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    connectedAt: tokens.connectedAt ?? new Date().toISOString(),
    label: tokens.label ?? null,
    lastError: tokens.lastError ?? null,
    health: tokens.health ?? null,
  });
}

export async function clearOrgGoogleGmailConnectorTokens(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, GOOGLE_GMAIL_CONNECTOR_ID);
}

export async function ensureValidOrgGoogleGmailAccessToken(
  organisationId: string,
): Promise<
  | { ok: true; accessToken: string; tokens: OrgGoogleGmailConnectorTokens }
  | { ok: false; message: string }
> {
  const tokens = await getOrgGoogleGmailConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return { ok: false, message: "Gmail not connected for this organisation" };
  }

  const expiresAt = tokens.expiresAt ? Date.parse(tokens.expiresAt) : 0;
  const needsRefresh =
    Boolean(tokens.refreshToken) &&
    (!tokens.accessToken ||
      !Number.isFinite(expiresAt) ||
      expiresAt < Date.now() + 60_000);

  if (!needsRefresh && tokens.accessToken) {
    return { ok: true, accessToken: tokens.accessToken, tokens };
  }

  if (!tokens.refreshToken) {
    return {
      ok: false,
      message: "Gmail access token expired — reconnect the mailbox",
    };
  }

  const refreshed = await refreshGoogleAccessToken({
    refreshToken: tokens.refreshToken,
  });
  if (!refreshed.ok) {
    await saveOrgGoogleGmailConnectorTokens(organisationId, {
      ...tokens,
      lastError: refreshed.message,
    });
    return { ok: false, message: refreshed.message };
  }

  const next: OrgGoogleGmailConnectorTokens = {
    ...tokens,
    accessToken: refreshed.token.access_token,
    refreshToken: refreshed.token.refresh_token || tokens.refreshToken,
    expiresAt: refreshed.token.expiresAt,
    scope: refreshed.token.scope || tokens.scope,
    lastError: undefined,
  };
  await saveOrgGoogleGmailConnectorTokens(organisationId, next);
  return { ok: true, accessToken: next.accessToken!, tokens: next };
}

/** Fetch Gmail profile emailAddress for the connected account. */
export async function fetchGmailProfileEmail(
  accessToken: string,
): Promise<string | null> {
  const probe = await googleApiGet(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    accessToken,
  );
  if (!probe.ok || !probe.data || typeof probe.data !== "object") return null;
  const email = (probe.data as { emailAddress?: string }).emailAddress;
  return typeof email === "string" && email.trim() ? email.trim() : null;
}

export async function probeOrgGoogleGmailConnection(organisationId: string): Promise<{
  ok: boolean;
  connected: boolean;
  apiOk?: boolean;
  email?: string | null;
  expiresAt?: string;
  message: string;
}> {
  const ensured = await ensureValidOrgGoogleGmailAccessToken(organisationId);
  if (!ensured.ok) {
    return { ok: false, connected: false, message: ensured.message };
  }

  const email = await fetchGmailProfileEmail(ensured.accessToken);
  if (!email) {
    return {
      ok: false,
      connected: true,
      apiOk: false,
      expiresAt: ensured.tokens.expiresAt,
      message: "Token OK · Gmail profile probe failed",
    };
  }

  return {
    ok: true,
    connected: true,
    apiOk: true,
    email,
    expiresAt: ensured.tokens.expiresAt,
    message: `Gmail connected · ${email}`,
  };
}
