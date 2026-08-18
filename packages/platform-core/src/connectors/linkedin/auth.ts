/**
 * LinkedIn OAuth (platform credentials + per-org tokens).
 *
 * Env (Vercel):
 *   LINKEDIN_CLIENT_ID
 *   LINKEDIN_CLIENT_SECRET
 *   LINKEDIN_REDIRECT_URI (default https://app.digitalgate.com.au/api/connectors/linkedin/callback)
 *   LINKEDIN_OAUTH_SCOPES (optional — if Community Management is still pending, use: openid profile email)
 *   LINKEDIN_API_VERSION (optional Rest.li version, default 202411)
 *
 * Products on the LinkedIn app: Sign In with LinkedIn (OpenID Connect) + Community Management API.
 */

import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

export const LINKEDIN_CONNECTOR_ID = "linkedin";

export const LINKEDIN_AUTH_AUTHORIZE_URL =
  "https://www.linkedin.com/oauth/v2/authorization";
export const LINKEDIN_AUTH_TOKEN_URL =
  "https://www.linkedin.com/oauth/v2/accessToken";
export const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

/** OpenID + company-page read/write. Override via LINKEDIN_OAUTH_SCOPES if products are pending. */
export const LINKEDIN_DEFAULT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "w_organization_social",
  "r_organization_social",
].join(" ");

const DEFAULT_REDIRECT =
  "https://app.digitalgate.com.au/api/connectors/linkedin/callback";

export type LinkedInOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  apiVersion: string;
};

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type?: string;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  id_token?: string;
};

export type LinkedInTokenBundle = LinkedInTokenResponse & {
  obtainedAt: string;
  expiresAt: string;
  refreshExpiresAt?: string;
};

export type LinkedInMember = {
  sub?: string;
  name?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
};

export type LinkedInOrganizationAcl = {
  urn: string;
  role?: string;
  state?: string;
  name?: string;
  vanityName?: string;
};

export type OrgLinkedInConnectorTokens = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  refreshExpiresAt?: string;
  scope?: string;
  connectedAt?: string;
  label?: string;
  lastError?: string;
  member?: LinkedInMember;
  organizations?: LinkedInOrganizationAcl[];
  selectedOrganizationUrn?: string;
  health?: {
    status: "connected" | "degraded" | "error" | "disconnected";
    lastSyncAt?: string | null;
    lastError?: string | null;
    message?: string | null;
  };
};

export function getLinkedInOAuthConfig():
  | { ok: true; config: LinkedInOAuthConfig }
  | { ok: false; message: string } {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI?.trim() || DEFAULT_REDIRECT;
  const scopes =
    process.env.LINKEDIN_OAUTH_SCOPES?.trim() || LINKEDIN_DEFAULT_OAUTH_SCOPES;
  const apiVersion = process.env.LINKEDIN_API_VERSION?.trim() || "202411";

  if (!clientId || !clientSecret) {
    return {
      ok: false,
      message:
        "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not set — add them on Vercel (and .env.local)",
    };
  }

  return {
    ok: true,
    config: { clientId, clientSecret, redirectUri, scopes, apiVersion },
  };
}

export function linkedInCredentialsConfigured(): boolean {
  return getLinkedInOAuthConfig().ok;
}

function bundleToken(raw: LinkedInTokenResponse): LinkedInTokenBundle {
  const obtainedAt = new Date();
  const expiresAt = new Date(
    obtainedAt.getTime() + Math.max(0, raw.expires_in - 60) * 1000,
  );
  const refreshExpiresAt =
    typeof raw.refresh_token_expires_in === "number"
      ? new Date(
          obtainedAt.getTime() +
            Math.max(0, raw.refresh_token_expires_in - 60) * 1000,
        ).toISOString()
      : undefined;
  return {
    ...raw,
    obtainedAt: obtainedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    refreshExpiresAt,
  };
}

function oauthErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const rec = json as { error_description?: unknown; error?: unknown; message?: unknown };
    if (typeof rec.error_description === "string" && rec.error_description.trim()) {
      return rec.error_description;
    }
    if (typeof rec.message === "string" && rec.message.trim()) {
      return rec.message;
    }
    if (typeof rec.error === "string" && rec.error.trim()) {
      return rec.error;
    }
  }
  return fallback;
}

async function postToken(
  body: URLSearchParams,
): Promise<
  | { ok: true; token: LinkedInTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const res = await fetch(LINKEDIN_AUTH_TOKEN_URL, {
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
    return {
      ok: false,
      status: res.status,
      message: oauthErrorMessage(json, `LinkedIn token HTTP ${res.status}`),
      raw: json,
    };
  }
  const token = json as LinkedInTokenResponse;
  if (!token?.access_token) {
    return {
      ok: false,
      status: res.status,
      message: "LinkedIn token response missing access_token",
      raw: json,
    };
  }
  return { ok: true, token: bundleToken(token) };
}

export function buildLinkedInAuthorizeUrl(input: {
  state: string;
  scopes?: string;
}): { ok: true; url: string } | { ok: false; message: string } {
  const cfg = getLinkedInOAuthConfig();
  if (!cfg.ok) return { ok: false, message: cfg.message };
  const scope = input.scopes?.trim() || cfg.config.scopes;
  const url = new URL(LINKEDIN_AUTH_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.config.clientId);
  url.searchParams.set("redirect_uri", cfg.config.redirectUri);
  url.searchParams.set("state", input.state);
  return {
    ok: true,
    url: `${url.toString()}&scope=${encodeURIComponent(scope)}`,
  };
}

export async function exchangeLinkedInAuthorizationCode(input: {
  code: string;
}): Promise<
  | { ok: true; token: LinkedInTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getLinkedInOAuthConfig();
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

export async function refreshLinkedInAccessToken(input: {
  refreshToken: string;
}): Promise<
  | { ok: true; token: LinkedInTokenBundle }
  | { ok: false; status: number; message: string; raw?: unknown }
> {
  const cfg = getLinkedInOAuthConfig();
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

function linkedInHeaders(accessToken: string, restli = false): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
  if (restli) {
    const cfg = getLinkedInOAuthConfig();
    headers["X-Restli-Protocol-Version"] = "2.0.0";
    headers["Linkedin-Version"] = cfg.ok ? cfg.config.apiVersion : "202411";
  }
  return headers;
}

export async function linkedInApiGet(
  url: string,
  accessToken: string,
  restli = false,
): Promise<
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; message: string }
> {
  const res = await fetch(url, { headers: linkedInHeaders(accessToken, restli) });
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
      message: oauthErrorMessage(data, `LinkedIn API HTTP ${res.status}`),
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

export async function getOrgLinkedInConnectorTokens(
  organisationId: string,
): Promise<OrgLinkedInConnectorTokens | null> {
  const blob = await getOrgConnectorSettings(organisationId, LINKEDIN_CONNECTOR_ID);
  if (!blob) return null;
  return {
    accessToken: decryptTokenField(
      typeof blob.accessToken === "string" ? blob.accessToken : undefined,
    ),
    refreshToken: decryptTokenField(
      typeof blob.refreshToken === "string" ? blob.refreshToken : undefined,
    ),
    expiresAt: typeof blob.expiresAt === "string" ? blob.expiresAt : undefined,
    refreshExpiresAt:
      typeof blob.refreshExpiresAt === "string" ? blob.refreshExpiresAt : undefined,
    scope: typeof blob.scope === "string" ? blob.scope : undefined,
    connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : undefined,
    label: typeof blob.label === "string" ? blob.label : undefined,
    lastError: typeof blob.lastError === "string" ? blob.lastError : undefined,
    member:
      blob.member && typeof blob.member === "object"
        ? (blob.member as LinkedInMember)
        : undefined,
    organizations: Array.isArray(blob.organizations)
      ? (blob.organizations as LinkedInOrganizationAcl[])
      : undefined,
    selectedOrganizationUrn:
      typeof blob.selectedOrganizationUrn === "string"
        ? blob.selectedOrganizationUrn
        : undefined,
    health:
      blob.health && typeof blob.health === "object"
        ? (blob.health as OrgLinkedInConnectorTokens["health"])
        : undefined,
  };
}

export async function saveOrgLinkedInConnectorTokens(
  organisationId: string,
  tokens: OrgLinkedInConnectorTokens,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, LINKEDIN_CONNECTOR_ID, {
    accessToken: encryptTokenField(tokens.accessToken),
    refreshToken: encryptTokenField(tokens.refreshToken),
    expiresAt: tokens.expiresAt ?? null,
    refreshExpiresAt: tokens.refreshExpiresAt ?? null,
    scope: tokens.scope ?? null,
    connectedAt: tokens.connectedAt ?? new Date().toISOString(),
    label: tokens.label ?? null,
    lastError: tokens.lastError ?? null,
    member: tokens.member ?? null,
    organizations: tokens.organizations ?? null,
    selectedOrganizationUrn: tokens.selectedOrganizationUrn ?? null,
    health: tokens.health ?? null,
  });
}

export async function clearOrgLinkedInConnectorTokens(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, LINKEDIN_CONNECTOR_ID);
}

/** Refresh if expired / near expiry; returns usable access token. */
export async function ensureValidOrgLinkedInAccessToken(
  organisationId: string,
): Promise<
  | { ok: true; accessToken: string; tokens: OrgLinkedInConnectorTokens }
  | { ok: false; message: string }
> {
  const tokens = await getOrgLinkedInConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) {
    return { ok: false, message: "LinkedIn is not connected for this organisation" };
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
    return { ok: false, message: "LinkedIn access token expired — reconnect the account" };
  }

  const refreshed = await refreshLinkedInAccessToken({
    refreshToken: tokens.refreshToken,
  });
  if (!refreshed.ok) {
    await saveOrgLinkedInConnectorTokens(organisationId, {
      ...tokens,
      lastError: refreshed.message,
      health: {
        status: "error",
        lastError: refreshed.message,
        lastSyncAt: tokens.health?.lastSyncAt ?? null,
      },
    });
    return { ok: false, message: refreshed.message };
  }

  const next: OrgLinkedInConnectorTokens = {
    ...tokens,
    accessToken: refreshed.token.access_token,
    refreshToken: refreshed.token.refresh_token || tokens.refreshToken,
    expiresAt: refreshed.token.expiresAt,
    refreshExpiresAt: refreshed.token.refreshExpiresAt || tokens.refreshExpiresAt,
    scope: refreshed.token.scope || tokens.scope,
    lastError: undefined,
  };
  await saveOrgLinkedInConnectorTokens(organisationId, next);
  return { ok: true, accessToken: next.accessToken!, tokens: next };
}

function parseMember(data: unknown): LinkedInMember | undefined {
  if (!data || typeof data !== "object") return undefined;
  const rec = data as Record<string, unknown>;
  const sub = typeof rec.sub === "string" ? rec.sub : undefined;
  const name = typeof rec.name === "string" ? rec.name : undefined;
  const email = typeof rec.email === "string" ? rec.email : undefined;
  const givenName =
    typeof rec.given_name === "string" ? rec.given_name : undefined;
  const familyName =
    typeof rec.family_name === "string" ? rec.family_name : undefined;
  if (!sub && !name && !email) return undefined;
  return { sub, name, email, givenName, familyName };
}

function organizationIdFromUrn(urn: string): string | null {
  const match = urn.match(/urn:li:organization(?:Brand)?:(\d+)/);
  return match?.[1] ?? null;
}

function parseOrganizationAcls(data: unknown): LinkedInOrganizationAcl[] {
  if (!data || typeof data !== "object") return [];
  const elements = (data as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return [];
  const out: LinkedInOrganizationAcl[] = [];
  for (const el of elements) {
    if (!el || typeof el !== "object") continue;
    const rec = el as Record<string, unknown>;
    const urn =
      typeof rec.organization === "string"
        ? rec.organization
        : typeof rec.organizationalTarget === "string"
          ? rec.organizationalTarget
          : "";
    if (!urn) continue;
    out.push({
      urn,
      role: typeof rec.role === "string" ? rec.role : undefined,
      state: typeof rec.state === "string" ? rec.state : undefined,
    });
  }
  return out;
}

async function enrichOrganizationNames(
  accessToken: string,
  orgs: LinkedInOrganizationAcl[],
): Promise<LinkedInOrganizationAcl[]> {
  const limited = orgs.slice(0, 8);
  const enriched: LinkedInOrganizationAcl[] = [];
  for (const org of limited) {
    const id = organizationIdFromUrn(org.urn);
    if (!id) {
      enriched.push(org);
      continue;
    }
    const rest = await linkedInApiGet(
      `https://api.linkedin.com/rest/organizations/${id}`,
      accessToken,
      true,
    );
    const probe = rest.ok
      ? rest
      : await linkedInApiGet(
          `https://api.linkedin.com/v2/organizations/${id}`,
          accessToken,
        );
    if (!probe.ok || !probe.data || typeof probe.data !== "object") {
      enriched.push(org);
      continue;
    }
    const rec = probe.data as Record<string, unknown>;
    const localized =
      rec.localizedName && typeof rec.localizedName === "object"
        ? (rec.localizedName as Record<string, unknown>)
        : null;
    const name =
      typeof rec.localizedName === "string"
        ? rec.localizedName
        : typeof localized?.en_US === "string"
          ? localized.en_US
          : typeof rec.vanityName === "string"
            ? rec.vanityName
            : org.name;
    enriched.push({
      ...org,
      name,
      vanityName: typeof rec.vanityName === "string" ? rec.vanityName : org.vanityName,
    });
  }
  return [...enriched, ...orgs.slice(enriched.length)];
}

function pickSelectedOrganization(
  orgs: LinkedInOrganizationAcl[],
): string | undefined {
  const approvedAdmin = orgs.find(
    (o) =>
      (o.role === "ADMINISTRATOR" || o.role === "DIRECT_SPONSORED_CONTENT_POSTER") &&
      (o.state === "APPROVED" || !o.state),
  );
  return approvedAdmin?.urn ?? orgs[0]?.urn;
}

async function loadOrganizationAcls(
  accessToken: string,
): Promise<
  | { ok: true; organizations: LinkedInOrganizationAcl[] }
  | { ok: false; message: string }
> {
  const rest = await linkedInApiGet(
    "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee",
    accessToken,
    true,
  );
  const probe = rest.ok
    ? rest
    : await linkedInApiGet(
        "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee",
        accessToken,
      );
  if (!probe.ok) {
    return { ok: false, message: probe.message };
  }
  const organizations = parseOrganizationAcls(probe.data);
  if (organizations.length === 0) {
    return { ok: true, organizations: [] };
  }
  return {
    ok: true,
    organizations: await enrichOrganizationNames(accessToken, organizations),
  };
}

/** OpenID + company ACL probe. Identity can succeed even if Community Management is pending. */
export async function probeOrgLinkedInConnection(organisationId: string): Promise<{
  ok: boolean;
  connected: boolean;
  apiOk?: boolean;
  expiresAt?: string;
  message: string;
  member?: LinkedInMember;
  organizations?: LinkedInOrganizationAcl[];
  selectedOrganizationUrn?: string;
}> {
  const ensured = await ensureValidOrgLinkedInAccessToken(organisationId);
  if (!ensured.ok) {
    return { ok: false, connected: false, message: ensured.message };
  }

  const userinfo = await linkedInApiGet(LINKEDIN_USERINFO_URL, ensured.accessToken);
  if (!userinfo.ok) {
    return {
      ok: false,
      connected: true,
      apiOk: false,
      expiresAt: ensured.tokens.expiresAt,
      message: `Token stored · identity probe: ${userinfo.message}`,
    };
  }

  const member = parseMember(userinfo.data);
  const acls = await loadOrganizationAcls(ensured.accessToken);
  const organizations = acls.ok ? acls.organizations : [];
  const selectedOrganizationUrn =
    ensured.tokens.selectedOrganizationUrn &&
    organizations.some((o) => o.urn === ensured.tokens.selectedOrganizationUrn)
      ? ensured.tokens.selectedOrganizationUrn
      : pickSelectedOrganization(organizations);

  const label =
    organizations.find((o) => o.urn === selectedOrganizationUrn)?.name ||
    member?.name ||
    member?.email ||
    ensured.tokens.label;

  const orgNote = !acls.ok
    ? `Identity OK · company pages unavailable (${acls.message}). Community Management API may still be pending.`
    : organizations.length === 0
      ? "Identity OK · no company pages on this LinkedIn user. Sign in as a Page admin."
      : `LinkedIn connected · ${organizations.length} company page(s)`;

  const next: OrgLinkedInConnectorTokens = {
    ...ensured.tokens,
    label,
    member,
    organizations,
    selectedOrganizationUrn,
    lastError: acls.ok ? undefined : acls.message,
    health: {
      status: acls.ok && organizations.length > 0 ? "connected" : "degraded",
      lastSyncAt: new Date().toISOString(),
      lastError: acls.ok ? null : acls.message,
      message: orgNote,
    },
  };
  await saveOrgLinkedInConnectorTokens(organisationId, next);

  return {
    ok: acls.ok && organizations.length > 0,
    connected: true,
    apiOk: true,
    expiresAt: ensured.tokens.expiresAt,
    message: orgNote,
    member,
    organizations,
    selectedOrganizationUrn,
  };
}
