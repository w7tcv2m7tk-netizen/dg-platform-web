import type { AppManifest } from "../manifest";

export const propertyManagementApp: AppManifest = {
  id: "property-management",
  name: "Property Management",
  description:
    "Long-term rentals — owners, tenants, leases, maintenance, rent and arrears (not Real Estate sales)",
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
    { href: "/apps/property-management", label: "Property Management", icon: "⌂" },
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
  automationTriggers: [
    { id: "pm.lease.expiring", label: "Lease expiring soon" },
    { id: "pm.rent.overdue", label: "Rent overdue" },
    { id: "pm.maintenance.opened", label: "Maintenance request opened" },
  ],
  automationActions: [
    { id: "pm.send_rent_reminder", label: "Send rent reminder" },
    { id: "pm.schedule_inspection", label: "Schedule routine inspection" },
  ],
  aiTools: [
    {
      id: "pm.owner_statement_summary",
      label: "Owner statement summary",
      description: "Summarise owner statement periods and arrears risk",
    },
  ],
  reports: [
    { id: "pm.vacancies", label: "Vacancies report" },
    { id: "pm.arrears", label: "Arrears report" },
  ],
};
