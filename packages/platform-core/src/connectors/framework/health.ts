/**
 * Connector Engine health summaries for Settings / Command Centre.
 */

import { llmConfigured } from "../../ai/llm";
import { isCloudflareConfigured } from "../../infrastructure/providers/cloudflare/config";
import type { ConnectorConnectionStatus, ConnectorHealth, ConnectorManifest } from "./types";
import { listConnectorManifests } from "./types";
import { getOrgConnectorSettings } from "./store";

/** Platform env keys — no per-org OAuth; catalog shows "Platform shared" when configured. */
const PLATFORM_SHARED_CONNECTOR_IDS = new Set([
  "stripe",
  "vercel-ai-gateway",
  "openai",
  "cloudflare",
  "elevenlabs",
  "abr",
  "dreamscape",
]);

export type ConnectorCatalogItem = {
  manifest: ConnectorManifest;
  platformConfigured: boolean;
  /** platform = shared Vercel credentials; organisation = per-tenant OAuth / API key */
  connectionScope: "platform" | "organisation";
  organisation: {
    status: ConnectorConnectionStatus;
    connectedAt?: string | null;
    expiresAt?: string | null;
    label?: string | null;
    lastError?: string | null;
    lastSyncAt?: string | null;
  };
};

function envTrim(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function isConnectorPlatformConfigured(connectorId: string): boolean {
  switch (connectorId) {
    case "domain":
      return Boolean(envTrim("DOMAIN_CLIENT_ID") && envTrim("DOMAIN_CLIENT_SECRET"));
    case "google-gbp":
      return Boolean(envTrim("GOOGLE_CLIENT_ID") && envTrim("GOOGLE_CLIENT_SECRET"));
    case "google-gmail":
      return Boolean(envTrim("GOOGLE_CLIENT_ID") && envTrim("GOOGLE_CLIENT_SECRET"));
    case "linkedin":
      return Boolean(envTrim("LINKEDIN_CLIENT_ID") && envTrim("LINKEDIN_CLIENT_SECRET"));
    case "stripe":
      return Boolean(envTrim("STRIPE_SECRET_KEY"));
    case "wordpress":
      return Boolean(envTrim("DG_WP_CONNECTOR_API_KEY") || envTrim("DG_API_KEY"));
    case "abr":
      return Boolean(
        envTrim("ABN_LOOKUP_GUID") ||
          envTrim("ABR_GUID") ||
          envTrim("ABR_AUTHENTICATION_GUID"),
      );
    case "asic":
      // DSP application + test credentials required — never report configured from env alone yet
      return false;
    case "rea":
      return Boolean(envTrim("REA_CLIENT_ID") && envTrim("REA_CLIENT_SECRET"));
    case "corelogic":
      return Boolean(envTrim("CORELOGIC_CLIENT_ID") && envTrim("CORELOGIC_CLIENT_SECRET"));
    case "dreamscape":
      return Boolean(envTrim("DREAMSCAPE_API_KEY"));
    case "vercel-ai-gateway":
      return Boolean(envTrim("AI_GATEWAY_API_KEY") || envTrim("VERCEL_OIDC_TOKEN"));
    case "openai":
      return Boolean(envTrim("OPENAI_API_KEY"));
    case "elevenlabs":
      return Boolean(envTrim("ELEVENLABS_API_KEY"));
    case "cloudflare":
      return isCloudflareConfigured();
    case "twilio":
      return Boolean(envTrim("TWILIO_ACCOUNT_SID") && envTrim("TWILIO_AUTH_TOKEN"));
    case "meta":
      return Boolean(envTrim("META_APP_ID") && envTrim("META_APP_SECRET"));
    case "xero":
      return Boolean(envTrim("XERO_CLIENT_ID") && envTrim("XERO_CLIENT_SECRET"));
    case "shopify":
      return Boolean(envTrim("SHOPIFY_CLIENT_ID") && envTrim("SHOPIFY_CLIENT_SECRET"));
    default:
      return false;
  }
}

function connectionScopeFor(connectorId: string): "platform" | "organisation" {
  return PLATFORM_SHARED_CONNECTOR_IDS.has(connectorId) ? "platform" : "organisation";
}

function oauthOrgStatusFromBlob(
  blob: Record<string, unknown>,
): ConnectorCatalogItem["organisation"] {
  const accessToken = typeof blob.accessToken === "string" ? blob.accessToken : "";
  const refreshToken = typeof blob.refreshToken === "string" ? blob.refreshToken : "";
  const connected = Boolean(accessToken || refreshToken);
  const health =
    blob.health && typeof blob.health === "object"
      ? (blob.health as {
          status?: ConnectorConnectionStatus;
          lastSyncAt?: string | null;
          lastError?: string | null;
        })
      : null;
  const expiresAt = typeof blob.expiresAt === "string" ? blob.expiresAt : null;
  const lastError =
    (typeof health?.lastError === "string" ? health.lastError : null) ||
    (typeof blob.lastError === "string" ? blob.lastError : null);

  let status: ConnectorConnectionStatus = connected ? "connected" : "disconnected";
  if (health?.status) {
    status = health.status;
  } else if (connected && lastError) {
    status = "degraded";
  } else if (connected && expiresAt) {
    const ms = Date.parse(expiresAt);
    if (Number.isFinite(ms) && ms < Date.now()) {
      status = refreshToken ? "degraded" : "error";
    }
  }

  return {
    status,
    connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : null,
    expiresAt,
    label: typeof blob.label === "string" ? blob.label : null,
    lastError,
    lastSyncAt: typeof health?.lastSyncAt === "string" ? health.lastSyncAt : null,
  };
}

function statusFromBlob(
  blob: Record<string, unknown> | null,
  connectorId: string,
): ConnectorCatalogItem["organisation"] {
  if (!blob) {
    if (connectorId === "rea" && isConnectorPlatformConfigured("rea")) {
      return { status: "pending_auth" };
    }
    return { status: "disconnected" };
  }

  if (connectorId === "wordpress") {
    const hasKey = Boolean(
      (typeof blob.apiKey === "string" && blob.apiKey.trim()) ||
        (typeof blob.encryptedApiKey === "string" && blob.encryptedApiKey.trim()),
    );
    return {
      status: hasKey ? "connected" : "disconnected",
      label: typeof blob.label === "string" ? blob.label : null,
      connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : null,
    };
  }

  if (connectorId === "rea") {
    const agencyId = typeof blob.reaAgencyId === "string" ? blob.reaAgencyId.trim() : "";
    if (!agencyId) {
      return isConnectorPlatformConfigured("rea")
        ? { status: "pending_auth" }
        : { status: "disconnected" };
    }
    const lastError = typeof blob.lastError === "string" ? blob.lastError : null;
    return {
      status: lastError ? "degraded" : "connected",
      connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : null,
      label: typeof blob.label === "string" ? blob.label : null,
      lastError,
    };
  }

  if (
    connectorId === "google-gbp" ||
    connectorId === "google-gmail" ||
    connectorId === "linkedin" ||
    connectorId === "domain"
  ) {
    return oauthOrgStatusFromBlob(blob);
  }

  const accessToken = typeof blob.accessToken === "string" ? blob.accessToken : "";
  const refreshToken = typeof blob.refreshToken === "string" ? blob.refreshToken : "";
  const connected = Boolean(accessToken || refreshToken);
  const expiresAt = typeof blob.expiresAt === "string" ? blob.expiresAt : null;
  let status: ConnectorConnectionStatus = connected ? "connected" : "disconnected";
  if (connected && expiresAt) {
    const ms = Date.parse(expiresAt);
    if (Number.isFinite(ms) && ms < Date.now()) {
      status = refreshToken ? "degraded" : "error";
    }
  }

  return {
    status,
    connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : null,
    expiresAt,
    label: typeof blob.label === "string" ? blob.label : null,
    lastError: typeof blob.lastError === "string" ? blob.lastError : null,
  };
}

function organisationForCatalog(
  manifest: ConnectorManifest,
  blob: Record<string, unknown> | null,
): ConnectorCatalogItem["organisation"] {
  const scope = connectionScopeFor(manifest.id);
  const platformReady = isConnectorPlatformConfigured(manifest.id);

  if (scope === "platform") {
    if (!platformReady) {
      return { status: "disconnected" };
    }
    if (
      (manifest.id === "openai" || manifest.id === "vercel-ai-gateway") &&
      !llmConfigured()
    ) {
      return { status: "disconnected" };
    }
    return { status: "connected", label: "Platform shared" };
  }

  return statusFromBlob(blob, manifest.id);
}

/** Catalog + coarse org status for Settings Connectors page. */
export async function listConnectorCatalogForOrg(
  organisationId: string,
): Promise<ConnectorCatalogItem[]> {
  const manifests = listConnectorManifests();
  const items: ConnectorCatalogItem[] = [];

  for (const manifest of manifests) {
    const blob = await getOrgConnectorSettings(organisationId, manifest.id);
    items.push({
      manifest,
      platformConfigured: isConnectorPlatformConfigured(manifest.id),
      connectionScope: connectionScopeFor(manifest.id),
      organisation: organisationForCatalog(manifest, blob),
    });
  }

  return items;
}

export function toConnectorHealth(
  organisationId: string,
  item: ConnectorCatalogItem,
): ConnectorHealth {
  return {
    connectorId: item.manifest.id,
    organisationId,
    status: item.organisation.status,
    lastSyncAt:
      item.organisation.lastSyncAt ?? item.organisation.connectedAt ?? null,
    lastError: item.organisation.lastError ?? null,
  };
}
