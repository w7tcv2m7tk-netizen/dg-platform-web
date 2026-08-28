/**
 * DigitalGate Delivery Operating Model — lean formal lock.
 * Hub-and-spoke: Ben closes, resellers introduce, Implementation Lead owns delivery standard,
 * Delivery Team provides scalable capacity. Customer relationship stays with DigitalGate.
 */

export const DELIVERY_MODEL_POSITIONING =
  "Powered by DigitalGate — not the customer's de facto software provider. DigitalGate owns account, subscription, platform, data, product, support and AI infrastructure.";

export const COMMERCIAL_ENGINE = [
  {
    stage: "Resellers",
    body: "Create opportunities through trusted introductions.",
  },
  {
    stage: "Ben / DigitalGate",
    body: "Qualify and close. Ben remains the closer initially.",
  },
  {
    stage: "Implementation",
    body: "Get customers live — configuration, migration, training, Business Brain.",
  },
  {
    stage: "Customer Success",
    body: "Drive adoption — reviews, optimisation, expansion readiness.",
  },
  {
    stage: "DigitalGate Platform",
    body: "Continuously creates more value across Apps, automation and AI.",
  },
  {
    stage: "Upsell / expansion",
    body: "More Apps, automation, AI, services and usage.",
  },
] as const;

export const DIGITALGATE_TEAM_STRUCTURE = [
  {
    role: "Ben — Founder / Platform Architect",
    responsibilities: [
      "Product vision and platform",
      "Sales and closing",
      "Strategic partnerships",
      "Key customer relationships",
      "Commercial decisions",
    ],
  },
  {
    role: "2 × Founding Acquisition Partners",
    responsibilities: [
      "Identify prospects",
      "Make introductions",
      "Generate qualified opportunities",
      "Participate in initial conversations where appropriate",
      "Ben remains the closer initially",
    ],
  },
  {
    role: "Head of Implementation (Delivery Partner Lead)",
    responsibilities: [
      "Heads the DigitalGate Implementation function",
      "Owns onboarding methodology",
      "Oversees implementation projects",
      "Handles technical/configuration requirements",
      "Develops implementation documentation and standards",
      "Coordinates outsourced delivery resources",
      "Quality-control layer between DigitalGate and delivery capacity",
    ],
  },
  {
    role: "DigitalGate Delivery Team (internal / outsourced capacity)",
    internalName: "DigitalGate Delivery Team",
    publicName: "Powered by DigitalGate",
    responsibilities: [
      "Additional configuration",
      "Data migration",
      "Website / connectors",
      "CRM setup",
      "Automation",
      "Testing",
      "Documentation",
      "Training support",
    ],
  },
] as const;

export const DELIVERY_CHAIN =
  "Customer → DigitalGate → Head of Implementation → Delivery Team";

export const DELIVERY_CHAIN_AVOID =
  "Customer → random outsourced developer";

export const IMPLEMENTATION_LEAD_FIRST_MANDATE =
  "Build the DigitalGate Implementation System — not only onboard customers. Create the standard operating procedure so every future customer follows the same framework.";

/**
 * DigitalGate Implementation Lifecycle™ — canonical 16-stage model.
 * Single source for Partners Onboarding, Delivery dashboard, pipeline and plans.
 * Do not maintain a parallel 15-stage SOP.
 */
export const IMPLEMENTATION_LIFECYCLE_NAME = "DigitalGate Implementation Lifecycle™";

export const IMPLEMENTATION_SOP_STAGES = [
  {
    id: "accepted",
    n: "01",
    title: "Customer Acceptance",
    body: "Customer formally accepted into DigitalGate and ready to enter implementation.",
  },
  {
    id: "agreement",
    n: "02",
    title: "Agreement",
    body: "Commercial and implementation agreement completed.",
  },
  {
    id: "kickoff",
    n: "03",
    title: "Kick-off",
    body: "Implementation Lead, DigitalGate team and customer establish the implementation plan, responsibilities and timeline.",
  },
  {
    id: "discovery",
    n: "04",
    title: "Discovery",
    body: "Understand the business, team, systems, goals, pain points, data, integrations and priorities.",
  },
  {
    id: "business_setup",
    n: "05",
    title: "Business Setup",
    body: "Configure Organisation, Business Profile, users, permissions and platform foundation.",
  },
  {
    id: "data_migration",
    n: "06",
    title: "Data Migration",
    body: "Migrate required customer data, then validate and reconcile the imported information.",
  },
  {
    id: "connector_setup",
    n: "07",
    title: "Connector Setup",
    body: "Connect and validate websites, domains, email, Google, Stripe, Xero, social platforms and other required systems.",
  },
  {
    id: "app_config",
    n: "08",
    title: "Apps & Configuration",
    body: "Activate and configure only the Core, Industry and Growth Apps the customer actually needs.",
  },
  {
    id: "business_brain",
    n: "09",
    title: "AI / Business Brain",
    body: "Configure business knowledge, context, permissions, authorised tools and business-specific instructions.",
  },
  {
    id: "automation",
    n: "10",
    title: "Automation",
    body: "Configure workflows, routing, notifications, follow-up and other required automations.",
  },
  {
    id: "testing",
    n: "11",
    title: "Testing",
    body: "Perform functional, integration and workflow testing across the configured platform.",
  },
  {
    id: "training",
    n: "12",
    title: "Training",
    body: "Train administrators and staff on the workflows and systems they will use.",
  },
  {
    id: "qa",
    n: "13",
    title: "QA",
    body: "Complete final implementation quality assurance, resolve outstanding issues and confirm the customer is ready for go-live.",
  },
  {
    id: "go_live",
    n: "14",
    title: "Go-Live",
    body: "Customer begins operating through DigitalGate in production.",
  },
  {
    id: "review_30",
    n: "15",
    title: "30-Day Review",
    body: "Review adoption, usage, goals, issues, opportunities, feature requirements and potential App expansion.",
  },
  {
    id: "customer_success",
    n: "16",
    title: "Customer Success",
    body: "Transition the customer into ongoing DigitalGate support, optimisation, account management and continuous improvement.",
  },
] as const;

/** Pipeline / kanban ids — same order as IMPLEMENTATION_SOP_STAGES. */
export const DELIVERY_PIPELINE_STAGES = IMPLEMENTATION_SOP_STAGES.map((stage) => ({
  id: stage.id,
  title: stage.title,
}));

export const IMPLEMENTATION_PACKAGES = [
  {
    id: "launch",
    name: "DigitalGate Launch",
    audience: "Straightforward businesses",
    includes: [
      "Business setup",
      "Team",
      "Core configuration",
      "Basic connectors",
      "Basic CRM",
      "Training",
      "Go-live",
    ],
    publish: false,
  },
  {
    id: "growth",
    name: "DigitalGate Growth",
    audience: "Businesses migrating from multiple systems",
    includes: [
      "Everything in Launch",
      "Data migration",
      "CRM configuration",
      "Automation",
      "Website integration",
      "AI configuration",
      "Advanced connectors",
      "Staff training",
    ],
    publish: false,
  },
  {
    id: "enterprise",
    name: "DigitalGate Enterprise",
    audience: "Complex businesses",
    includes: [
      "Everything in Growth",
      "Complex migrations",
      "Custom workflows",
      "Multiple teams",
      "Advanced integrations",
      "Custom development",
      "Extensive training",
      "Ongoing optimisation",
    ],
    publish: false,
  },
] as const;

export const IMPLEMENTATION_PACKAGES_NOTE =
  "Internal scoping and pricing only — not published packages yet. Prevents every customer becoming a custom project.";

export const BUSINESS_BRAIN_ONBOARDING = {
  proposition:
    "During onboarding, build the customer's Digital Business Brain — not only configure software.",
  dimensions: [
    {
      name: "Business",
      items: ["Business plan", "Company information", "Brand", "Strategy", "Goals"],
    },
    {
      name: "People",
      items: ["Team", "Roles", "Responsibilities", "Contacts"],
    },
    {
      name: "Operations",
      items: ["SOPs", "Processes", "Workflows", "Policies"],
    },
    {
      name: "Commercial",
      items: ["Products", "Services", "Pricing", "Sales processes"],
    },
    {
      name: "Knowledge",
      items: ["Documents", "FAQs", "Training material", "Internal knowledge"],
    },
    {
      name: "Technology",
      items: ["Existing software", "Connectors", "Websites", "Domains", "Data sources"],
    },
    {
      name: "AI",
      items: [
        "Knowledge",
        "Context",
        "Permissions",
        "Approved tools",
        "Business-specific instructions",
      ],
    },
  ],
  surfaces: [
    "Overview",
    "Command Centre",
    "Advisor",
    "Business Health",
    "AI Communications",
    "CRM",
    "Automation",
  ],
} as const;

export const DELIVERY_CAPACITY_PHASES = [
  {
    scale: "2–5 customers",
    body: "Head of Implementation can manage almost everything directly.",
  },
  {
    scale: "10–20 customers",
    body: "Lead delegates defined implementation tasks to the Delivery Team.",
  },
  {
    scale: "50+ customers",
    body: "Delivery Team specialises — Migration, CRM, Web, Automation, AI, QA, Training. Lead manages the DigitalGate implementation standard.",
  },
] as const;

export const DIGITALGATE_OWNS = [
  "Account",
  "Subscription",
  "Platform",
  "Customer data",
  "Product relationship",
  "Support relationship",
  "Platform roadmap",
  "AI infrastructure",
] as const;

export const PARTNER_DELIVERY_OWNS = [
  "Implementation",
  "Configuration",
  "Training",
  "Professional services",
  "Specialist work",
] as const;

export const DELIVERY_MODEL_ACTIVE_NOW =
  "Partner + Implementation architecture is part of the DigitalGate operating model now — not something to build later.";
