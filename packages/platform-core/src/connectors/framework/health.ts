/**
 * Connector Engine health summaries for Settings / Command Centre.
 */

import type { ConnectorConnectionStatus, ConnectorHealth, ConnectorManifest } from "./types";
import { listConnectorManifests } from "./types";
import { getOrgConnectorSettings } from "./store";

export type ConnectorCatalogItem = {
  manifest: ConnectorManifest;
  platformConfigured: boolean;
  organisation: {
    status: ConnectorConnectionStatus;
    connectedAt?: string | null;
    expiresAt?: string | null;
    label?: string | null;
    lastError?: string | null;
  };
};

function platformConfigured(connectorId: string): boolean {
  switch (connectorId) {
    case "domain":
      return Boolean(
        process.env.DOMAIN_CLIENT_ID?.trim() && process.env.DOMAIN_CLIENT_SECRET?.trim(),
      );
    case "google-gbp":
      return Boolean(
        process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
      );
    case "stripe":
      return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
    case "wordpress":
      return Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim());
    case "abr":
      return Boolean(
        process.env.ABN_LOOKUP_GUID?.trim() ||
          process.env.ABR_GUID?.trim() ||
          process.env.ABR_AUTHENTICATION_GUID?.trim(),
      );
    case "asic":
      // DSP application + test credentials required — never report configured from env alone yet
      return false;
    default:
      return false;
  }
}

function statusFromBlob(
  blob: Record<string, unknown> | null,
  connectorId: string,
): ConnectorCatalogItem["organisation"] {
  if (!blob) {
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
      platformConfigured: platformConfigured(manifest.id),
      organisation: statusFromBlob(blob, manifest.id),
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
    lastSyncAt: item.organisation.connectedAt ?? null,
    lastError: item.organisation.lastError ?? null,
  };
}
