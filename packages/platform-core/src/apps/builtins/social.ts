import type { AppManifest } from "../manifest";

export const socialApp: AppManifest = {
  id: "social",
  name: "Social",
  description:
    "Compose, schedule, and publish to LinkedIn, Facebook, Instagram, X, and Pinterest — Social Pro on Gen 2",
  tier: "growth",
  version: "0.1.0",
  icon: "◎",
  routes: [
    { path: "/apps/social", label: "Overview" },
    { path: "/apps/social/compose", label: "Compose" },
    { path: "/apps/social/calendar", label: "Content calendar" },
    { path: "/apps/social/accounts", label: "Connected accounts" },
  ],
  navigation: [{ href: "/apps/social", label: "Social", icon: "◎" }],
  permissions: [
    { id: "social.view", label: "View social calendar" },
    { id: "social.publish", label: "Publish posts" },
    { id: "social.accounts", label: "Manage connected accounts" },
  ],
  features: [
    "social.compose",
    "social.schedule",
    "social.publish",
    "social.accounts.read",
    "social.analytics.read",
  ],
  entities: ["Document", "Campaign", "Activity"],
  automationTriggers: [
    { id: "social.post.published", label: "Post published" },
    { id: "social.post.failed", label: "Post publish failed" },
  ],
  automationActions: [
    { id: "social.schedule_post", label: "Schedule social post" },
    { id: "social.notify_team", label: "Notify marketing team" },
  ],
  aiTools: [
    {
      id: "social.draft_post",
      label: "Draft social post",
      description: "Generate platform-native copy from a brief or blog URL",
    },
  ],
  reports: [{ id: "social.engagement", label: "Engagement report" }],
};
