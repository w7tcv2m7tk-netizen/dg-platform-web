import type { AppManifest } from "../manifest";

export const financeApp: AppManifest = {
  id: "finance",
  name: "Finance",
  description:
    "Finance broking — mortgage and loan pipeline on Core CRM (accounting remains label-only until a live accounting connector is enabled)",
  tier: "business",
  version: "0.3.0",
  icon: "◫",
  routes: [
    { path: "/apps/finance", label: "Overview" },
    { path: "/apps/finance/pipeline", label: "Pipeline" },
    { path: "/apps/finance/applications", label: "Applications" },
    { path: "/apps/finance/clients", label: "Clients" },
  ],
  navigation: [
    { href: "/apps/finance", label: "Overview", icon: "▣" },
    { href: "/apps/finance/pipeline", label: "Pipeline", icon: "▣" },
    { href: "/apps/finance/applications", label: "Applications", icon: "▣" },
    { href: "/apps/finance/clients", label: "Clients", icon: "▣" },
  ],
  permissions: [
    { id: "finance.view", label: "View finance pipeline" },
    { id: "finance.manage", label: "Manage applications" },
  ],
  features: ["finance.pipeline.read", "finance.clients.read", "finance.applications.write"],
  entities: ["Contact", "Lead", "Document", "Activity"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
