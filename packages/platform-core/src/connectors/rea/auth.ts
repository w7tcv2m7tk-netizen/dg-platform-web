import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

/**
 * realestate.com.au (REA Group) Partner Platform client.
 *
 * Auth model (public partner docs): OAuth 2.0 **client_credentials** only —
 * not Authorization Code (unlike Domain Listings Management).
 *
 *   Token: POST https://api.realestate.com.au/oauth/token
 *   API:   https://api.realestate.com.au
 *   Probe: GET /me/v1/integrations
 *   Upload: POST /listing/v1/upload (REAXML, text/xml)
 *
 * Platform env (Vercel):
 *   REA_CLIENT_ID
 *   REA_CLIENT_SECRET
 *   REA_API_BASE_URL (default https://api.realestate.com.au)
 *   REA_AUTH_TOKEN_URL (default {apiBase}/oauth/token)
 *   REA_OAUTH_SCOPES (optional — usually unused; scopes come from agency grants)
 *
 * Org “connect” = bind REA agency id (agentID / ownerId) after Ignite / Change of
 * Uploader activation — not a user OAuth redirect.
 *
 * @see https://partner.realestate.com.au/getting-started/authentication/
 * @see docs/connectors/REA.md
 */

export const REA_CONNECTOR_ID = "rea" as const;

export const REA_DEFAULT_API_BASE_URL = "https://api.realestate.com.au";
export const REA_INTEGRATIONS_PATH = "/me/v1/integrations";
export const REA_LISTING_UPLOAD_PATH = "/listing/v1/upload";

/** @deprecated REA Partner Platform does not use Authorization Code redirect. */
export const REA_DEFAULT_REDIRECT_URI =
  "https://app.digitalgate.com.au/api/connectors/rea/callback";

/** @deprecated Prefer REA_DEFAULT_API_BASE_URL + /oauth/token */
export const REA_AUTH_AUTHORIZE_URL_PLACEHOLDER = "";
/** @deprecated Prefer getReaOAuthConfig().config.tokenUrl */
export const REA_AUTH_TOKEN_URL_PLACEHOLDER = "";

export type ReaOAuthConfig = {
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  tokenUrl: string;
  scopes: string;
};

export type ReaTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  consumer_id?: string;
};

export type ReaTokenBundle = ReaTokenResponse & {
  obtainedAt: string;
  expiresAt: string;
};

export type OrgReaConnectorTokens = {
  /**
   * Unused for Partner Platform client_credentials — kept for blob compatibility.
   * Org connection is `reaAgencyId`, not a user token.
   */
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
  label?: string;
  /** REA agency / agentID (ownerId from Integrations API) */
  reaAgencyId?: string;
  lastError?: string;
};

export type ReaIntegrationSummary = {
  integrationId?: string;
  ownerId: string;
  ownerType?: string;
  scopes: string[];
  updatedAt?: string;
};

export type ReaPlatformProbeResult = {
  ok: boolean;
  configured: boolean;
  tokenOk?: boolean;
  apiOk?: boolean;
  probePath?: string;
  expiresAt?: string;
  scope?: string;
  consumerId?: string;
  integrations?: ReaIntegrationSummary[];
  message: string;
};

export type ReaOrgProbeResult = {
  ok: boolean;
  connected: boolean;
  message: string;
  reaAgencyId?: string | null;
  scopes?: string[];
  listingWriteGranted?: boolean;
};

let cachedPlatformToken: ReaTokenBundle | null = null;

export function getReaOAuthConfig():
  | { ok: true; config: ReaOAuthConfig }
  | { ok: false; message: string } {
  const clientId = process.env.REA_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.REA_CLIENT_SECRET?.trim() || "";
  const apiBaseUrl = (
    process.env.REA_API_BASE_URL?.trim() || REA_DEFAULT_API_BASE_URL
  ).replace(/\/+$/, "");
  const tokenUrl =
    process.env.REA_AUTH_TOKEN_URL?.trim() || `${apiBaseUrl}/oauth/token`;
  const scopes = process.env.REA_OAUTH_SCOPES?.trim() || "";

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "REA_CLIENT_ID / REA_CLIENT_SECRET not set — add Partner Platform credentials on Vercel",
    };
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      apiBaseUrl,
      tokenUrl,
      scopes,
    },
  };
}

export function reaCredentialsConfigured(): boolean {
  return getReaOAuthConfig().ok;
}

/**
 * Token endpoint is known from public partner docs (defaults applied).
 * Kept for UI/status parity with the earlier scaffold.
 */
export function reaOAuthEndpointsConfigured(): boolean {
  const cfg = getReaOAuthConfig();
  if (!cfg.ok) return false;
  return Boolean(cfg.config.tokenUrl);
}

/** True when Listing Upload path is wired in code (accept → pending). */
export function reaPublishImplemented(): boolean {
  return true;
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function bundleToken(raw: ReaTokenResponse): ReaTokenBundle {
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

/**
 * @deprecated REA Partner Platform uses client_credentials — no authorize URL.
 */
export function buildReaAuthorizeUrl(_opts: {
  state: string;
  nonce?: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  return {
    ok: false,
    message:
      "REA Partner Platform uses OAuth client_credentials (no user authorize redirect). Bind an agency id under Settings → Connectors after Ignite / Change of Uploader activation.",
  };
}

export async function fetchReaClientCredentialsToken(options?: {
  scopes?: string;
  forceRefresh?: boolean;
}): Promise<
  | { ok: true; token: ReaTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getReaOAuthConfig();
  if (!cfg.ok) return { ok: false, status: 503, message: cfg.message };

  if (
    !options?.forceRefresh &&
    cachedPlatformToken &&
    Date.parse(cachedPlatformToken.expiresAt) > Date.now() + 30_000
  ) {
    return { ok: true, token: cachedPlatformToken };
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const scope = options?.scopes?.trim() || cfg.config.scopes;
  if (scope) body.set("scope", scope);

  const res = await fetch(cfg.config.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(cfg.config.clientId, cfg.config.clientSecret),
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
          : `REA token HTTP ${res.status}`;
    return { ok: false, status: res.status, message: err, raw: json };
  }
  const token = json as ReaTokenResponse;
  if (!token?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: "REA token response missing access_token",
      raw: json,
    };
  }
  const bundled = bundleToken(token);
  cachedPlatformToken = bundled;
  return { ok: true, token: bundled };
}

function extractReaApiErrorMessage(status: number, data: unknown): string {
  if (typeof data === "string" && data.trim()) {
    return `REA API HTTP ${status}: ${data.trim().slice(0, 300)}`;
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["message", "title", "detail", "error_description", "error"] as const) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) {
        return `REA API HTTP ${status}: ${value.trim()}`;
      }
    }
  }
  return `REA API HTTP ${status}`;
}

export type ReaApiSuccess = {
  ok: true;
  status: number;
  data: unknown;
  path: string;
};

export type ReaApiFailure = {
  ok: false;
  status: number;
  message: string;
  path: string;
  raw?: unknown;
};

async function reaApiRequest(
  method: "GET" | "POST" | "PUT",
  path: string,
  accessToken: string,
  body?: unknown,
  contentType?: string,
): Promise<ReaApiSuccess | ReaApiFailure> {
  const cfg = getReaOAuthConfig();
  const base = cfg.ok ? cfg.config.apiBaseUrl : REA_DEFAULT_API_BASE_URL;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  const url = normalised.startsWith("http") ? normalised : `${base}${normalised}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (body !== undefined) {
    if (typeof body === "string") {
      headers["Content-Type"] = contentType || "text/xml";
      payload = body;
    } else {
      headers["Content-Type"] = contentType || "application/json";
      payload = JSON.stringify(body);
    }
  }
  const res = await fetch(url, { method, headers, body: payload });
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
      path: normalised,
      raw: data,
      message: extractReaApiErrorMessage(res.status, data),
    };
  }
  return { ok: true, status: res.status, data, path: normalised };
}

export async function reaApiGet(
  path: string,
  accessToken: string,
): Promise<ReaApiSuccess | ReaApiFailure> {
  return reaApiRequest("GET", path, accessToken);
}

export async function reaApiPost(
  path: string,
  accessToken: string,
  body?: unknown,
  contentType?: string,
): Promise<ReaApiSuccess | ReaApiFailure> {
  return reaApiRequest("POST", path, accessToken, body, contentType);
}

export function parseReaIntegrationsPayload(data: unknown): ReaIntegrationSummary[] {
  const embedded =
    data && typeof data === "object"
      ? (data as { _embedded?: { integrations?: unknown } })._embedded
      : undefined;
  const rows = Array.isArray(embedded?.integrations)
    ? embedded!.integrations!
    : Array.isArray(data)
      ? data
      : [];
  const out: ReaIntegrationSummary[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const ownerIdRaw = (row as { ownerId?: unknown }).ownerId;
    const ownerId =
      typeof ownerIdRaw === "string" && ownerIdRaw.trim()
        ? ownerIdRaw.trim()
        : typeof ownerIdRaw === "number" && Number.isFinite(ownerIdRaw)
          ? String(ownerIdRaw)
          : "";
    if (!ownerId) continue;
    const scopesRaw = (row as { scopes?: unknown }).scopes;
    const scopes = Array.isArray(scopesRaw)
      ? scopesRaw.filter((s): s is string => typeof s === "string")
      : [];
    out.push({
      ownerId,
      ownerType:
        typeof (row as { ownerType?: unknown }).ownerType === "string"
          ? (row as { ownerType: string }).ownerType
          : undefined,
      integrationId:
        typeof (row as { integrationId?: unknown }).integrationId === "string"
          ? (row as { integrationId: string }).integrationId
          : undefined,
      updatedAt:
        typeof (row as { updatedAt?: unknown }).updatedAt === "string"
          ? (row as { updatedAt: string }).updatedAt
          : undefined,
      scopes,
    });
  }
  return out;
}

export async function probeReaConnection(): Promise<ReaPlatformProbeResult> {
  const cfg = getReaOAuthConfig();
  if (!cfg.ok) {
    return { ok: false, configured: false, message: cfg.message };
  }

  const token = await fetchReaClientCredentialsToken();
  if (!token.ok) {
    return {
      ok: false,
      configured: true,
      tokenOk: false,
      message: `Token failed: ${token.message}`,
    };
  }

  const probe = await reaApiGet(REA_INTEGRATIONS_PATH, token.token.access_token);
  if (!probe.ok) {
    return {
      ok: false,
      configured: true,
      tokenOk: true,
      apiOk: false,
      probePath: probe.path,
      expiresAt: token.token.expiresAt,
      scope: token.token.scope,
      consumerId: token.token.consumer_id,
      message: `Token OK · Integrations probe (${probe.path}): ${probe.message}. Confirm partner credentials and that agencies have activated DigitalGate via Ignite / Change of Uploader.`,
    };
  }

  const integrations = parseReaIntegrationsPayload(probe.data);
  return {
    ok: true,
    configured: true,
    tokenOk: true,
    apiOk: true,
    probePath: probe.path,
    expiresAt: token.token.expiresAt,
    scope: token.token.scope,
    consumerId: token.token.consumer_id,
    integrations,
    message:
      integrations.length > 0
        ? `REA client credentials + ${probe.path} OK · ${integrations.length} agency integration(s)`
        : `REA client credentials + ${probe.path} OK · no agency integrations yet (activate Roe in Ignite / Change of Uploader)`,
  };
}

function encryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return encryptSecret(value);
}

function decryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  const decrypted = decryptSecret(value);
  return decrypted || value;
}

export async function getOrgReaConnectorTokens(
  organisationId: string,
): Promise<OrgReaConnectorTokens | null> {
  const blob = await getOrgConnectorSettings(organisationId, REA_CONNECTOR_ID);
  if (!blob) return null;
  const agencyRaw = blob.reaAgencyId;
  const reaAgencyId =
    typeof agencyRaw === "string" && agencyRaw.trim()
      ? agencyRaw.trim()
      : typeof agencyRaw === "number" && Number.isFinite(agencyRaw)
        ? String(agencyRaw)
        : undefined;

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
    reaAgencyId,
    lastError: typeof blob.lastError === "string" ? blob.lastError : undefined,
  };
}

export async function saveOrgReaConnectorTokens(
  organisationId: string,
  tokens: OrgReaConnectorTokens,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, REA_CONNECTOR_ID, {
    accessToken: encryptTokenField(tokens.accessToken),
    refreshToken: encryptTokenField(tokens.refreshToken),
    expiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    connectedAt: tokens.connectedAt ?? new Date().toISOString(),
    label: tokens.label ?? null,
    reaAgencyId: tokens.reaAgencyId ?? null,
    lastError: tokens.lastError ?? null,
  });
}

export async function clearOrgReaConnectorTokens(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, REA_CONNECTOR_ID);
}

/**
 * Bind this organisation to a REA agency id (agentID).
 * Prefer an ownerId returned by GET /me/v1/integrations when available.
 */
export async function activateOrgReaAgency(input: {
  organisationId: string;
  reaAgencyId: string;
  label?: string;
}): Promise<
  | { ok: true; tokens: OrgReaConnectorTokens; integration?: ReaIntegrationSummary }
  | { ok: false; message: string }
> {
  const agencyId = input.reaAgencyId.trim();
  if (!agencyId) {
    return { ok: false, message: "REA agency id is required" };
  }
  if (!reaCredentialsConfigured()) {
    return {
      ok: false,
      message:
        "REA OAuth not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET on Vercel",
    };
  }

  const platform = await probeReaConnection();
  let matched: ReaIntegrationSummary | undefined;
  if (platform.ok && platform.integrations?.length) {
    matched = platform.integrations.find(
      (i) => i.ownerId.toLowerCase() === agencyId.toLowerCase(),
    );
    if (!matched) {
      return {
        ok: false,
        message: `Agency "${agencyId}" is not in Partner Platform integrations yet. Activate DigitalGate for this agency in Ignite / Change of Uploader, then retry. Known: ${platform.integrations.map((i) => i.ownerId).join(", ") || "(none)"}`,
      };
    }
  } else if (!platform.tokenOk) {
    return {
      ok: false,
      message: platform.message,
    };
  }
  // Token OK but integrations empty / probe soft-fail: allow bind with warning stored.

  const writeScope = matched?.scopes.includes("listing:listings:write");
  const tokens: OrgReaConnectorTokens = {
    reaAgencyId: matched?.ownerId ?? agencyId,
    connectedAt: new Date().toISOString(),
    label: input.label ?? matched?.ownerId ?? agencyId,
    scope: matched?.scopes.join(",") ?? platform.scope,
    lastError:
      matched && !writeScope
        ? "Agency integration found but listing:listings:write not granted yet — upload will fail until REA adds upload scope"
        : platform.apiOk === false
          ? `Bound without integrations list verify: ${platform.message}`
          : undefined,
  };
  await saveOrgReaConnectorTokens(input.organisationId, tokens);
  return { ok: true, tokens, integration: matched };
}

/**
 * Platform bearer token when org has a bound REA agency id.
 */
export async function ensureValidOrgReaAccessToken(
  organisationId: string,
): Promise<
  | { ok: true; accessToken: string; tokens: OrgReaConnectorTokens }
  | { ok: false; message: string }
> {
  if (!reaCredentialsConfigured()) {
    return {
      ok: false,
      message:
        "REA OAuth not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET on Vercel",
    };
  }

  const tokens = await getOrgReaConnectorTokens(organisationId);
  if (!tokens?.reaAgencyId?.trim()) {
    return {
      ok: false,
      message:
        "REA agency not activated for this organisation. Bind agency id under Settings → Connectors after Ignite activation.",
    };
  }

  const token = await fetchReaClientCredentialsToken();
  if (!token.ok) {
    await saveOrgReaConnectorTokens(organisationId, {
      ...tokens,
      lastError: token.message,
    });
    return { ok: false, message: token.message };
  }

  return { ok: true, accessToken: token.token.access_token, tokens };
}

export async function probeOrgReaConnection(
  organisationId: string,
): Promise<ReaOrgProbeResult> {
  const tokens = await getOrgReaConnectorTokens(organisationId);
  if (!tokens?.reaAgencyId?.trim()) {
    return {
      ok: false,
      connected: false,
      message:
        "REA agency not activated for this organisation — bind agency id after Ignite / Change of Uploader",
    };
  }

  const platform = await probeReaConnection();
  if (!platform.tokenOk) {
    return {
      ok: false,
      connected: true,
      reaAgencyId: tokens.reaAgencyId,
      message: `Agency ${tokens.reaAgencyId} bound · platform token failed: ${platform.message}`,
    };
  }

  const matched = platform.integrations?.find(
    (i) => i.ownerId.toLowerCase() === tokens.reaAgencyId!.toLowerCase(),
  );
  const scopes = matched?.scopes ?? [];
  const listingWriteGranted = scopes.includes("listing:listings:write");

  if (platform.apiOk && platform.integrations && !matched) {
    return {
      ok: false,
      connected: true,
      reaAgencyId: tokens.reaAgencyId,
      scopes,
      listingWriteGranted: false,
      message: `Agency ${tokens.reaAgencyId} bound locally but not present in /me/v1/integrations — re-activate after Ignite grant`,
    };
  }

  if (matched && !listingWriteGranted) {
    return {
      ok: false,
      connected: true,
      reaAgencyId: tokens.reaAgencyId,
      scopes,
      listingWriteGranted: false,
      message: `Agency ${tokens.reaAgencyId} integrated but missing listing:listings:write — ask REA to grant Listing Upload`,
    };
  }

  return {
    ok: true,
    connected: true,
    reaAgencyId: tokens.reaAgencyId,
    scopes: matched?.scopes ?? (tokens.scope ? tokens.scope.split(",") : []),
    listingWriteGranted: matched ? listingWriteGranted : undefined,
    message: matched
      ? `REA agency ${tokens.reaAgencyId} active · listing write ${listingWriteGranted ? "granted" : "unknown"}`
      : `REA agency ${tokens.reaAgencyId} bound · integrations list unavailable — publish may still work if upload scope is granted`,
  };
}
