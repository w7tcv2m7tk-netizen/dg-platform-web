import type { AppManifest } from "../manifest";
import { getSidebarIcon } from "../sidebar-icons";

/**
 * Communications — Core App (business communication layer).
 * Not a Gmail clone. Google/Microsoft remain mailbox SoT.
 * CRM owns who; Communications talks to them; Timeline is universal history.
 * @see docs/foundations/COMMUNICATIONS.md
 */
export const communicationsApp: AppManifest = {
  id: "communications",
  name: "Communications",
  description:
    "Business communication layer — Inbox, channels, and AI Assist (not a mailbox clone)",
  tier: "core",
  version: "0.2.0",
  icon: getSidebarIcon("communications"),
  routes: [
    { path: "/apps/communications/inbox", label: "Inbox" },
    { path: "/apps/communications/email", label: "Email" },
    { path: "/apps/communications/sms", label: "SMS" },
    { path: "/apps/communications/calls", label: "Calls" },
    { path: "/apps/communications/outreach", label: "Outreach" },
    { path: "/apps/communications/templates", label: "Templates" },
    { path: "/apps/communications/signatures", label: "Signatures" },
    { path: "/apps/communications", label: "Overview" },
  ],
  navigation: [
    {
      href: "/apps/communications",
      label: "Communications",
      icon: getSidebarIcon("communications"),
    },
  ],
  permissions: [
    { id: "communications.view", label: "View communications" },
    { id: "communications.send", label: "Send email" },
    { id: "communications.manage", label: "Manage communications" },
  ],
  features: [
    "communications.read",
    "communications.write",
    "communications.email.send",
  ],
  entities: ["Contact", "Company", "Opportunity", "Communication"],
  automationTriggers: [
    { id: "communication.created", label: "Communication created", objectType: "Communication" },
    { id: "communication.sent", label: "Communication sent", objectType: "Communication" },
    { id: "communication.replied", label: "Reply detected", objectType: "Communication" },
  ],
  automationActions: [],
  aiTools: [
    {
      id: "communications.draft_assist",
      label: "AI Assist draft",
      description: "Draft reply / follow-up with Brain context — human reviews and sends",
    },
  ],
  reports: [{ id: "communications.history_summary", label: "Communication history summary" }],
};
