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
  "twilio",
  "telnyx",
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
    case "microsoft-365":
      return Boolean(envTrim("MICROSOFT_CLIENT_ID") && envTrim("MICROSOFT_CLIENT_SECRET"));
    case "apple-icloud":
      // Org-owned app-specific password — always available as a connect path
      return true;
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
    case "telnyx":
      return Boolean(envTrim("TELNYX_API_KEY"));
    case "meta":
      return Boolean(envTrim("META_APP_ID") && envTrim("META_APP_SECRET"));
    case "google-ads":
    case "youtube":
      return Boolean(envTrim("GOOGLE_CLIENT_ID") && envTrim("GOOGLE_CLIENT_SECRET"));
    case "microsoft-ads":
      return Boolean(
        envTrim("MICROSOFT_ADS_CLIENT_ID") &&
          envTrim("MICROSOFT_ADS_CLIENT_SECRET") &&
          envTrim("MICROSOFT_ADS_DEVELOPER_TOKEN"),
      );
    case "tiktok-ads":
      return Boolean(envTrim("TIKTOK_ADS_APP_ID") && envTrim("TIKTOK_ADS_APP_SECRET"));
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


function scopeSetFromBlob(blob: Record<string, unknown>): Set<string> {
  const scope = typeof blob.scope === "string" ? blob.scope : "";
  return new Set(scope.split(/[\s,]+/).filter(Boolean));
}

function capabilityStatusFromSharedGoogleBlob(
  blob: Record<string, unknown>,
  connectorId: "google-ads" | "youtube",
): ConnectorCatalogItem["organisation"] {
  const base = oauthOrgStatusFromBlob(blob);
  if (base.status !== "connected") return base;

  const scopes = scopeSetFromBlob(blob);
  const required =
    connectorId === "google-ads"
      ? ["https://www.googleapis.com/auth/adwords"]
      : [
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/yt-analytics.readonly",
        ];
  const missing = required.filter((scope) => !scopes.has(scope));
  if (!missing.length) return base;

  return {
    ...base,
    status: "degraded",
    lastError:
      connectorId === "google-ads"
        ? "Google is connected, but Google Ads access has not been authorised for this organisation."
        : "Google is connected, but YouTube read/analytics access has not been authorised for this organisation.",
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

  if (connectorId === "google-ads" || connectorId === "youtube") {
    return capabilityStatusFromSharedGoogleBlob(blob, connectorId);
  }

  if (
    connectorId === "google-gbp" ||
    connectorId === "google-gmail" ||
    connectorId === "microsoft-365" ||
    connectorId === "microsoft-ads" ||
    connectorId === "tiktok-ads" ||
    connectorId === "domain"
  ) {
    return oauthOrgStatusFromBlob(blob);
  }

  if (connectorId === "meta") {
    const base = oauthOrgStatusFromBlob(blob);
    if (base.status !== "connected") return base;
    const pages = Array.isArray(blob.pages) ? blob.pages : [];
    const selectedPageIds = Array.isArray(blob.selectedPageIds)
      ? blob.selectedPageIds.filter((value): value is string => typeof value === "string")
      : [];
    if (pages.length > 0 && selectedPageIds.length === 0) {
      return {
        ...base,
        status: "degraded",
        lastError:
          "Meta is authorised, but no Facebook Page has been assigned to this organisation yet.",
      };
    }
    return base;
  }

  if (connectorId === "linkedin") {
    const base = oauthOrgStatusFromBlob(blob);
    if (base.status !== "connected") return base;
    const organisations = Array.isArray(blob.organizations) ? blob.organizations : [];
    const selectedOrganizationUrn =
      typeof blob.selectedOrganizationUrn === "string"
        ? blob.selectedOrganizationUrn.trim()
        : "";
    if (organisations.length > 0 && !selectedOrganizationUrn) {
      return {
        ...base,
        status: "degraded",
        lastError:
          "LinkedIn is authorised, but no company Page has been assigned to this organisation yet.",
      };
    }
    return base;
  }

  if (connectorId === "apple-icloud") {
    const email = typeof blob.email === "string" ? blob.email : "";
    const appPassword =
      typeof blob.appPassword === "string" ? blob.appPassword : "";
    const connected = Boolean(email && appPassword);
    const health =
      blob.health && typeof blob.health === "object"
        ? (blob.health as {
            status?: ConnectorConnectionStatus;
            lastSyncAt?: string | null;
            lastError?: string | null;
          })
        : null;
    const lastError =
      (typeof health?.lastError === "string" ? health.lastError : null) ||
      (typeof blob.lastError === "string" ? blob.lastError : null);
    let status: ConnectorConnectionStatus = connected ? "connected" : "disconnected";
    if (health?.status) status = health.status;
    else if (connected && lastError) status = "degraded";
    return {
      status,
      connectedAt: typeof blob.connectedAt === "string" ? blob.connectedAt : null,
      expiresAt: null,
      label: typeof blob.label === "string" ? blob.label : email || null,
      lastError,
      lastSyncAt: typeof health?.lastSyncAt === "string" ? health.lastSyncAt : null,
    };
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

  const organisation = statusFromBlob(blob, manifest.id);
  if (
    !platformReady &&
    (organisation.status === "connected" || organisation.status === "degraded")
  ) {
    return {
      ...organisation,
      status: "degraded",
      lastError:
        organisation.lastError ??
        `${manifest.name} platform credentials or required provider configuration are incomplete.`,
    };
  }
  return organisation;
}

/** Catalog + coarse org status for Settings Connectors page. */
export async function listConnectorCatalogForOrg(
  organisationId: string,
): Promise<ConnectorCatalogItem[]> {
  const manifests = listConnectorManifests();
  const items: ConnectorCatalogItem[] = [];

  for (const manifest of manifests) {
    const settingsId = manifest.id === "google-ads" || manifest.id === "youtube" ? "google-gbp" : manifest.id;
    const blob = await getOrgConnectorSettings(organisationId, settingsId);
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
