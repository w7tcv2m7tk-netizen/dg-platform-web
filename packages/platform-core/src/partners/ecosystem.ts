/**
 * DigitalGate Partner Ecosystem — commercial lock.
 * Resellers introduce. Implementation partners onboard. DigitalGate owns the platform and customer relationship.
 * Do not collapse these into a generic “reseller” role.
 */

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
    role: "Certified Implementation Partners",
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
    label: "Implementation Partner",
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
  "DigitalGate provides the platform. Certified Implementation Partners help businesses implement it.";

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
    owner: "Implementation Partner",
    body: "Configuration + migration + training + implementation",
  },
  {
    owner: "Customer",
    body: "Business decisions + information + adoption",
  },
] as const;

export const IMPLEMENTATION_CERTIFICATION_NAME =
  "DigitalGate Certified Implementation Partner";

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

export const CUSTOMER_ONBOARDING_STAGES = [
  {
    id: "accepted",
    n: "01",
    title: "Accepted",
    body: "Customer accepted into Founding 10 / DigitalGate.",
  },
  {
    id: "agreement",
    n: "02",
    title: "Agreement",
    body: "Agreement signed.",
  },
  {
    id: "kickoff",
    n: "03",
    title: "Kick-off",
    body: "Implementation Partner + DigitalGate + customer.",
  },
  {
    id: "discovery",
    n: "04",
    title: "Discovery",
    body: "Business, team, existing systems, goals, pain points, data, integrations, priorities.",
  },
  {
    id: "plan",
    n: "05",
    title: "Implementation plan",
    body: "What gets migrated, connected, configured, built, trained — and what is deferred.",
  },
  {
    id: "foundation",
    n: "06",
    title: "Foundation",
    body: "Organisation, Business Profile, team, permissions, Digital Twin, goals.",
  },
  {
    id: "data",
    n: "07",
    title: "Data",
    body: "Migration and validation.",
  },
  {
    id: "connections",
    n: "08",
    title: "Connections",
    body: "Website, domains, email, Google, Stripe, Xero, social and other systems.",
  },
  {
    id: "apps",
    n: "09",
    title: "Apps",
    body: "Activate only what the customer actually needs.",
  },
  {
    id: "intelligence",
    n: "10",
    title: "Automation & AI",
    body: "Configure the intelligent layer.",
  },
  {
    id: "training",
    n: "11",
    title: "Training",
    body: "Train administrators and staff.",
  },
  {
    id: "go_live",
    n: "12",
    title: "Go-live",
    body: "Customer begins operating through DigitalGate.",
  },
  {
    id: "review_30",
    n: "13",
    title: "30-day review",
    body: "Adoption, usage, problems, opportunities, additional Apps, automation.",
  },
  {
    id: "handover",
    n: "14",
    title: "Handover / Success",
    body: "Move into normal DigitalGate support and ongoing optimisation.",
  },
] as const;

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
    title: "Founding Implementation Partners",
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
  "Founding Resellers are not responsible for customer onboarding unless they separately become a Certified Implementation Partner. DigitalGate (or an Implementation Partner) delivers the customer experience.";
