import type { AppManifest } from "../manifest";

/**
 * Services — DigitalGate OS for service / field businesses (one App).
 * Industry (electrician, plumber, cleaner, …) = Service Templates — not separate Apps.
 * Coverage benchmark: ServiceM8-class ops on Universal Objects + Core — not a FSM clone.
 * @see docs/foundations/SERVICES-APP.md
 */
export const servicesApp: AppManifest = {
  id: "services",
  name: "Services",
  description:
    "DigitalGate OS for service businesses — jobs and scheduling on Core CRM/Commerce (not a standalone FSM)",
  tier: "business",
  version: "0.3.1",
  icon: "⚙",
  routes: [
    { path: "/apps/services", label: "Overview" },
    { path: "/apps/services/jobs", label: "Jobs" },
    { path: "/apps/services/scheduling", label: "Scheduling" },
    { path: "/apps/services/quotes", label: "Quotes" },
    { path: "/apps/services/customers", label: "Customers" },
    { path: "/apps/services/teams", label: "Teams" },
  ],
  navigation: [
    { href: "/apps/services", label: "Overview", icon: "⚙" },
    { href: "/apps/services/jobs", label: "Jobs", icon: "⚙" },
    { href: "/apps/services/scheduling", label: "Scheduling", icon: "⚙" },
  ],
  permissions: [
    { id: "services.view", label: "View jobs and schedule" },
    { id: "services.manage", label: "Manage jobs and quotes" },
    { id: "services.templates.manage", label: "Configure Service Templates" },
  ],
  features: [
    "services.jobs.read",
    "services.jobs.write",
    "services.scheduling.read",
    "services.templates.read",
  ],
  entities: [
    "Contact",
    "Company",
    "Lead",
    "Opportunity",
    "Task",
    "Activity",
    "Document",
    "CommerceQuote",
    "CommerceInvoice",
    "ServiceJob",
  ],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
