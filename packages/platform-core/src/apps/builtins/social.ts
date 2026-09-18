import type { AppManifest } from "../manifest";

export const socialApp: AppManifest = {
  id: "social",
  name: "Social",
  description:
    "Connect organisation-scoped social accounts, use authorised social evidence, and create local drafts while direct network publishing remains disabled",
  tier: "growth",
  version: "0.1.0",
  icon: "◎",
  routes: [
    { path: "/apps/social", label: "Overview" },
    { path: "/apps/social/compose", label: "Drafts" },
    { path: "/apps/social/calendar", label: "Draft timeline" },
    { path: "/apps/social/accounts", label: "Connected accounts" },
  ],
  navigation: [{ href: "/apps/social", label: "Social", icon: "◎" }],
  permissions: [
    { id: "social.view", label: "View social workspace" },
    { id: "social.publish", label: "Create social drafts" },
    { id: "social.accounts", label: "Manage connected accounts" },
  ],
  features: [
    "social.compose",
    "social.accounts.read",
    "social.profile.read",
  ],
  entities: ["Document", "Campaign", "Activity"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [],
  reports: [],
};
