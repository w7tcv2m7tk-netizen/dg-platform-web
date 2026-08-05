import type { AppManifest } from "../manifest";

export const marketingApp: AppManifest = {
  id: "marketing",
  name: "Marketing",
  description: "Campaigns, channels, agency audits, and marketing performance",
  tier: "growth",
  version: "0.1.0",
  icon: "◉",
  routes: [
    { path: "/apps/marketing", label: "Overview" },
    { path: "/apps/marketing/campaigns", label: "Campaigns" },
    { path: "/apps/marketing/channels", label: "Channels" },
    { path: "/apps/marketing/audits", label: "Agency audits" },
  ],
  navigation: [{ href: "/apps/marketing", label: "Marketing", icon: "◉" }],
  permissions: [
    { id: "marketing.view", label: "View marketing" },
    { id: "marketing.manage", label: "Manage campaigns" },
  ],
  features: [
    "marketing.campaigns.read",
    "marketing.campaigns.write",
    "marketing.audits.read",
    "marketing.channels.read",
  ],
  entities: ["Campaign", "Contact", "Lead", "Activity", "Document"],
  automationTriggers: [
    { id: "marketing.campaign.started", label: "Campaign started", objectType: "Campaign" },
    { id: "marketing.audit.completed", label: "Agency audit completed" },
  ],
  automationActions: [
    { id: "marketing.send_audit_report", label: "Send audit report" },
    { id: "marketing.add_to_sequence", label: "Add contact to nurture sequence" },
  ],
  aiTools: [
    {
      id: "marketing.campaign_brief",
      label: "Campaign brief",
      description: "Generate campaign plan from business goals and audience",
    },
  ],
  reports: [{ id: "marketing.performance", label: "Campaign performance" }],
};
