import type { AppManifest } from "../manifest";

export const commercialApp: AppManifest = {
  id: "commercial",
  name: "Commercial Property",
  description:
    "Commercial assets and tenancies — landlords, leases and tenant records (not residential RE sales or long-term PM)",
  tier: "business",
  version: "0.2.0",
  icon: "▦",
  routes: [
    { path: "/apps/commercial", label: "Overview" },
    { path: "/apps/commercial/properties", label: "Properties" },
    { path: "/apps/commercial/leases", label: "Leases" },
    { path: "/apps/commercial/tenants", label: "Tenants" },
  ],
  navigation: [
    { href: "/apps/commercial", label: "Overview", icon: "▦" },
    { href: "/apps/commercial/properties", label: "Properties", icon: "▦" },
    { href: "/apps/commercial/leases", label: "Leases", icon: "▦" },
    { href: "/apps/commercial/tenants", label: "Tenants", icon: "▦" },
  ],
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
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
