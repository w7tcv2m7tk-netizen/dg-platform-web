import type { AppManifest } from "../manifest";

export const creatorApp: AppManifest = {
  id: "creator",
  name: "Creator",
  description: "Content, memberships, digital products, and creator storefront",
  tier: "business",
  version: "0.2.0",
  icon: "✦",
  routes: [
    { path: "/apps/creator", label: "Overview" },
    { path: "/apps/creator/content", label: "Content library" },
    { path: "/apps/creator/memberships", label: "Memberships" },
    { path: "/apps/creator/storefront", label: "Storefront" },
  ],
  navigation: [{ href: "/apps/creator", label: "Creator", icon: "✦" }],
  permissions: [
    { id: "creator.view", label: "View creator dashboard" },
    { id: "creator.manage", label: "Manage content and products" },
  ],
  features: [
    "creator.content.read",
    "creator.content.publish",
    "creator.memberships.read",
    "creator.storefront.read",
  ],
  entities: ["Document", "Contact", "CommerceProduct", "CommerceSubscription"],
  automationTriggers: [
    { id: "creator.member.joined", label: "New member joined" },
    { id: "creator.content.published", label: "Content published" },
  ],
  automationActions: [
    { id: "creator.welcome_member", label: "Send member welcome" },
    { id: "creator.notify_subscribers", label: "Notify subscribers" },
  ],
  aiTools: [
    {
      id: "creator.content_draft",
      label: "Draft content",
      description: "Generate content drafts aligned to creator brand",
    },
  ],
  reports: [{ id: "creator.revenue", label: "Creator revenue" }],
};
