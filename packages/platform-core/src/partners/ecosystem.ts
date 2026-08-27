/**
 * DigitalGate Partner Ecosystem — canonical architecture lock.
 *
 * Do not collapse Resellers, Delivery Partners, Technology Partners, Strategic Partners,
 * Specialists or Customer Success into a generic partner type.
 * Keep DigitalGate’s own Sales / Growth Engine completely separate from the Partner ecosystem.
 *
 * Model: Partner → Type → Capabilities → Certification → Referrals → Customers →
 * Implementation → Success → Revenue/Commission
 *
 * A partner may hold multiple capabilities/certifications; the partner record stays one entity.
 * DigitalGate remains platform owner, methodology owner and customer relationship owner.
 */

import { IMPLEMENTATION_SOP_STAGES } from "./delivery-model";

/** Strengthened ownership principle — channel partners never own the customer. */
export const PARTNER_ECOSYSTEM_POSITIONING =
  "DigitalGate owns the platform, product roadmap, methodology, standards and customer relationship. Partners extend DigitalGate's ability to acquire, implement and optimise the platform.";

/**
 * Visual centrepiece — who does what in the ecosystem.
 * Not the same as commercial Partner Types (see PARTNER_ECOSYSTEM_ROLES).
 */
export const PARTNER_ECOSYSTEM_HIERARCHY = [
  {
    id: "platform",
    title: "DigitalGate",
    role: "Platform owner",
    body: "Platform, product roadmap, methodology, standards, support and customer relationship.",
  },
  {
    id: "acquisition",
    title: "Reseller",
    role: "Acquisition",
    body: "Bring customers through trusted introductions. They introduce; Ben closes.",
  },
  {
    id: "implementation",
    title: "Delivery Partner",
    role: "Implementation",
    body: "Get customers live — configuration, migration, training and handover.",
  },
  {
    id: "expertise",
    title: "Specialist",
    role: "Expertise",
    body: "Solve specific technical or industry requirements (capability / certification).",
  },
  {
    id: "optimisation",
    title: "Customer Success",
    role: "Optimisation",
    body: "Help customers get value after go-live — reviews and optimisation (capability / role).",
  },
] as const;

/**
 * @deprecated Prefer PARTNER_ECOSYSTEM_HIERARCHY for display.
 * Kept for deep imports.
 */
export const PARTNER_ECOSYSTEM_LAYERS = PARTNER_ECOSYSTEM_HIERARCHY.map((h) => ({
  id: h.id,
  title: h.title,
  role: h.role,
  body: h.body,
}));

/** Commercial partner types — four only. Do not add Success/Specialist as fifth/sixth types. */
export const PARTNER_ECOSYSTEM_ROLES = [
  {
    type: "FOUNDING_RESELLER",
    label: "Reseller",
    commercialLabel: "Founding Reseller",
    primaryRole: "Introduce & refer",
    acquisition: true,
    onboarding: "optional" as const,
    technical: false as boolean | "limited" | "optional",
    economics: "Recurring commission on qualifying Platform + App fees",
    phase: 1,
  },
  {
    type: "IMPLEMENTATION_PARTNER",
    label: "Delivery",
    commercialLabel: "Delivery Partner",
    primaryRole: "Setup & onboarding",
    acquisition: false,
    onboarding: true as const,
    technical: "limited" as boolean | "limited" | "optional",
    economics: "Implementation project fees + optional recurring optimisation",
    phase: 2,
  },
  {
    type: "TECHNOLOGY_PARTNER",
    label: "Technology",
    commercialLabel: "Technology Partner",
    primaryRole: "Integrations & technical services",
    acquisition: false,
    onboarding: true as const,
    technical: true as boolean | "limited" | "optional",
    economics: "Project / service revenue",
    phase: 4,
  },
  {
    type: "STRATEGIC_PARTNER",
    label: "Strategic",
    commercialLabel: "Strategic Partner",
    primaryRole: "Larger relationships / industry",
    acquisition: true,
    onboarding: "optional" as const,
    technical: "optional" as boolean | "limited" | "optional",
    economics: "Negotiated",
    phase: 4,
  },
] as const;

/**
 * Capabilities / roles a partner may hold — not separate commercial partner types.
 * A single partner record can carry multiple capabilities over time.
 */
export const PARTNER_CAPABILITIES = [
  {
    id: "acquisition",
    title: "Acquisition",
    body: "Introduce and qualify businesses for DigitalGate.",
  },
  {
    id: "implementation",
    title: "Implementation",
    body: "Configure, migrate, train and take customers live.",
  },
  {
    id: "technical",
    title: "Technical",
    body: "Integrations, connectors and deeper technical services.",
  },
  {
    id: "specialist",
    title: "Specialist",
    body: "Certified depth in CRM, AI, automation, websites or an industry pack.",
  },
  {
    id: "customer_success",
    title: "Customer Success",
    body: "Post go-live reviews, optimisation and ongoing value.",
  },
] as const;

export const IMPLEMENTATION_PARTNER_PROPOSITION =
  "DigitalGate provides the platform. Certified Delivery Partners help businesses implement it.";

export const IMPLEMENTATION_SCOPE = {
  businessSetup: [
    "Business Profile",
    "Team members",
    "Roles and permissions",
    "Business information",
    "Digital Twin setup",
    "Goals",
    "Initial configuration",
  ],
  dataMigration: [
    "Contacts",
    "Companies",
    "Opportunities",
    "Products",
    "Customers",
    "Documents",
    "Historical information",
  ],
  crmSetup: [
    "Pipelines",
    "Stages",
    "Fields",
    "Tags",
    "Lead sources",
    "Tasks",
    "Workflows",
  ],
  website: [
    "Connect existing website",
    "DNS",
    "Domains",
    "Forms",
    "Tracking",
    "Analytics",
    "Website integration",
  ],
  integrations: [
    "Google",
    "Meta",
    "Stripe",
    "Xero",
    "WordPress",
    "Email",
    "Calendar",
    "Other connectors",
  ],
  automation: [
    "Lead routing",
    "Notifications",
    "Follow-up",
    "Email sequences",
    "Tasks",
    "Internal workflows",
  ],
  ai: [
    "Business knowledge",
    "Business Brain",
    "Knowledge Base",
    "AI Communications",
    "AI configuration",
    "AI prompts/context",
    "AI visibility setup",
  ],
  training: [
    "Admin training",
    "Staff training",
    "CRM training",
    "Workflow training",
    "AI training",
  ],
} as const;

export const DELIVERY_LAYERS = [
  {
    owner: "DigitalGate",
    body: "Platform + architecture + support + product",
  },
  {
    owner: "Delivery Partner",
    body: "Configuration + migration + training + implementation",
  },
  {
    owner: "Customer",
    body: "Business decisions + information + adoption",
  },
] as const;

export const IMPLEMENTATION_CERTIFICATION_NAME =
  "DigitalGate Certified Delivery Partner";

export const IMPLEMENTATION_CERT_MODULES = [
  "DigitalGate architecture",
  "Business setup",
  "Core platform",
  "CRM",
  "Apps",
  "Connectors",
  "Data migration",
  "Automation",
  "AI",
  "Security",
  "Customer onboarding",
  "Troubleshooting",
  "Go-live",
  "Handover",
] as const;

export const IMPLEMENTATION_CERT_STATUS = ["certified", "approved", "active"] as const;
export type ImplementationCertStatus = (typeof IMPLEMENTATION_CERT_STATUS)[number];

const ONBOARDING_STAGE_IDS = [
  "accepted",
  "agreement",
  "kickoff",
  "discovery",
  "business_setup",
  "data_migration",
  "connector_setup",
  "app_config",
  "business_brain",
  "automation",
  "testing",
  "training",
  "go_live",
  "review_30",
  "handover",
] as const;

/** Standard 15-stage implementation SOP — single source: delivery-model.ts */
export const CUSTOMER_ONBOARDING_STAGES = IMPLEMENTATION_SOP_STAGES.map((stage, i) => ({
  id: ONBOARDING_STAGE_IDS[i]!,
  n: stage.n,
  title: stage.title,
  body: stage.body,
}));

export const IMPLEMENTATION_FEE_BANDS = [
  {
    name: "Basic",
    range: "$750–$1,500",
    note: "Foundation setup for a simple organisation.",
  },
  {
    name: "Standard",
    range: "$1,500–$3,500",
    note: "CRM, key connections, training.",
  },
  {
    name: "Advanced",
    range: "$3,500–$7,500+",
    note: "Migration, multiple Apps, automation and AI.",
  },
] as const;

export const IMPLEMENTATION_FEE_DISCLAIMER =
  "Illustrative bands only — not published pricing. Implementation is a separate commercial activity from reseller commission. Customers may self-implement or pay for implementation.";

/** Specialist tracks = certifications / capabilities — not separate partner types. */
export const CERTIFIED_SPECIALIST_TRACKS = [
  {
    id: "crm",
    name: "DigitalGate CRM Specialist",
    body: "CRM, pipelines, contacts, opportunities, workflows.",
  },
  {
    id: "ai",
    name: "DigitalGate AI Specialist",
    body: "AI, Business Brain, AI Communications, AI Visibility.",
  },
  {
    id: "automation",
    name: "DigitalGate Automation Specialist",
    body: "Automation, workflows, triggers, integrations.",
  },
  {
    id: "website",
    name: "DigitalGate Website Specialist",
    body: "Websites, funnels, forms, domains, DNS.",
  },
  {
    id: "industry",
    name: "DigitalGate Industry Specialist",
    body: "Industry packs — e.g. Real Estate across the property ecosystem.",
  },
] as const;

/** Founding Resellers → Delivery Partners → Certification → Partner Operations → Marketplace */
export const PARTNER_ECOSYSTEM_PHASES = [
  {
    phase: 1,
    title: "Founding Resellers",
    body: "Get the first two partners operating. Invitation only. 3–5 highly qualified introducers.",
    now: true,
  },
  {
    phase: 2,
    title: "Delivery Partners",
    body: "Recruit 2–3 excellent people — not 20. Prove the implementation operating model.",
    now: true,
  },
  {
    phase: 3,
    title: "Certification",
    body: "Document the onboarding methodology. Certified → Approved → Active.",
    now: false,
  },
  {
    phase: 4,
    title: "Partner Operations",
    body: "Leads, referrals, customers, implementation projects, commissions, tasks, certification, performance.",
    now: false,
  },
  {
    phase: 5,
    title: "Partner Marketplace",
    body: "Customers discover certified partners for implementation help — only after the operating model is proven.",
    now: false,
  },
] as const;

export const FOUNDING_IMPLEMENTATION_TARGET = 3;

export const RESELLER_DOES_NOT_ONBOARD =
  "Founding Resellers are not responsible for customer onboarding unless they separately become a Certified Delivery Partner. DigitalGate (or a Delivery Partner) delivers the customer experience.";

export function formatPartnerTechnicalLabel(
  technical: boolean | "limited" | "optional" | "some",
): string {
  if (technical === true) return "Yes";
  if (technical === false) return "No";
  if (technical === "limited" || technical === "some") return "Limited";
  if (technical === "optional") return "Partial";
  return "No";
}
