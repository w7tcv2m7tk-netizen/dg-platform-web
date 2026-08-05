import type { AppManifest } from "../manifest";

export const commercialApp: AppManifest = {
  id: "commercial",
  name: "Commercial",
  description: "Commercial property, leases, tenants, and asset management",
  tier: "business",
  version: "0.1.0",
  icon: "▦",
  routes: [
    { path: "/apps/commercial", label: "Overview" },
    { path: "/apps/commercial/properties", label: "Properties" },
    { path: "/apps/commercial/leases", label: "Leases" },
    { path: "/apps/commercial/tenants", label: "Tenants" },
  ],
  navigation: [{ href: "/apps/commercial", label: "Commercial", icon: "▦" }],
  permissions: [
    { id: "commercial.view", label: "View commercial portfolio" },
    { id: "commercial.manage", label: "Manage leases and tenants" },
  ],
  features: [
    "commercial.properties.read",
    "commercial.leases.read",
    "commercial.tenants.read",
  ],
  entities: ["Property", "Contact", "Company", "Document", "Activity"],
  automationTriggers: [
    { id: "commercial.lease.expiring", label: "Lease expiring soon" },
    { id: "commercial.rent.overdue", label: "Rent overdue" },
  ],
  automationActions: [
    { id: "commercial.send_rent_reminder", label: "Send rent reminder" },
    { id: "commercial.schedule_inspection", label: "Schedule inspection" },
  ],
  aiTools: [
    {
      id: "commercial.lease_summary",
      label: "Lease summary",
      description: "Summarise lease terms and key dates",
    },
  ],
  reports: [{ id: "commercial.portfolio", label: "Portfolio report" }],
};
