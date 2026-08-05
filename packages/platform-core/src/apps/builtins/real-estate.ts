import type { AppManifest } from "../manifest";

export const realEstateApp: AppManifest = {
  id: "real-estate",
  name: "Real Estate",
  description: "Vendor leads, listings, buyers, and settlements",
  tier: "business",
  version: "1.0.0",
  icon: "🏠",
  routes: [
    { path: "/apps/re/vendor-leads", label: "Vendor leads" },
    { path: "/apps/re/buyer-leads", label: "Buyer leads" },
    { path: "/apps/re/properties", label: "Properties & appraisals" },
    { path: "/apps/re/listings", label: "Listings" },
    { path: "/apps/re/bookings", label: "Bookings" },
    { path: "/apps/re/settlements", label: "Settlements" },
  ],
  navigation: [
    { href: "/apps/re/vendor-leads", label: "Vendor leads", icon: "◈" },
    { href: "/apps/re/properties", label: "Properties", icon: "⌂" },
  ],
  permissions: [
    { id: "re.view_leads", label: "View vendor leads" },
    { id: "re.manage_listings", label: "Manage listings" },
  ],
  features: [
    "re.leads.read",
    "re.leads.write",
    "re.pipeline.read",
    "re.listings.read",
    "re.listings.write",
  ],
  entities: ["Contact", "Lead", "Property", "Activity", "Opportunity"],
  automationTriggers: [
    { id: "lead.created", label: "Vendor lead created", objectType: "Lead" },
    { id: "property.listed", label: "Property listed", objectType: "Property" },
  ],
  automationActions: [
    { id: "lead.assign_agent", label: "Assign agent" },
    { id: "lead.send_followup", label: "Send follow-up email" },
  ],
  aiTools: [
    {
      id: "re.appraisal_summary",
      label: "Appraisal summary",
      description: "Generate vendor appraisal narrative",
    },
  ],
  reports: [{ id: "re.pipeline_report", label: "Vendor pipeline report" }],
};
