/**
 * Business Brain knowledge layers — conceptual + metadata contract.
 * @see docs/foundations/CONNECTED-BUSINESS-IMPLEMENTATION.md
 */

export const BUSINESS_BRAIN_KNOWLEDGE_LAYERS = [
  {
    id: "platform",
    label: "Platform Knowledge",
    summary: "DigitalGate docs, capabilities, policies, implementation and troubleshooting.",
  },
  {
    id: "business",
    label: "Business Knowledge",
    summary: "This organisation’s plans, SOPs, brand, pricing, strategy and internal documents.",
  },
  {
    id: "live",
    label: "Live Business Context",
    summary: "Operational data — contacts, opportunities, website, revenue, tasks, reviews, analytics.",
  },
  {
    id: "external",
    label: "External Intelligence",
    summary: "Industry, market, search, AI visibility and connected external sources where authorised.",
  },
] as const;

export type BusinessBrainKnowledgeLayerId =
  (typeof BUSINESS_BRAIN_KNOWLEDGE_LAYERS)[number]["id"];

/** Metadata every indexed knowledge source should carry (P0 contract). */
export type BusinessBrainKnowledgeSourceMeta = {
  organisationId: string;
  sourceType: BusinessBrainKnowledgeLayerId | string;
  accessLevel: "owner" | "admin" | "member" | "ai" | string;
  ownerId?: string | null;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
  reference?: string;
  indexingStatus?: "pending" | "indexed" | "failed" | "skipped";
};

/** Connected context chips for the Business Brain screen. */
export const BUSINESS_BRAIN_CONNECTED_SOURCES = [
  { id: "crm", label: "CRM", href: "/apps/crm/contacts" },
  { id: "websites", label: "Website", href: "/apps/websites" },
  { id: "commerce", label: "Commerce", href: "/apps/commerce" },
  { id: "analytics", label: "Analytics", href: "/apps/analytics" },
  { id: "seo", label: "SEO", href: "/apps/seo" },
  { id: "ai-visibility", label: "AI Visibility", href: "/apps/ai-visibility" },
  { id: "reviews", label: "Reputation", href: "/apps/reviews" },
  { id: "social", label: "Social", href: "/apps/social" },
  { id: "automation", label: "Automation", href: "/apps/automation" },
  { id: "connectors", label: "Connectors", href: "/dashboard/settings/connectors" },
] as const;
