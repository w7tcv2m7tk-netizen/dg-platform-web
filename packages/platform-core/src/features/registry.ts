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

const ALL_GROUPS: FeatureGroup[] = [CRM_FEATURES];

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
