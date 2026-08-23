/**
 * Business Brain knowledge layers — conceptual + metadata contract.
 * @see docs/foundations/CONNECTED-BUSINESS-IMPLEMENTATION.md
 */

export const BUSINESS_BRAIN_KNOWLEDGE_LAYERS = [
  {
    id: "platform",
    label: "Platform Knowledge",
    summary:
      "How DigitalGate works — official product docs (staff: Platform Docs). Not the customer’s business knowledge.",
  },
  {
    id: "business",
    label: "Business Knowledge",
    summary:
      "How this organisation works — plans, SOPs, brand, pricing, policies and uploaded documents.",
  },
  {
    id: "live",
    label: "Live Business Context",
    summary: "What is happening now — contacts, pipeline, revenue, tasks, reviews and Twin signals.",
  },
  {
    id: "external",
    label: "External Intelligence",
    summary: "Industry, market, search, AI visibility and connected external sources where authorised.",
  },
] as const;

/** Future layer — personal/team preferences and role-specific instructions (not built yet). */
export const BUSINESS_BRAIN_PERSONAL_KNOWLEDGE_LAYER = {
  id: "personal",
  label: "Personal / team knowledge",
  summary: "User preferences, role responsibilities and team-specific procedures — reserved for later.",
} as const;

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
