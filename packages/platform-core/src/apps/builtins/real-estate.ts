import type { AppManifest } from "../manifest";

export const realEstateApp: AppManifest = {
  id: "real-estate",
  name: "Real Estate",
  description: "Vendor leads, listings, buyers, and settlements",
  tier: "business",
  version: "1.0.0",
  icon: "🏠",
  routes: [
    { path: "/apps/real-estate/leads", label: "Vendor leads" },
    { path: "/apps/real-estate/pipeline", label: "Pipeline" },
    { path: "/apps/real-estate/listings", label: "Listings" },
  ],
  navigation: [
    { href: "/apps/real-estate/leads", label: "Vendor leads", icon: "◈" },
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
