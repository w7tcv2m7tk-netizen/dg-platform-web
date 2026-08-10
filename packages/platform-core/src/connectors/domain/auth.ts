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
};

export async function getOrgDomainConnectorTokens(
  organisationId: string,
): Promise<OrgDomainConnectorTokens | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as { connectors?: { domain?: OrgDomainConnectorTokens } } | null)
    ?.connectors?.domain;
  return settings ?? null;
}

export async function saveOrgDomainConnectorTokens(
  organisationId: string,
  tokens: OrgDomainConnectorTokens,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const prev = (org?.settings as Record<string, unknown> | null) ?? {};
  const connectors = (prev.connectors as Record<string, unknown> | undefined) ?? {};
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...prev,
        connectors: {
          ...connectors,
          domain: tokens,
        },
      } as InputJsonValue,
    },
  });
}
