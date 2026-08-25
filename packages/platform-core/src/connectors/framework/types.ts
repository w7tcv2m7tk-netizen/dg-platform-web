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
  /**
   * Strategic priority tier 1–10 (CONNECTOR-PRIORITY.md).
   * Annotation only — does not mean production-ready or enabled.
   */
  priorityTier?: number;
  /** Rank in DigitalGate 15 (1–15), if applicable. Annotation only. */
  dg15Rank?: number;
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

/** Seed known / planned connectors (manifests only — adapters register separately).
 * priorityTier / dg15Rank are programme annotations — not “enabled”.
 * @see docs/foundations/CONNECTOR-PRIORITY.md
 */
export const PLANNED_CONNECTOR_MANIFESTS: ConnectorManifest[] = [
  {
    id: "stripe",
    name: "Stripe",
    category: "commerce",
    auth: "mixed",
    syncObjects: ["Invoice", "Organisation"],
    capabilities: ["payment.checkout"],
    webhookEvents: ["checkout.session.completed", "invoice.paid"],
    priorityTier: 1,
    dg15Rank: 1,
  },
  {
    id: "wordpress",
    name: "WordPress",
    category: "ops",
    auth: "api_key",
    syncObjects: ["Lead", "Contact", "Property", "StayBooking"],
    capabilities: ["lead.ingest", "listing.publish"],
    appIds: ["real-estate", "accommodation", "websites", "crm"],
    priorityTier: 1,
    dg15Rank: 6,
  },
  {
    id: "google-gbp",
    name: "Google Business Profile",
    category: "business",
    auth: "oauth",
    syncObjects: ["Organisation", "Activity"],
    capabilities: ["profile.read", "profile.write", "reviews.read", "insights.read"],
    priorityTier: 1,
    dg15Rank: 4,
  },
  {
    id: "google-gmail",
    name: "Google Gmail / Workspace",
    category: "ops",
    auth: "oauth",
    syncObjects: ["OrgCommunication", "Contact"],
    capabilities: ["mail.read", "mail.send", "mail.sync"],
    appIds: ["communications", "crm"],
    priorityTier: 1,
    dg15Rank: 5,
  },
  {
    id: "abr",
    name: "Australian Business Register (ABR)",
    category: "business",
    auth: "api_key",
    syncObjects: ["Organisation"],
    capabilities: ["profile.read", "abn.verify", "entity.enrich"],
    countries: ["AU"],
    priorityTier: 1,
    dg15Rank: 2,
  },
  {
    id: "asic",
    name: "ASIC Business Names & Companies",
    category: "business",
    auth: "api_key",
    syncObjects: ["Organisation"],
    capabilities: ["business_name.search", "business_name.register", "company.register"],
    countries: ["AU"],
    priorityTier: 1,
    dg15Rank: 3,
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
    priorityTier: 1,
    dg15Rank: 8,
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
    priorityTier: 1,
    dg15Rank: 7,
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
      "property.details.read",
    ],
    countries: ["AU", "NZ"],
    appIds: ["real-estate"],
    priorityTier: 5,
    dg15Rank: 9,
  },
  {
    id: "meta",
    name: "Meta (Facebook / Instagram)",
    category: "marketing",
    auth: "oauth",
    syncObjects: ["Lead", "Campaign"],
    capabilities: ["lead.ingest", "listing.publish"],
    priorityTier: 1,
    dg15Rank: 10,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "marketing",
    auth: "oauth",
    syncObjects: ["Activity", "Organisation"],
    capabilities: ["profile.read", "listing.publish"],
    appIds: ["social"],
    oauthScopes: [
      "openid",
      "profile",
      "email",
      "w_organization_social",
      "r_organization_social",
    ],
    priorityTier: 1,
  },
  {
    id: "xero",
    name: "Xero",
    category: "commerce",
    auth: "oauth",
    syncObjects: ["Invoice", "Contact"],
    capabilities: ["payment.checkout"],
    priorityTier: 6,
    dg15Rank: 13,
  },
  {
    id: "shopify",
    name: "Shopify",
    category: "commerce",
    auth: "oauth",
    syncObjects: ["Product", "Order", "Contact"],
    capabilities: ["listing.publish"],
    priorityTier: 7,
  },
  {
    id: "dreamscape",
    name: "Dreamscape (Infrastructure reseller)",
    category: "ops",
    auth: "api_key",
    syncObjects: ["Organisation"],
    capabilities: ["domain.register", "hosting.provision", "mailbox.provision"],
    countries: ["AU"],
    appIds: ["infrastructure"],
    priorityTier: 1,
    dg15Rank: 5,
  },
  {
    id: "vercel-ai-gateway",
    name: "Vercel AI Gateway (via Model Router)",
    category: "ops",
    auth: "api_key",
    syncObjects: [],
    capabilities: ["ai.inference"],
    priorityTier: 1,
  },
  {
    id: "openai",
    name: "OpenAI (via Model Router)",
    category: "ops",
    auth: "api_key",
    syncObjects: [],
    capabilities: ["ai.inference"],
    priorityTier: 1,
    dg15Rank: 11,
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "marketing",
    auth: "api_key",
    syncObjects: [],
    capabilities: ["voice.synthesize"],
    appIds: ["ai-communications"],
    priorityTier: 3,
    dg15Rank: 12,
  },
  {
    id: "twilio",
    name: "Twilio (SMS / Voice)",
    category: "marketing",
    auth: "api_key",
    syncObjects: ["Contact"],
    capabilities: ["sms.send", "voice.call"],
    appIds: ["ai-communications"],
    priorityTier: 3,
    dg15Rank: 14,
  },
  {
    id: "cloudflare",
    name: "Cloudflare",
    category: "ops",
    auth: "api_key",
    syncObjects: [],
    capabilities: ["cdn.configure", "dns.manage"],
    appIds: ["infrastructure"],
    priorityTier: 10,
    dg15Rank: 15,
  },
];

export function seedPlannedConnectorManifests(): void {
  for (const m of PLANNED_CONNECTOR_MANIFESTS) {
    registerConnectorManifest(m);
  }
}
