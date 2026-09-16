/**
 * Connector Engine — shared contract for Platform Core connectors.
 *
 * Industry apps consume adapters; they do not own auth/sync infrastructure.
 */

export type ConnectorCategory = "property" | "business" | "marketing" | "commerce" | "ops";
export type ConnectorAuthKind = "oauth" | "api_key" | "webhook" | "mixed";
export type ConnectorConnectionStatus = "connected" | "degraded" | "error" | "disconnected" | "pending_auth";

/** Customer-facing catalogue truth. Priority is deliberately separate from readiness. */
export type ConnectorMaturity = "native" | "available" | "planned";

export type ConnectorManifest = {
  id: string;
  name: string;
  category: ConnectorCategory;
  auth: ConnectorAuthKind;
  /** Native = implemented DG connection path; available = supported bridge/configuration; planned = not operational yet. */
  maturity: ConnectorMaturity;
  syncObjects: string[];
  capabilities: string[];
  webhookEvents?: string[];
  oauthScopes?: string[];
  countries?: string[];
  appIds?: string[];
  priorityTier?: number;
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
  | "listing.publish" | "listing.update" | "listing.withdraw" | "listing.status"
  | "lead.ingest" | "enquiry.ingest" | "profile.read" | "profile.write"
  | "reviews.read" | "insights.read" | "address.suggest" | "valuation.read"
  | "payment.checkout" | (string & {});

const manifests = new Map<string, ConnectorManifest>();
export function registerConnectorManifest(manifest: ConnectorManifest): void { manifests.set(manifest.id, manifest); }
export function getConnectorManifest(id: string): ConnectorManifest | undefined { return manifests.get(id); }
export function listConnectorManifests(filter?: { category?: ConnectorCategory; appId?: string }): ConnectorManifest[] {
  let list = [...manifests.values()];
  if (filter?.category) list = list.filter((m) => m.category === filter.category);
  if (filter?.appId) list = list.filter((m) => !m.appIds?.length || m.appIds.includes(filter.appId!));
  return list;
}

/**
 * Canonical connector catalogue. Maturity is evidence-based: manifests with an implemented
 * DigitalGate connection path are native; supported legacy/universal bridges are available;
 * manifests without an operational connection path remain planned.
 */
export const PLANNED_CONNECTOR_MANIFESTS: ConnectorManifest[] = [
  { id:"stripe", name:"Stripe", category:"commerce", auth:"mixed", maturity:"native", syncObjects:["Invoice","Organisation"], capabilities:["payment.checkout"], webhookEvents:["checkout.session.completed","invoice.paid"], priorityTier:1, dg15Rank:1 },
  { id:"wordpress", name:"WordPress", category:"ops", auth:"api_key", maturity:"available", syncObjects:["Lead","Contact","Property","StayBooking"], capabilities:["lead.ingest","listing.publish"], appIds:["real-estate","accommodation","websites","crm"], priorityTier:1, dg15Rank:6 },
  { id:"google-gbp", name:"Google Business Profile", category:"business", auth:"oauth", maturity:"native", syncObjects:["Organisation","Activity"], capabilities:["profile.read","profile.write","reviews.read","insights.read"], priorityTier:1, dg15Rank:4 },
  { id:"google-gmail", name:"Google Gmail / Workspace", category:"ops", auth:"oauth", maturity:"native", syncObjects:["OrgCommunication","Contact"], capabilities:["mail.read","mail.send","mail.sync"], appIds:["communications","crm"], priorityTier:1, dg15Rank:5 },
  { id:"microsoft-365", name:"Microsoft 365 / Outlook", category:"ops", auth:"oauth", maturity:"native", syncObjects:["OrgCommunication","Contact"], capabilities:["mail.read","mail.send","mail.sync"], appIds:["communications","crm"], priorityTier:3, dg15Rank:5 },
  { id:"apple-icloud", name:"Apple iCloud Mail", category:"ops", auth:"api_key", maturity:"native", syncObjects:["OrgCommunication","Contact"], capabilities:["mail.read","mail.send","mail.sync"], appIds:["communications","crm"], priorityTier:3 },
  { id:"abr", name:"Australian Business Register (ABR)", category:"business", auth:"api_key", maturity:"native", syncObjects:["Organisation"], capabilities:["profile.read","abn.verify","entity.enrich"], countries:["AU"], priorityTier:1, dg15Rank:2 },
  { id:"asic", name:"ASIC Business Names & Companies", category:"business", auth:"api_key", maturity:"planned", syncObjects:["Organisation"], capabilities:["business_name.search","business_name.register","company.register"], countries:["AU"], priorityTier:1, dg15Rank:3 },
  { id:"rea", name:"realestate.com.au", category:"property", auth:"oauth", maturity:"native", syncObjects:["Listing","Property","Lead"], capabilities:["listing.publish","listing.update","listing.withdraw","enquiry.ingest"], countries:["AU"], appIds:["real-estate"], priorityTier:1, dg15Rank:8 },
  { id:"domain", name:"Domain", category:"property", auth:"oauth", maturity:"native", syncObjects:["Listing","Property","Lead"], capabilities:["listing.publish","listing.update","listing.withdraw","listing.status","enquiry.ingest","address.suggest"], countries:["AU"], appIds:["real-estate"], priorityTier:1, dg15Rank:7 },
  { id:"corelogic", name:"Cotality (CoreLogic / RP Data)", category:"property", auth:"oauth", maturity:"available", syncObjects:["Property","Listing"], capabilities:["address.suggest","valuation.read","insights.read","property.details.read"], countries:["AU","NZ"], appIds:["real-estate"], priorityTier:5, dg15Rank:9 },
  { id:"meta", name:"Meta (Facebook / Instagram)", category:"marketing", auth:"oauth", maturity:"planned", syncObjects:["Lead","Campaign"], capabilities:["lead.ingest","listing.publish"], priorityTier:1, dg15Rank:10 },
  { id:"linkedin", name:"LinkedIn", category:"marketing", auth:"oauth", maturity:"native", syncObjects:["Activity","Organisation"], capabilities:["profile.read","listing.publish"], appIds:["social"], oauthScopes:["openid","profile","email","w_organization_social","r_organization_social"], priorityTier:1 },
  { id:"xero", name:"Xero", category:"commerce", auth:"oauth", maturity:"planned", syncObjects:["Invoice","Contact"], capabilities:["payment.checkout"], priorityTier:6, dg15Rank:13 },
  { id:"shopify", name:"Shopify", category:"commerce", auth:"oauth", maturity:"planned", syncObjects:["Product","Order","Contact"], capabilities:["listing.publish"], priorityTier:7 },
  { id:"dreamscape", name:"Dreamscape (Infrastructure reseller)", category:"ops", auth:"api_key", maturity:"native", syncObjects:["Organisation"], capabilities:["domain.register","hosting.provision","mailbox.provision"], countries:["AU"], appIds:["infrastructure"], priorityTier:1, dg15Rank:5 },
  { id:"vercel-ai-gateway", name:"Vercel AI Gateway (via Model Router)", category:"ops", auth:"api_key", maturity:"native", syncObjects:[], capabilities:["ai.inference"], priorityTier:1 },
  { id:"openai", name:"OpenAI (via Model Router)", category:"ops", auth:"api_key", maturity:"native", syncObjects:[], capabilities:["ai.inference"], priorityTier:1, dg15Rank:11 },
  { id:"elevenlabs", name:"ElevenLabs", category:"marketing", auth:"api_key", maturity:"native", syncObjects:[], capabilities:["voice.synthesize"], appIds:["ai-communications"], priorityTier:3, dg15Rank:12 },
  { id:"twilio", name:"Twilio (telephony adapter)", category:"marketing", auth:"api_key", maturity:"native", syncObjects:["Contact"], capabilities:["sms.send","voice.call","numbers.provision"], appIds:["communications","ai-communications"], priorityTier:3, dg15Rank:14 },
  { id:"telnyx", name:"Telnyx (telephony adapter)", category:"marketing", auth:"api_key", maturity:"available", syncObjects:["Contact"], capabilities:["sms.send","voice.call","numbers.provision"], appIds:["communications","ai-communications"], priorityTier:3 },
  { id:"cloudflare", name:"Cloudflare", category:"ops", auth:"api_key", maturity:"native", syncObjects:[], capabilities:["cdn.configure","dns.manage"], appIds:["infrastructure"], priorityTier:10, dg15Rank:15 },
];

export function seedPlannedConnectorManifests(): void {
  for (const m of PLANNED_CONNECTOR_MANIFESTS) registerConnectorManifest(m);
}
