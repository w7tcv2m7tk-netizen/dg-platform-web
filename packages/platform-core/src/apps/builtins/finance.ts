import type { AppManifest } from "../manifest";

export const financeApp: AppManifest = {
  id: "finance",
  name: "Finance",
  description: "Loan pipeline, client applications, and broker workflow",
  tier: "business",
  version: "0.2.0",
  icon: "◫",
  routes: [
    { path: "/apps/finance", label: "Overview" },
    { path: "/apps/finance/pipeline", label: "Pipeline" },
    { path: "/apps/finance/clients", label: "Clients" },
    { path: "/apps/finance/applications", label: "Applications" },
  ],
  // Registry remains disabled — single nav item until closed beta (Marketing pattern).
  navigation: [{ href: "/apps/finance", label: "Finance", icon: "▣" }],
  permissions: [
    { id: "finance.view", label: "View finance pipeline" },
    { id: "finance.manage", label: "Manage applications" },
  ],
  features: ["finance.pipeline.read", "finance.clients.read", "finance.applications.write"],
  entities: ["Contact", "Lead", "Document", "Activity"],
  automationTriggers: [
    { id: "finance.application.submitted", label: "Application submitted" },
    { id: "finance.application.approved", label: "Application approved" },
  ],
  automationActions: [
    { id: "finance.request_documents", label: "Request supporting documents" },
    { id: "finance.notify_broker", label: "Notify assigned broker" },
  ],
  aiTools: [
    {
      id: "finance.application_summary",
      label: "Application summary",
      description: "Summarise client application and next steps",
    },
  ],
  reports: [{ id: "finance.pipeline_report", label: "Pipeline report" }],
};
