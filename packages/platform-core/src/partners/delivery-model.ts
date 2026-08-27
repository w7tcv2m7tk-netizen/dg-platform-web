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
    role: "2 × Founding Resellers",
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

export const IMPLEMENTATION_SOP_STAGES = [
  { n: "01", title: "Customer acceptance", body: "Customer accepted into Founding 10 / DigitalGate." },
  { n: "02", title: "Agreement", body: "Agreement signed." },
  { n: "03", title: "Kick-off", body: "Implementation Lead + DigitalGate + customer." },
  { n: "04", title: "Discovery", body: "Business, team, systems, goals, pain points, data, integrations, priorities." },
  { n: "05", title: "Business setup", body: "Organisation, Business Profile, team, permissions, foundation." },
  { n: "06", title: "Data migration", body: "Migration, validation and reconciliation." },
  { n: "07", title: "Connector setup", body: "Website, domains, email, Google, Stripe, Xero, social and other systems." },
  { n: "08", title: "App configuration", body: "Activate only what the customer actually needs." },
  { n: "09", title: "AI / Business Brain setup", body: "Knowledge, context, permissions, authorised tools, business-specific instructions." },
  { n: "10", title: "Automation", body: "Workflows, routing, notifications, follow-up." },
  { n: "11", title: "Testing", body: "End-to-end validation before go-live." },
  { n: "12", title: "Staff training", body: "Administrators and staff." },
  { n: "13", title: "Go-live", body: "Customer begins operating through DigitalGate." },
  { n: "14", title: "30-day review", body: "Adoption, usage, problems, opportunities, additional Apps." },
  { n: "15", title: "Handover to ongoing support", body: "Move into normal DigitalGate support and optimisation." },
] as const;

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
