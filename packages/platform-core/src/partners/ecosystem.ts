/**
 * DigitalGate Partner Ecosystem — commercial lock.
 * Resellers introduce. Implementation partners onboard. DigitalGate owns the platform and customer relationship.
 * Do not collapse these into a generic “reseller” role.
 */

import { IMPLEMENTATION_SOP_STAGES } from "./delivery-model";

export const PARTNER_ECOSYSTEM_POSITIONING =
  "DigitalGate owns the platform, methodology, standards and customer relationship. Certified partners extend DigitalGate's ability to deliver that platform.";

export const PARTNER_ECOSYSTEM_LAYERS = [
  {
    id: "acquisition",
    title: "Acquisition",
    role: "Resellers",
    body: "Bring customers through trusted introductions.",
  },
  {
    id: "implementation",
    title: "Implementation",
    role: "Certified Delivery Partners",
    body: "Get customers live — configuration, migration, training.",
  },
  {
    id: "specialists",
    title: "Specialists",
    role: "Certified Specialists",
    body: "Solve specific technical or industry requirements.",
  },
  {
    id: "success",
    title: "Success",
    role: "Customer Success Partners",
    body: "Help customers get value after go-live — reviews and optimisation.",
  },
  {
    id: "platform",
    title: "DigitalGate",
    role: "Platform + AI + Infrastructure + Product",
    body: "Own the underlying technology, methodology, support and customer relationship.",
  },
] as const;

export const PARTNER_ECOSYSTEM_ROLES = [
  {
    type: "FOUNDING_RESELLER",
    label: "Founding Reseller",
    primaryRole: "Introduce & refer",
    acquisition: true,
    onboarding: "optional",
    technical: false,
    economics: "Recurring commission on qualifying Platform + App fees",
    phase: 1,
  },
  {
    type: "IMPLEMENTATION_PARTNER",
    label: "Delivery Partner",
    primaryRole: "Setup & onboarding",
    acquisition: false,
    onboarding: true,
    technical: "some",
    economics: "Implementation project fees + optional recurring optimisation",
    phase: 2,
  },
  {
    type: "TECHNOLOGY_PARTNER",
    label: "Technology Partner",
    primaryRole: "Integrations & technical services",
    acquisition: false,
    onboarding: true,
    technical: true,
    economics: "Project / service revenue",
    phase: 4,
  },
  {
    type: "STRATEGIC_PARTNER",
    label: "Strategic Partner",
    primaryRole: "Larger relationships / industry",
    acquisition: true,
    onboarding: "optional",
    technical: "optional",
    economics: "Negotiated",
    phase: 4,
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

export const PARTNER_ECOSYSTEM_PHASES = [
  {
    phase: 1,
    title: "Founding Reseller Programme",
    body: "Get the first two partners operating. Invitation only. 3–5 highly qualified introducers.",
    now: true,
  },
  {
    phase: 2,
    title: "Founding Delivery Partners",
    body: "Recruit 2–3 excellent people — not 20. Certification is meaningful.",
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
    title: "Partner operations dashboard",
    body: "Leads, referrals, customers, implementation projects, commissions, tasks, certification, performance.",
    now: false,
  },
  {
    phase: 5,
    title: "Partner Marketplace",
    body: "Customers can discover certified partners for implementation help.",
    now: false,
  },
] as const;

export const FOUNDING_IMPLEMENTATION_TARGET = 3;

export const RESELLER_DOES_NOT_ONBOARD =
  "Founding Resellers are not responsible for customer onboarding unless they separately become a Certified Delivery Partner. DigitalGate (or an Delivery Partner) delivers the customer experience.";
