import type { AppManifest } from "../manifest";

export const propertyManagementApp: AppManifest = {
  id: "property-management",
  name: "Property Management",
  description:
    "Long-term rentals — owners, tenants, leases and maintenance records (not Real Estate sales)",
  tier: "business",
  version: "0.1.0",
  icon: "⌂",
  routes: [
    { path: "/apps/property-management", label: "Overview" },
    { path: "/apps/property-management/properties", label: "Rental properties" },
    { path: "/apps/property-management/owners", label: "Owners" },
    { path: "/apps/property-management/tenants", label: "Tenants" },
    { path: "/apps/property-management/leases", label: "Leases" },
    { path: "/apps/property-management/maintenance", label: "Maintenance" },
  ],
  navigation: [
    { href: "/apps/property-management", label: "Overview", icon: "⌂" },
    { href: "/apps/property-management/properties", label: "Properties", icon: "⌂" },
    { href: "/apps/property-management/leases", label: "Leases", icon: "⌂" },
    { href: "/apps/property-management/owners", label: "Owners", icon: "⌂" },
    { href: "/apps/property-management/tenants", label: "Tenants", icon: "⌂" },
    { href: "/apps/property-management/maintenance", label: "Maintenance", icon: "⌂" },
  ],
  permissions: [
    { id: "pm.view", label: "View property management portfolio" },
    { id: "pm.manage", label: "Manage leases, tenants and maintenance" },
  ],
  features: [
    "pm.properties.read",
    "pm.leases.read",
    "pm.tenants.read",
    "pm.maintenance.read",
  ],
  entities: ["Property", "Contact", "Company", "Document", "Activity"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
