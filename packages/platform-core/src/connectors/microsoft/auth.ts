/**
 * Microsoft 365 / Outlook OAuth via Microsoft Graph.
 *
 * Env:
 *   MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
 *   MICROSOFT_REDIRECT_URI (default …/api/connectors/microsoft-365/callback)
 *   MICROSOFT_OAUTH_SCOPES (optional override)
 *   MICROSOFT_TENANT (default "common")
 */

import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

export const MICROSOFT_365_CONNECTOR_ID = "microsoft-365";

export const MICROSOFT_365_DEFAULT_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "User.Read",
  "Mail.Read",
  "Mail.Send",
].join(" ");

export type OrgMicrosoft365ConnectorTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
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

type MicrosoftTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

type MicrosoftTokenBundle = MicrosoftTokenResponse & {
  obtainedAt: string;
  expiresAt: string;
};

function getTenant(): string {
  return process.env.MICROSOFT_TENANT?.trim() || "common";
}

function getRedirectUri(): string {
  return (
    process.env.MICROSOFT_REDIRECT_URI?.trim() ||
    "https://app.digitalgate.com.au/api/connectors/microsoft-365/callback"
  );
}

function getScopes(): string {
  return (
    process.env.MICROSOFT_OAUTH_SCOPES?.trim() || MICROSOFT_365_DEFAULT_OAUTH_SCOPES
  );
}

function authorizeUrl(): string {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/authorize`;
}

function tokenUrl(): string {
  return `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/token`;
}

export function microsoftCredentialsConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_CLIENT_ID?.trim() &&
      process.env.MICROSOFT_CLIENT_SECRET?.trim(),
  );
}

export function getMicrosoftOAuthRedirectUri(): string {
  return getRedirectUri();
}

function bundleToken(raw: MicrosoftTokenResponse): MicrosoftTokenBundle {
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
  | { ok: true; token: MicrosoftTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const res = await fetch(tokenUrl(), {
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
          : `Microsoft token HTTP ${res.status}`;
    return { ok: false, status: res.status, message: err, raw: json };
  }
  const token = json as MicrosoftTokenResponse;
  if (!token?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: "Microsoft token response missing access_token",
      raw: json,
    };
  }
  return { ok: true, token: bundleToken(token) };
}

export function buildMicrosoftAuthorizeUrl(input: {
  state: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  if (!microsoftCredentialsConfigured()) {
    return {
      ok: false,
      message:
        "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET not set — add them on Vercel (and .env.local)",
    };
  }
  const url = new URL(authorizeUrl());
  url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID!.trim());
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", getScopes());
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_mode", "query");
  return { ok: true, url: url.toString() };
}

export async function exchangeMicrosoftAuthorizationCode(input: {
  code: string;
}): Promise<
  | { ok: true; token: MicrosoftTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  if (!microsoftCredentialsConfigured()) {
    return {
      ok: false,
      status: 503,
      message: "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET not set",
    };
  }
  return postToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: getRedirectUri(),
      client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
      scope: getScopes(),
    }),
  );
}

async function refreshMicrosoftAccessToken(input: {
  refreshToken: string;
}): Promise<
  | { ok: true; token: MicrosoftTokenBundle }
  | { ok: false; status: number; message: string }
> {
  if (!microsoftCredentialsConfigured()) {
    return {
      ok: false,
      status: 503,
      message: "MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET not set",
    };
  }
  return postToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID!.trim(),
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!.trim(),
      scope: getScopes(),
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

export async function getOrgMicrosoft365ConnectorTokens(
  organisationId: string,
): Promise<OrgMicrosoft365ConnectorTokens | null> {
  const blob = await getOrgConnectorSettings(
    organisationId,
    MICROSOFT_365_CONNECTOR_ID,
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
        ? (blob.health as OrgMicrosoft365ConnectorTokens["health"])
        : undefined,
  };
}

export async function saveOrgMicrosoft365ConnectorTokens(
  organisationId: string,
  tokens: OrgMicrosoft365ConnectorTokens,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, MICROSOFT_365_CONNECTOR_ID, {
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

export async function clearOrgMicrosoft365ConnectorTokens(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, MICROSOFT_365_CONNECTOR_ID);
}

export async function ensureValidOrgMicrosoft365AccessToken(
  organisationId: string,
): Promise<
  | { ok: true; accessToken: string; tokens: OrgMicrosoft365ConnectorTokens }
  | { ok: false; message: string }
> {
  const tokens = await getOrgMicrosoft365ConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return { ok: false, message: "Microsoft 365 not connected for this organisation" };
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
      message: "Microsoft access token expired — reconnect the mailbox",
    };
  }

  const refreshed = await refreshMicrosoftAccessToken({
    refreshToken: tokens.refreshToken,
  });
  if (!refreshed.ok) {
    await saveOrgMicrosoft365ConnectorTokens(organisationId, {
      ...tokens,
      lastError: refreshed.message,
    });
    return { ok: false, message: refreshed.message };
  }

  const next: OrgMicrosoft365ConnectorTokens = {
    ...tokens,
    accessToken: refreshed.token.access_token,
    refreshToken: refreshed.token.refresh_token || tokens.refreshToken,
    expiresAt: refreshed.token.expiresAt,
    scope: refreshed.token.scope || tokens.scope,
    lastError: undefined,
  };
  await saveOrgMicrosoft365ConnectorTokens(organisationId, next);
  return { ok: true, accessToken: next.accessToken!, tokens: next };
}

export async function graphApiGet(
  url: string,
  accessToken: string,
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
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
    data = { raw: text };
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String(
            (data as { error?: { message?: string } }).error?.message ||
              `Graph HTTP ${res.status}`,
          )
        : `Graph HTTP ${res.status}`;
    return { ok: false, message };
  }
  return { ok: true, data };
}

export async function fetchMicrosoftProfileEmail(
  accessToken: string,
): Promise<string | null> {
  const probe = await graphApiGet("https://graph.microsoft.com/v1.0/me", accessToken);
  if (!probe.ok || !probe.data || typeof probe.data !== "object") return null;
  const me = probe.data as { mail?: string; userPrincipalName?: string };
  const email = (me.mail || me.userPrincipalName || "").trim();
  return email.includes("@") ? email : null;
}

export async function probeOrgMicrosoft365Connection(organisationId: string): Promise<{
  ok: boolean;
  connected: boolean;
  apiOk?: boolean;
  email?: string | null;
  expiresAt?: string;
  message: string;
}> {
  const ensured = await ensureValidOrgMicrosoft365AccessToken(organisationId);
  if (!ensured.ok) {
    return { ok: false, connected: false, message: ensured.message };
  }

  const email = await fetchMicrosoftProfileEmail(ensured.accessToken);
  if (!email) {
    return {
      ok: false,
      connected: true,
      apiOk: false,
      expiresAt: ensured.tokens.expiresAt,
      message: "Token OK · Microsoft profile probe failed",
    };
  }

  return {
    ok: true,
    connected: true,
    apiOk: true,
    email,
    expiresAt: ensured.tokens.expiresAt,
    message: `Microsoft 365 connected · ${email}`,
  };
}
