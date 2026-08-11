/**
 * Connector Engine — shared contract for Platform Core connectors.
 *
 * Industry apps (RE Listing Hub, Acc OTA, Commerce) consume adapters;
 * they do not own auth/sync infrastructure.
 *
 * @see docs/foundations/CONNECTOR-ENGINE.md
 */

export type ConnectorCategory =
  | "property"
  | "business"
  | "marketing"
  | "commerce"
  | "ops";

export type ConnectorAuthKind = "oauth" | "api_key" | "webhook" | "mixed";

export type ConnectorConnectionStatus =
  | "connected"
  | "degraded"
  | "error"
  | "disconnected"
  | "pending_auth";

export type ConnectorManifest = {
  id: string;
  name: string;
  category: ConnectorCategory;
  auth: ConnectorAuthKind;
  /** Universal Object ids this connector reads/writes */
  syncObjects: string[];
  /** Capability ids e.g. listing.publish, lead.ingest */
  capabilities: string[];
  webhookEvents?: string[];
  oauthScopes?: string[];
  countries?: string[];
  /** Apps that surface this connector in Settings / setup */
  appIds?: string[];
};

export type ConnectorHealth = {
  connectorId: string;
  organisationId: string;
  status: ConnectorConnectionStatus;
  lastSyncAt?: string | null;
  lastError?: string | null;
  errorCount?: number;
};

export type ConnectorCapability =
  | "listing.publish"
  | "listing.update"
  | "listing.withdraw"
  | "listing.status"
  | "lead.ingest"
  | "enquiry.ingest"
  | "profile.read"
  | "profile.write"
  | "reviews.read"
  | "insights.read"
  | "address.suggest"
  | "valuation.read"
  | "payment.checkout"
  | (string & {});

const manifests = new Map<string, ConnectorManifest>();

export function registerConnectorManifest(manifest: ConnectorManifest): void {
  manifests.set(manifest.id, manifest);
}

export function getConnectorManifest(id: string): ConnectorManifest | undefined {
  return manifests.get(id);
}

export function listConnectorManifests(filter?: {
  category?: ConnectorCategory;
  appId?: string;
}): ConnectorManifest[] {
  let list = [...manifests.values()];
  if (filter?.category) {
    list = list.filter((m) => m.category === filter.category);
  }
  if (filter?.appId) {
    list = list.filter((m) => !m.appIds?.length || m.appIds.includes(filter.appId!));
  }
  return list;
}

/** Seed known / planned connectors (manifests only — adapters register separately). */
export const PLANNED_CONNECTOR_MANIFESTS: ConnectorManifest[] = [
  {
    id: "stripe",
    name: "Stripe",
    category: "commerce",
    auth: "mixed",
    syncObjects: ["Invoice", "Organisation"],
    capabilities: ["payment.checkout"],
    webhookEvents: ["checkout.session.completed", "invoice.paid"],
  },
  {
    id: "wordpress",
    name: "WordPress",
    category: "ops",
    auth: "api_key",
    syncObjects: ["Lead", "Contact", "Property", "StayBooking"],
    capabilities: ["lead.ingest", "listing.publish"],
    appIds: ["real-estate", "accommodation", "websites", "crm"],
  },
  {
    id: "google-gbp",
    name: "Google Business Profile",
    category: "business",
    auth: "oauth",
    syncObjects: ["Organisation", "Activity"],
    capabilities: ["profile.read", "profile.write", "reviews.read", "insights.read"],
  },
  {
    id: "abr",
    name: "Australian Business Register (ABR)",
    category: "business",
    auth: "api_key",
    syncObjects: ["Organisation"],
    capabilities: ["profile.read", "abn.verify", "entity.enrich"],
    countries: ["AU"],
  },
  {
    id: "asic",
    name: "ASIC Business Names & Companies",
    category: "business",
    auth: "api_key",
    syncObjects: ["Organisation"],
    capabilities: ["business_name.search", "business_name.register", "company.register"],
    countries: ["AU"],
  },
  {
    id: "rea",
    name: "realestate.com.au",
    category: "property",
    auth: "oauth",
    syncObjects: ["Listing", "Property", "Lead"],
    capabilities: ["listing.publish", "listing.update", "listing.withdraw", "enquiry.ingest"],
    countries: ["AU"],
    appIds: ["real-estate"],
  },
  {
    id: "domain",
    name: "Domain",
    category: "property",
    auth: "oauth",
    syncObjects: ["Listing", "Property", "Lead"],
    capabilities: [
      "listing.publish",
      "listing.update",
      "listing.withdraw",
      "listing.status",
      "enquiry.ingest",
      "address.suggest",
    ],
    countries: ["AU"],
    appIds: ["real-estate"],
  },
  {
    id: "corelogic",
    name: "Cotality (CoreLogic / RP Data)",
    category: "property",
    auth: "oauth",
    syncObjects: ["Property", "Listing"],
    capabilities: [
      "address.suggest",
      "valuation.read",
      "insights.read",
    ],
    countries: ["AU", "NZ"],
    appIds: ["real-estate"],
  },
  {
    id: "meta",
    name: "Meta (Facebook / Instagram)",
    category: "marketing",
    auth: "oauth",
    syncObjects: ["Lead", "Campaign"],
    capabilities: ["lead.ingest", "listing.publish"],
  },
  {
    id: "xero",
    name: "Xero",
    category: "commerce",
    auth: "oauth",
    syncObjects: ["Invoice", "Contact"],
    capabilities: ["payment.checkout"],
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "commerce",
    auth: "oauth",
    syncObjects: ["Product", "Order", "Contact"],
    capabilities: ["listing.publish"],
  },
];

export function seedPlannedConnectorManifests(): void {
  for (const m of PLANNED_CONNECTOR_MANIFESTS) {
    registerConnectorManifest(m);
  }
}
