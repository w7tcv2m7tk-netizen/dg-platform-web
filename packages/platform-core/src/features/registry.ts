/** Feature Registry — granular capabilities beneath Apps */

export interface FeatureDefinition {
  /** e.g. crm.contacts.read */
  id: string;
  appId: string;
  label: string;
  description?: string;
  /** Permission tier for licensing */
  tier?: "free" | "standard" | "premium";
}

export interface FeatureGroup {
  appId: string;
  label: string;
  features: FeatureDefinition[];
}

/** CRM feature registry (example) */
export const CRM_FEATURES: FeatureGroup = {
  appId: "crm",
  label: "CRM",
  features: [
    { id: "crm.contacts.read", appId: "crm", label: "View contacts" },
    { id: "crm.contacts.write", appId: "crm", label: "Create and edit contacts" },
    { id: "crm.contacts.delete", appId: "crm", label: "Delete contacts" },
    { id: "crm.contacts.export", appId: "crm", label: "Export contacts", tier: "standard" },
    { id: "crm.contacts.import", appId: "crm", label: "Import contacts", tier: "standard" },
    { id: "crm.contacts.merge", appId: "crm", label: "Merge contacts", tier: "premium" },
    { id: "crm.timeline.read", appId: "crm", label: "View timeline" },
    { id: "crm.tags.write", appId: "crm", label: "Manage tags" },
  ],
};

/** AI Communications feature registry */
export const AI_COMMUNICATIONS_FEATURES: FeatureGroup = {
  appId: "ai-communications",
  label: "AI Communications",
  features: [
    { id: "comms.inbox.read", appId: "ai-communications", label: "View inbox" },
    { id: "comms.messages.draft", appId: "ai-communications", label: "Draft messages" },
    {
      id: "comms.messages.send",
      appId: "ai-communications",
      label: "Send messages",
      tier: "standard",
    },
    { id: "comms.voice.read", appId: "ai-communications", label: "View voice agents" },
    {
      id: "comms.voice.inbound",
      appId: "ai-communications",
      label: "Inbound voice agents",
      tier: "premium",
    },
    {
      id: "comms.voice.outbound",
      appId: "ai-communications",
      label: "Outbound voice agents",
      tier: "premium",
    },
    {
      id: "comms.agents.configure",
      appId: "ai-communications",
      label: "Configure AI agents",
      tier: "premium",
    },
    { id: "comms.knowledge.read", appId: "ai-communications", label: "View knowledge base" },
    {
      id: "comms.knowledge.write",
      appId: "ai-communications",
      label: "Edit knowledge base",
      tier: "standard",
    },
    { id: "comms.call_centre.read", appId: "ai-communications", label: "View call centre" },
    {
      id: "comms.analytics.read",
      appId: "ai-communications",
      label: "View communications analytics",
      tier: "standard",
    },
    {
      id: "comms.ai.coaching.read",
      appId: "ai-communications",
      label: "View AI coaching insights",
      tier: "premium",
    },
  ],
};

const ALL_GROUPS: FeatureGroup[] = [CRM_FEATURES, AI_COMMUNICATIONS_FEATURES];

export class FeatureRegistry {
  private features = new Map<string, FeatureDefinition>();

  constructor(groups: FeatureGroup[] = ALL_GROUPS) {
    for (const group of groups) {
      for (const feature of group.features) {
        this.features.set(feature.id, feature);
      }
    }
  }

  get(id: string) {
    return this.features.get(id);
  }

  listForApp(appId: string) {
    return [...this.features.values()].filter((f) => f.appId === appId);
  }

  listAll() {
    return [...this.features.values()];
  }
}

export const platformFeatures = new FeatureRegistry();
