/**
 * App manifest — every DigitalGate App declares itself to Platform Core.
 */

export type AppTier = "core" | "business" | "growth" | "internal";

/** Customer apps appear in tenant dashboards; internal apps are DG staff only */
export type AppVisibility = "customer" | "internal";

export interface AppRoute {
  path: string;
  label: string;
}

export interface AppNavItem {
  href: string;
  label: string;
  icon?: string;
}

export interface AppPermission {
  id: string;
  label: string;
  description?: string;
}

export interface AutomationTriggerDef {
  id: string;
  label: string;
  objectType?: string;
}

export interface AutomationActionDef {
  id: string;
  label: string;
}

export interface AiToolDef {
  id: string;
  label: string;
  description?: string;
}

export interface ReportDef {
  id: string;
  label: string;
}

export interface AppManifest {
  id: string;
  name: string;
  description: string;
  tier: AppTier;
  /** Defaults to customer when omitted */
  visibility?: AppVisibility;
  version: string;
  icon: string;
  routes: AppRoute[];
  navigation: AppNavItem[];
  permissions: AppPermission[];
  /** Feature Registry IDs — granular licensing e.g. crm.contacts.read */
  features: string[];
  entities: string[];
  automationTriggers: AutomationTriggerDef[];
  automationActions: AutomationActionDef[];
  aiTools: AiToolDef[];
  reports: ReportDef[];
}

export interface RegisteredApp {
  manifest: AppManifest;
  enabled: boolean;
}
