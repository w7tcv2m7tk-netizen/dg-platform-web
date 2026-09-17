import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

export const META_CONNECTOR_ID = "meta";
const DEFAULT_REDIRECT = "https://app.digitalgate.com.au/api/connectors/meta/callback";
const DEFAULT_GRAPH_VERSION = "v23.0";
export const META_DEFAULT_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
].join(",");

export type MetaOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scopes: string;
  graphVersion: string;
};

export type MetaInstagramAccount = {
  id: string;
  username?: string;
  name?: string;
};

export type MetaPage = {
  id: string;
  name: string;
  category?: string;
  accessToken?: string;
  instagramBusinessAccount?: MetaInstagramAccount;
};

export type OrgMetaConnectorTokens = {
  accessToken?: string;
  expiresAt?: string;
  connectedAt?: string;
  userId?: string;
  userName?: string;
  pages?: MetaPage[];
  selectedPageIds?: string[];
  lastError?: string;
  health?: {
    status: "connected" | "degraded" | "error" | "disconnected";
    lastSyncAt?: string | null;
    lastError?: string | null;
    message?: string | null;
  };
};

export function getMetaOAuthConfig(): { ok: true; config: MetaOAuthConfig } | { ok: false; message: string } {
  const appId = process.env.META_APP_ID?.trim() || "";
  const appSecret = process.env.META_APP_SECRET?.trim() || "";
  if (!appId || !appSecret) {
    return { ok: false, message: "META_APP_ID / META_APP_SECRET not configured" };
  }
  return {
    ok: true,
    config: {
      appId,
      appSecret,
      redirectUri: process.env.META_REDIRECT_URI?.trim() || DEFAULT_REDIRECT,
      scopes: process.env.META_OAUTH_SCOPES?.trim() || META_DEFAULT_OAUTH_SCOPES,
      graphVersion: process.env.META_GRAPH_VERSION?.trim() || DEFAULT_GRAPH_VERSION,
    },
  };
}

export function metaCredentialsConfigured(): boolean {
  return getMetaOAuthConfig().ok;
}

export function buildMetaAuthorizeUrl(args: { state: string; scopes?: string }) {
  const cfg = getMetaOAuthConfig();
  if (!cfg.ok) return cfg;
  const url = new URL(`https://www.facebook.com/${cfg.config.graphVersion}/dialog/oauth`);
  url.searchParams.set("client_id", cfg.config.appId);
  url.searchParams.set("redirect_uri", cfg.config.redirectUri);
  url.searchParams.set("state", args.state);
  url.searchParams.set("scope", args.scopes?.trim() || cfg.config.scopes);
  url.searchParams.set("response_type", "code");
  return { ok: true as const, url: url.toString() };
}

async function graphJson<T>(path: string, accessToken: string): Promise<T> {
  const cfg = getMetaOAuthConfig();
  if (!cfg.ok) throw new Error(cfg.message);
  const url = new URL(`https://graph.facebook.com/${cfg.config.graphVersion}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json() as T & { error?: { message?: string } };
  if (!res.ok || json.error) throw new Error(json.error?.message || `Meta Graph API ${res.status}`);
  return json;
}

export async function exchangeMetaCode(code: string): Promise<{ accessToken: string; expiresAt?: string }> {
  const cfg = getMetaOAuthConfig();
  if (!cfg.ok) throw new Error(cfg.message);
  const url = new URL(`https://graph.facebook.com/${cfg.config.graphVersion}/oauth/access_token`);
  url.searchParams.set("client_id", cfg.config.appId);
  url.searchParams.set("client_secret", cfg.config.appSecret);
  url.searchParams.set("redirect_uri", cfg.config.redirectUri);
  url.searchParams.set("code", code);
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!res.ok || !json.access_token) throw new Error(json.error?.message || "Meta token exchange failed");
  return {
    accessToken: json.access_token,
    expiresAt: typeof json.expires_in === "number" ? new Date(Date.now() + Math.max(0, json.expires_in - 60) * 1000).toISOString() : undefined,
  };
}

export async function discoverMetaIdentity(accessToken: string) {
  const me = await graphJson<{ id: string; name?: string }>("me?fields=id,name", accessToken);
  const pages = await graphJson<{ data?: Array<{ id: string; name: string; category?: string; access_token?: string; instagram_business_account?: { id: string; username?: string; name?: string } }> }>(
    "me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username,name}",
    accessToken,
  );
  return {
    userId: me.id,
    userName: me.name,
    pages: (pages.data || []).map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category,
      accessToken: page.access_token,
      instagramBusinessAccount: page.instagram_business_account,
    } satisfies MetaPage)),
  };
}

export async function getOrgMetaConnector(organisationId: string): Promise<OrgMetaConnectorTokens | null> {
  const raw = await getOrgConnectorSettings(organisationId, META_CONNECTOR_ID);
  if (!raw) return null;
  const rec = raw as OrgMetaConnectorTokens;
  return {
    ...rec,
    accessToken: rec.accessToken ? decryptSecret(rec.accessToken) : undefined,
    pages: rec.pages?.map((page) => ({
      ...page,
      accessToken: page.accessToken ? decryptSecret(page.accessToken) : undefined,
    })),
  };
}

export async function saveOrgMetaConnector(organisationId: string, value: OrgMetaConnectorTokens): Promise<void> {
  await saveOrgConnectorSettings(organisationId, META_CONNECTOR_ID, {
    ...value,
    accessToken: value.accessToken ? encryptSecret(value.accessToken) : undefined,
    pages: value.pages?.map((page) => ({
      ...page,
      accessToken: page.accessToken ? encryptSecret(page.accessToken) : undefined,
    })),
  });
}

export async function clearOrgMetaConnector(organisationId: string): Promise<void> {
  await clearOrgConnectorSettings(organisationId, META_CONNECTOR_ID);
}
