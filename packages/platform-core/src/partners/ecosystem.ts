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
import {
  BPS,
  COMMISSION_PERIOD_MONTHS,
  bpsToPercentLabel,
} from "./commercial-model";

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

/** Commercial partner roles — canonical economics. Technology/Strategic remain negotiated. */
export const PARTNER_ECOSYSTEM_ROLES = [
  {
    type: "FOUNDING_10_REFERRAL",
    label: "Founding 10 Referral",
    commercialLabel: "Founding 10 Referral",
    primaryRole: "Introduce & refer",
    acquisition: true,
    onboarding: false as const,
    technical: false as boolean | "limited" | "optional",
    economics: `${bpsToPercentLabel(BPS.FOUNDING_10_REFERRAL)} direct referral · qualifying Platform + App revenue · first ${COMMISSION_PERIOD_MONTHS} months`,
    phase: 1,
  },
  {
    type: "FOUNDING_100_REFERRAL",
    label: "Founding 100 Referral",
    commercialLabel: "Founding 100 Referrer",
    primaryRole: "Introduce & refer",
    acquisition: true,
    onboarding: false as const,
    technical: false as boolean | "limited" | "optional",
    economics: `${bpsToPercentLabel(BPS.FOUNDING_100_REFERRAL)} direct referral · qualifying Platform + App revenue · first ${COMMISSION_PERIOD_MONTHS} months`,
    phase: 1,
  },
  {
    type: "FOUNDING_1000_REFERRAL",
    label: "Founding 1,000+ Referral",
    commercialLabel: "Founding 1,000+ Referrer",
    primaryRole: "Introduce & refer",
    acquisition: true,
    onboarding: false as const,
    technical: false as boolean | "limited" | "optional",
    economics: `${bpsToPercentLabel(BPS.FOUNDING_1000_REFERRAL)} direct referral · qualifying Platform + App revenue · first ${COMMISSION_PERIOD_MONTHS} months`,
    phase: 1,
  },
  {
    type: "FOUNDING_RESELLER",
    label: "Reseller",
    commercialLabel: "Founding Acquisition Partner",
    primaryRole: "Acquire customers",
    acquisition: true,
    onboarding: false as const,
    technical: false as boolean | "limited" | "optional",
    economics: `${bpsToPercentLabel(BPS.RESELLER)} qualifying Platform + App revenue · first ${COMMISSION_PERIOD_MONTHS} months`,
    phase: 1,
  },
  {
    type: "RESELLER",
    label: "Reseller",
    commercialLabel: "Reseller",
    primaryRole: "Acquire customers",
    acquisition: true,
    onboarding: false as const,
    technical: false as boolean | "limited" | "optional",
    economics: `${bpsToPercentLabel(BPS.RESELLER)} qualifying Platform + App revenue · first ${COMMISSION_PERIOD_MONTHS} months`,
    phase: 1,
  },
  {
    type: "CHANNEL_MANAGER",
    label: "Acquisition Channel Manager",
    commercialLabel: "Acquisition Channel Manager",
    primaryRole: "Manage acquisition channel",
    acquisition: true,
    onboarding: false as const,
    technical: false as boolean | "limited" | "optional",
    economics: `${bpsToPercentLabel(BPS.CHANNEL_MANAGER_DIRECT)} own customers + ${bpsToPercentLabel(BPS.CHANNEL_MANAGER_OVERRIDE)} override on managed Acquisition Partners · first ${COMMISSION_PERIOD_MONTHS} months`,
    phase: 1,
  },
  {
    type: "IMPLEMENTATION_PARTNER",
    label: "Delivery",
    commercialLabel: "Delivery Partner",
    primaryRole: "Implement & support",
    acquisition: false,
    onboarding: true as const,
    technical: "limited" as boolean | "limited" | "optional",
    economics: "25% qualifying Professional Services + Support & Success — no Platform commission",
    phase: 2,
  },
  {
    type: "DELIVERY_CHANNEL_MANAGER",
    label: "Delivery Channel Manager",
    commercialLabel: "Delivery Channel Manager",
    primaryRole: "Manage delivery network",
    acquisition: false,
    onboarding: true as const,
    technical: "limited" as boolean | "limited" | "optional",
    economics: "25% own delivery + 5% override on managed Delivery Partners' service revenue",
    phase: 2,
  },
  {
    type: "TECHNOLOGY_PARTNER",
    label: "Technology",
    commercialLabel: "Technology Partner",
    primaryRole: "Technical capability",
    acquisition: false,
    onboarding: true as const,
    technical: true as boolean | "limited" | "optional",
    economics: "Project / service economics — negotiated",
    phase: 4,
  },
  {
    type: "STRATEGIC_PARTNER",
    label: "Strategic",
    commercialLabel: "Strategic Partner",
    primaryRole: "Strategic relationships",
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

/**
 * Delivery Partner terminology (locked):
 * - Delivery Partner — authorised to perform implementation
 * - Certified Delivery Partner — completed DigitalGate certification
 * - Active Delivery Partner — certified and currently authorised/operating
 *
 * Lifecycle: Applicant → Approved → Certified → Active
 */
export const DELIVERY_PARTNER_LIFECYCLE = [
  { id: "applicant", label: "Applicant", meaning: "Applied; not yet approved" },
  { id: "approved", label: "Approved", meaning: "Authorised as a Delivery Partner" },
  { id: "certified", label: "Certified", meaning: "Completed DigitalGate certification" },
  {
    id: "active",
    label: "Active",
    meaning: "Certified and currently authorised to deliver",
  },
] as const;

export const IMPLEMENTATION_CERT_STATUS = [
  "applicant",
  "approved",
  "certified",
  "active",
] as const;
export type ImplementationCertStatus = (typeof IMPLEMENTATION_CERT_STATUS)[number];

/** Canonical Implementation Lifecycle™ — single source: delivery-model.ts (16 stages). */
export const CUSTOMER_ONBOARDING_STAGES = IMPLEMENTATION_SOP_STAGES.map((stage) => ({
  id: stage.id,
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

/** Founding Acquisition Partners → Delivery Partners → Certification → Partner Operations → Marketplace */
export const PARTNER_ECOSYSTEM_PHASES = [
  {
    phase: 1,
    title: "Acquisition Partners",
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
    body: "Document the onboarding methodology. Applicant → Approved → Certified → Active.",
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
  "Acquisition Partners are not responsible for customer onboarding unless they separately become a Certified Delivery Partner. DigitalGate (or a Delivery Partner) delivers the customer experience.";

export function formatPartnerTechnicalLabel(
  technical: boolean | "limited" | "optional" | "some",
): string {
  if (technical === true) return "Yes";
  if (technical === false) return "No";
  if (technical === "limited" || technical === "some") return "Limited";
  if (technical === "optional") return "Partial";
  return "No";
}
