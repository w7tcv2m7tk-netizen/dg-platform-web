import type { AppManifest } from "../manifest";

export const automotiveApp: AppManifest = {
  id: "automotive",
  name: "Automotive",
  description: "Dealership inventory, buyer leads, test drives, and sales pipeline",
  tier: "business",
  version: "0.2.0",
  icon: "⬡",
  routes: [
    { path: "/apps/automotive", label: "Overview" },
    { path: "/apps/automotive/inventory", label: "Inventory" },
    { path: "/apps/automotive/leads", label: "Buyer leads" },
    { path: "/apps/automotive/test-drives", label: "Test drives" },
  ],
  navigation: [{ href: "/apps/automotive", label: "Automotive", icon: "⬡" }],
  permissions: [
    { id: "automotive.view", label: "View dealership pipeline" },
    { id: "automotive.manage", label: "Manage inventory and leads" },
  ],
  features: [
    "automotive.inventory.read",
    "automotive.leads.read",
    "automotive.leads.write",
    "automotive.test_drives.read",
  ],
  entities: ["Contact", "Lead", "Vehicle", "Activity", "Booking"],
  automationTriggers: [
    { id: "automotive.lead.created", label: "Buyer lead created", objectType: "Lead" },
    { id: "automotive.test_drive.booked", label: "Test drive booked", objectType: "Booking" },
  ],
  automationActions: [
    { id: "automotive.assign_sales", label: "Assign sales consultant" },
    { id: "automotive.send_brochure", label: "Send vehicle brochure" },
  ],
  aiTools: [
    {
      id: "automotive.match_inventory",
      label: "Match buyer to stock",
      description: "Suggest vehicles from inventory based on buyer preferences",
    },
  ],
  reports: [{ id: "automotive.pipeline", label: "Sales pipeline report" }],
};
