import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

/**
 * realestate.com.au (REA Group) OAuth + API client scaffold.
 *
 * Unlike Domain (public developer.domain.com.au + Listings Management),
 * REA partner / Listing Hub API access is grant-gated. Until credentials and
 * endpoint docs are confirmed, this module is **status + storage only** —
 * no live authorize/token/API calls.
 *
 * Planned platform env (Vercel):
 *   REA_CLIENT_ID
 *   REA_CLIENT_SECRET
 *   REA_REDIRECT_URI (default https://app.digitalgate.com.au/api/connectors/rea/callback)
 *   REA_API_BASE_URL (partner API host — TBD after access grant)
 *   REA_AUTH_AUTHORIZE_URL / REA_AUTH_TOKEN_URL (optional overrides when docs land)
 *   REA_OAUTH_SCOPES (optional)
 *
 * @see docs/connectors/REA.md
 * @see docs/foundations/PROPERTY-SYNDICATION.md
 */

export const REA_CONNECTOR_ID = "rea" as const;

/** Default redirect — wire callback route when OAuth endpoints are known. */
export const REA_DEFAULT_REDIRECT_URI =
  "https://app.digitalgate.com.au/api/connectors/rea/callback";

/**
 * Placeholders until REA documents authorize/token URLs.
 * Empty string means “not published in-repo — set via env when granted”.
 */
export const REA_AUTH_AUTHORIZE_URL_PLACEHOLDER = "";
export const REA_AUTH_TOKEN_URL_PLACEHOLDER = "";

export type ReaOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBaseUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
};

export type ReaTokenBundle = {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
  obtainedAt: string;
  expiresAt: string;
};

export type OrgReaConnectorTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scope?: string;
  connectedAt?: string;
  label?: string;
  /** Partner agency / office id when REA documents the field */
  reaAgencyId?: string;
  lastError?: string;
};

export type ReaPlatformProbeResult = {
  ok: boolean;
  configured: boolean;
  oauthEndpointsReady: boolean;
  message: string;
};

export type ReaOrgProbeResult = {
  ok: boolean;
  connected: boolean;
  message: string;
  reaAgencyId?: string | null;
};

export function getReaOAuthConfig():
  | { ok: true; config: ReaOAuthConfig }
  | { ok: false; message: string } {
  const clientId = process.env.REA_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.REA_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.REA_REDIRECT_URI?.trim() || REA_DEFAULT_REDIRECT_URI;
  const apiBaseUrl = process.env.REA_API_BASE_URL?.trim() || "";
  const authorizeUrl =
    process.env.REA_AUTH_AUTHORIZE_URL?.trim() || REA_AUTH_AUTHORIZE_URL_PLACEHOLDER;
  const tokenUrl =
    process.env.REA_AUTH_TOKEN_URL?.trim() || REA_AUTH_TOKEN_URL_PLACEHOLDER;
  const scopes = process.env.REA_OAUTH_SCOPES?.trim() || "";

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "REA_CLIENT_ID / REA_CLIENT_SECRET not set — partner access required before Connect works",
    };
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      redirectUri,
      apiBaseUrl,
      authorizeUrl,
      tokenUrl,
      scopes,
    },
  };
}

export function reaCredentialsConfigured(): boolean {
  return getReaOAuthConfig().ok;
}

/** True only when partner docs have supplied usable authorize + token URLs. */
export function reaOAuthEndpointsConfigured(): boolean {
  const cfg = getReaOAuthConfig();
  if (!cfg.ok) return false;
  return Boolean(cfg.config.authorizeUrl && cfg.config.tokenUrl);
}

/**
 * Build authorize URL when endpoints are known. Until then, fail closed.
 */
export function buildReaAuthorizeUrl(_opts: {
  state: string;
  nonce?: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  const cfg = getReaOAuthConfig();
  if (!cfg.ok) {
    return { ok: false, message: cfg.message };
  }
  if (!cfg.config.authorizeUrl) {
    return {
      ok: false,
      message:
        "REA OAuth authorize URL unknown — set REA_AUTH_AUTHORIZE_URL after partner docs are granted (scaffold only)",
    };
  }
  // Real query params (client_id, redirect_uri, scope, state) land with API docs.
  return {
    ok: false,
    message:
      "REA OAuth authorize flow not implemented yet — endpoints reserved; do not treat Connect as live",
  };
}

export async function probeReaConnection(): Promise<ReaPlatformProbeResult> {
  const cfg = getReaOAuthConfig();
  if (!cfg.ok) {
    return {
      ok: false,
      configured: false,
      oauthEndpointsReady: false,
      message: cfg.message,
    };
  }
  const endpointsReady = Boolean(cfg.config.authorizeUrl && cfg.config.tokenUrl);
  if (!endpointsReady) {
    return {
      ok: false,
      configured: true,
      oauthEndpointsReady: false,
      message:
        "REA client id/secret present but authorize/token URLs not set — awaiting partner API documentation",
    };
  }
  return {
    ok: false,
    configured: true,
    oauthEndpointsReady: true,
    message:
      "REA OAuth endpoints configured in env but live token/API probe is not implemented — fail closed until partner smoke passes",
  };
}

export async function probeOrgReaConnection(
  organisationId: string,
): Promise<ReaOrgProbeResult> {
  const tokens = await getOrgReaConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return {
      ok: false,
      connected: false,
      message: "REA account not connected for this organisation",
    };
  }
  // Tokens may exist after a future OAuth callback; do not claim API health yet.
  return {
    ok: false,
    connected: true,
    reaAgencyId: tokens.reaAgencyId ?? null,
    message:
      "Org has stored REA tokens but live API probe is not implemented — reconnect after partner access smoke",
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
 * Return a usable org access token when OAuth is live.
 * Scaffold always fails closed — no fake token refresh.
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
        "REA OAuth not configured — set REA_CLIENT_ID + REA_CLIENT_SECRET after partner access",
    };
  }
  if (!reaOAuthEndpointsConfigured()) {
    return {
      ok: false,
      message:
        "REA OAuth endpoints not configured — set REA_AUTH_AUTHORIZE_URL + REA_AUTH_TOKEN_URL from partner docs",
    };
  }

  const tokens = await getOrgReaConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return { ok: false, message: "REA account not connected for this organisation" };
  }

  return {
    ok: false,
    message:
      "REA token refresh / API client not implemented yet — fail closed until partner smoke is green",
  };
}
