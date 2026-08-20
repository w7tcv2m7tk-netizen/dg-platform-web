/**
 * DigitalGate Industry Platform — Gen 2 lock.
 *
 * Industry App (commercial product)
 *   → Specialisation (business type)
 *   → Template (configuration: objects, pipelines, workflows, AI context)
 *
 * Implementation apps (real-estate, accommodation, …) remain installable modules
 * that map to specialisations. Do not sell five Property SKUs as five products.
 */

export type IndustryRoadmapLane = "founding" | "coming" | "future";

export type IndustrySpecialisationStatus = "live" | "rolling-out" | "soon" | "future";

export type IndustrySpecialisation = {
  id: string;
  label: string;
  /** Existing Gen 2 app id when a module already exists */
  appId?: string;
  templateId: string;
  status: IndustrySpecialisationStatus;
  summary: string;
};

export type IndustryPlatform = {
  id: string;
  label: string;
  icon: string;
  /** Commercial Industry subscription — public lock */
  price: string;
  /** One specialisation included in Industry subscription */
  includedSpecialisations: number;
  /** Optional expansion specialisations */
  additionalSpecialisationPrice: string;
  roadmap: IndustryRoadmapLane;
  summary: string;
  proposition: string;
  specialisations: IndustrySpecialisation[];
};

export const INDUSTRY_ARCHITECTURE_POSITIONING =
  "Industry Apps specialise DigitalGate around how the business operates. Choose an Industry, activate a specialisation, and DigitalGate configures workflows, objects, and AI context. One platform. One source of truth.";

export const INDUSTRY_COMMERCIAL_LOCK = {
  industryPrice: "$99/mo",
  includedSpecialisations: 1,
  additionalSpecialisationPrice: "+$29/mo",
  /** Do not market as “all Property apps for $99” */
  avoidWording: [
    "Get Real Estate, Property Management, Accommodation… for $99",
    "1 Industry App included in Starter",
    "Unlimited Industry Apps",
  ],
  say: [
    "Property Industry App — $99/mo — one connected property operating platform",
    "Activate the specialisation relevant to your business",
    "Add additional specialisations as your business evolves",
  ],
} as const;

export const INDUSTRY_LAYER_STACK = [
  { id: "core", label: "Core", body: "Universal operating infrastructure" },
  { id: "infrastructure", label: "Infrastructure", body: "Websites, domains, hosting, connectors, identity" },
  {
    id: "industry",
    label: "Industry",
    body: "Property · Services · Finance · Professional Services · Commerce · Automotive · Creator (+ future)",
  },
  { id: "specialisation", label: "Specialisation", body: "Business type within an Industry" },
  { id: "template", label: "Template", body: "Objects, fields, pipelines, workflows, automations, dashboards, AI context" },
  { id: "growth", label: "Growth", body: "Prospecting, AI Visibility, SEO, Reputation, Social, Analytics, AI Communications" },
  { id: "intelligence", label: "Intelligence", body: "Twin, Business Brain, Advisor, Health, Insights, Command Centre" },
] as const;

/** Canonical Industry Platforms — commercial packaging. */
export const INDUSTRY_PLATFORMS: IndustryPlatform[] = [
  {
    id: "property",
    label: "Property",
    icon: "🏢",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "founding",
    summary:
      "One connected property operating platform for agencies, managers, hosts and developers.",
    proposition:
      "Activate Real Estate, Property Management, Accommodation, Commercial Property or Development as your business evolves.",
    specialisations: [
      {
        id: "residential-real-estate",
        label: "Real Estate",
        appId: "real-estate",
        templateId: "real-estate-agency",
        status: "live",
        summary: "Residential sales — vendors, buyers, listings, appraisals",
      },
      {
        id: "property-management",
        label: "Property Management",
        appId: "property-management",
        templateId: "property-manager",
        status: "soon",
        summary: "Long-term rentals — owners, tenants, leases, maintenance",
      },
      {
        id: "accommodation",
        label: "Accommodation",
        appId: "accommodation",
        templateId: "short-stay",
        status: "rolling-out",
        summary: "Short-stay — bookings, guests, availability, revenue",
      },
      {
        id: "commercial-property",
        label: "Commercial Property",
        appId: "commercial",
        templateId: "commercial-property",
        status: "soon",
        summary: "Commercial sales, leasing, landlords and assets",
      },
      {
        id: "property-development",
        label: "Property Development",
        appId: "property-development",
        templateId: "property-development",
        status: "future",
        summary: "Projects, stages, lots, buyers and settlements",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: "💰",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "founding",
    summary:
      "Professional finance ecosystem — accounting first, then broking, planning, insurance and advisory.",
    proposition:
      "Do not call this Accounting. Finance is the Industry; Accounting & Bookkeeping is the first specialisation.",
    specialisations: [
      {
        id: "accounting-bookkeeping",
        label: "Accounting & Bookkeeping",
        appId: "finance",
        templateId: "accounting-practice",
        status: "soon",
        summary: "Clients, entities, tax/compliance, engagements, deadlines, document collection",
      },
      {
        id: "financial-planning",
        label: "Financial Planning",
        appId: "finance",
        templateId: "financial-planning",
        status: "soon",
        summary: "Onboarding, discovery, advice, reviews and client tasks",
      },
      {
        id: "mortgage-finance-broking",
        label: "Mortgage & Finance Broking",
        appId: "finance",
        templateId: "mortgage-broking",
        status: "soon",
        summary: "Lead → application → approval → settlement; lenders and documents",
      },
      {
        id: "insurance",
        label: "Insurance",
        appId: "finance",
        templateId: "insurance",
        status: "soon",
        summary: "Fact find → quote → policy; renewals and reviews",
      },
      {
        id: "lending-credit",
        label: "Lending & Credit",
        appId: "finance",
        templateId: "lending-credit",
        status: "future",
        summary: "Credit applications, underwriting support and portfolio tracking",
      },
      {
        id: "business-advisory",
        label: "Business Advisory",
        appId: "finance",
        templateId: "business-advisory",
        status: "soon",
        summary: "Advisory engagements, reviews, reporting and recurring cycles",
      },
      {
        id: "wealth-investment",
        label: "Wealth & Investment",
        appId: "finance",
        templateId: "wealth-investment",
        status: "future",
        summary: "Portfolio and investment client workflows",
      },
      {
        id: "superannuation",
        label: "Superannuation",
        appId: "finance",
        templateId: "superannuation",
        status: "future",
        summary: "SMSF and super administration workflows",
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: "🛠️",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "founding",
    summary: "One Services App — specialise with Service Templates (trades, cleaning, field services).",
    proposition: "Never Electrician App / Plumber App — one App + templates.",
    specialisations: [
      {
        id: "trades",
        label: "Trades",
        appId: "services",
        templateId: "general",
        status: "soon",
        summary: "Jobs, quotes, schedule — Electrical, Plumbing, HVAC and more via templates",
      },
      {
        id: "cleaning",
        label: "Cleaning",
        appId: "services",
        templateId: "cleaner",
        status: "soon",
        summary: "Commercial and residential cleaning workflows",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        appId: "services",
        templateId: "handyman",
        status: "soon",
        summary: "Maintenance and handyman jobs",
      },
      {
        id: "construction",
        label: "Construction",
        appId: "services",
        templateId: "builder",
        status: "soon",
        summary: "Builder / construction job workflows",
      },
      {
        id: "landscaping",
        label: "Landscaping",
        appId: "services",
        templateId: "landscaper",
        status: "soon",
        summary: "Landscaping and outdoor services",
      },
      {
        id: "field-services",
        label: "Field Services",
        appId: "services",
        templateId: "general",
        status: "soon",
        summary: "Physical / field service work — not knowledge-firm Professional Services",
      },
    ],
  },
  {
    id: "professional-services",
    label: "Professional Services",
    icon: "📎",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    summary:
      "Expertise, time and project firms — legal, surveying, engineering, architecture, consulting, agencies and IT. Not trades Services; accountants prefer Finance.",
    proposition:
      "Do not build Legal App or Surveying App. Professional Services → Legal / Surveying templates. Distinct from DigitalGate’s own delivery Professional Services revenue stream.",
    specialisations: [
      {
        id: "legal",
        label: "Legal",
        templateId: "legal-practice",
        status: "soon",
        summary: "Matters, deadlines, documents, time, billing, conflict checks",
      },
      {
        id: "surveying",
        label: "Surveying",
        templateId: "surveying",
        status: "soon",
        summary: "Clients, projects, site jobs, plans, schedules, field teams",
      },
      {
        id: "engineering",
        label: "Engineering",
        templateId: "engineering",
        status: "soon",
        summary: "Project-based engineering engagements",
      },
      {
        id: "architecture",
        label: "Architecture",
        templateId: "architecture",
        status: "soon",
        summary: "Architecture practices and project delivery",
      },
      {
        id: "consulting",
        label: "Consulting",
        templateId: "consulting",
        status: "soon",
        summary: "Consulting engagements, deliverables and retainers",
      },
      {
        id: "agencies",
        label: "Agencies",
        templateId: "agencies",
        status: "soon",
        summary: "Marketing and creative agencies",
      },
      {
        id: "it-technology",
        label: "IT & Technology",
        templateId: "it-technology",
        status: "soon",
        summary: "IT and technology professional firms",
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    icon: "🛒",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    summary: "Product businesses — retail, e-commerce, wholesale and distribution. Not a separate Retail App.",
    proposition: "Product → Customer → Order → Payment → Fulfilment → Review → Repeat.",
    specialisations: [
      {
        id: "retail",
        label: "Retail",
        templateId: "retail",
        status: "soon",
        summary: "Storefront and multi-location retail",
      },
      {
        id: "ecommerce",
        label: "E-commerce",
        templateId: "ecommerce",
        status: "soon",
        summary: "Online commerce and fulfilment",
      },
      {
        id: "wholesale",
        label: "Wholesale",
        templateId: "wholesale",
        status: "soon",
        summary: "B2B wholesale ordering",
      },
      {
        id: "distribution",
        label: "Distribution",
        templateId: "distribution",
        status: "future",
        summary: "Distribution and logistics-oriented commerce",
      },
    ],
  },
  {
    id: "automotive",
    label: "Automotive",
    icon: "🚗",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    summary: "Dealerships, vehicle sales, mechanical and detailing.",
    proposition: "CRM, inventory, quoting, servicing and follow-up on Core.",
    specialisations: [
      {
        id: "dealerships",
        label: "Dealerships",
        appId: "automotive",
        templateId: "dealership",
        status: "soon",
        summary: "Vehicle sales and dealership pipelines",
      },
      {
        id: "automotive-services",
        label: "Automotive Services",
        appId: "automotive",
        templateId: "automotive-services",
        status: "soon",
        summary: "Service and workshop workflows",
      },
      {
        id: "mechanical",
        label: "Mechanical",
        appId: "automotive",
        templateId: "mechanical",
        status: "soon",
        summary: "Mechanical workshop jobs",
      },
      {
        id: "detailing",
        label: "Detailing",
        appId: "automotive",
        templateId: "detailing",
        status: "soon",
        summary: "Detailing and presentation services",
      },
    ],
  },
  {
    id: "creator",
    label: "Creator",
    icon: "🎨",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    summary: "Creators, music, media and artists — lighter operational depth than Services or Finance.",
    proposition: "Audience, content, storefront and memberships.",
    specialisations: [
      {
        id: "creators",
        label: "Creators",
        appId: "creator",
        templateId: "creator",
        status: "rolling-out",
        summary: "Creator businesses and influencers",
      },
      {
        id: "music-media",
        label: "Music & Media",
        appId: "creator",
        templateId: "music-media",
        status: "soon",
        summary: "Musicians, DJs, media businesses",
      },
      {
        id: "artists",
        label: "Artists",
        appId: "creator",
        templateId: "artists",
        status: "soon",
        summary: "Artists and creative practices",
      },
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare",
    icon: "🩺",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "future",
    summary: "Medical, allied health, dental and clinics — roadmap only.",
    proposition: "Coming later. No delivery commitment yet.",
    specialisations: [
      { id: "medical", label: "Medical", templateId: "medical", status: "future", summary: "Medical practices" },
      { id: "allied-health", label: "Allied Health", templateId: "allied-health", status: "future", summary: "Allied health clinics" },
      { id: "dental", label: "Dental", templateId: "dental", status: "future", summary: "Dental practices" },
      { id: "clinics", label: "Clinics", templateId: "clinics", status: "future", summary: "Multi-practitioner clinics" },
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: "📚",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "future",
    summary: "Training, education providers, coaching and schools — roadmap only.",
    proposition: "Coming later. No delivery commitment yet.",
    specialisations: [
      { id: "training", label: "Training", templateId: "training", status: "future", summary: "Training providers" },
      { id: "education-providers", label: "Education Providers", templateId: "education-providers", status: "future", summary: "Education organisations" },
      { id: "coaching", label: "Coaching", templateId: "coaching", status: "future", summary: "Coaching businesses" },
      { id: "schools", label: "Schools", templateId: "schools", status: "future", summary: "Schools and campuses" },
    ],
  },
  {
    id: "hospitality",
    label: "Hospitality",
    icon: "🍽️",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "future",
    summary: "Restaurants, cafés, bars and venues — Accommodation stays under Property.",
    proposition: "Do not put Accommodation here. Property owns short-stay.",
    specialisations: [
      { id: "restaurants", label: "Restaurants", templateId: "restaurants", status: "future", summary: "Restaurant operations" },
      { id: "cafes", label: "Cafés", templateId: "cafes", status: "future", summary: "Café operations" },
      { id: "venues", label: "Venues", templateId: "venues", status: "future", summary: "Venues and events spaces" },
      { id: "hospitality-groups", label: "Hospitality Groups", templateId: "hospitality-groups", status: "future", summary: "Multi-venue groups" },
    ],
  },
];

export function getIndustryPlatform(id: string): IndustryPlatform | undefined {
  return INDUSTRY_PLATFORMS.find((p) => p.id === id);
}

export function getIndustryPlatformsByRoadmap(lane: IndustryRoadmapLane): IndustryPlatform[] {
  return INDUSTRY_PLATFORMS.filter((p) => p.roadmap === lane);
}

/** Map a Gen 2 app install id → Industry Platform + specialisation. */
export function resolveIndustryFromAppId(appId: string): {
  platform: IndustryPlatform;
  specialisation: IndustrySpecialisation;
} | null {
  for (const platform of INDUSTRY_PLATFORMS) {
    const specialisation = platform.specialisations.find((s) => s.appId === appId);
    if (specialisation) return { platform, specialisation };
  }
  return null;
}

/** Billing / plan picker: Industry Platforms customers purchase (not every specialisation SKU). */
export const BILLABLE_INDUSTRY_PLATFORMS = INDUSTRY_PLATFORMS.filter(
  (p) => p.roadmap === "founding" || p.roadmap === "coming",
);

export type FinanceTemplateKey =
  | "accounting-practice"
  | "financial-planning"
  | "mortgage-broking"
  | "insurance"
  | "lending-credit"
  | "business-advisory"
  | "wealth-investment"
  | "superannuation";

export const FINANCE_TEMPLATES: Array<{
  key: FinanceTemplateKey;
  label: string;
  configures: string[];
}> = [
  {
    key: "accounting-practice",
    label: "Accounting & Bookkeeping",
    configures: [
      "Clients",
      "Entities",
      "Engagements",
      "Compliance",
      "Financial periods",
      "Document requests",
      "Deadlines",
      "Staff workflows",
      "Client portal",
    ],
  },
  {
    key: "financial-planning",
    label: "Financial Planning",
    configures: ["Onboarding", "Discovery", "Advice", "Reviews", "Documents", "Client tasks"],
  },
  {
    key: "mortgage-broking",
    label: "Mortgage & Finance Broking",
    configures: [
      "Lead → Settlement pipeline",
      "Lenders",
      "Document collection",
      "Referrals",
      "Follow-up",
    ],
  },
  {
    key: "insurance",
    label: "Insurance",
    configures: ["Fact find", "Quotes", "Policies", "Renewals", "Reviews"],
  },
  {
    key: "business-advisory",
    label: "Business Advisory",
    configures: ["Engagements", "Projects", "Reviews", "Reporting", "Recurring advisory"],
  },
  {
    key: "lending-credit",
    label: "Lending & Credit",
    configures: ["Applications", "Underwriting support", "Portfolio"],
  },
  {
    key: "wealth-investment",
    label: "Wealth & Investment",
    configures: ["Portfolios", "Reviews", "Client communications"],
  },
  {
    key: "superannuation",
    label: "Superannuation",
    configures: ["SMSF admin", "Compliance", "Documents"],
  },
];

export type ProfessionalServicesTemplateKey =
  | "legal-practice"
  | "surveying"
  | "engineering"
  | "architecture"
  | "consulting"
  | "agencies"
  | "it-technology";

export const PROFESSIONAL_SERVICES_TEMPLATES: Array<{
  key: ProfessionalServicesTemplateKey;
  label: string;
  configures: string[];
}> = [
  {
    key: "legal-practice",
    label: "Legal Practice",
    configures: [
      "Matters",
      "Clients & contacts",
      "Matter stages",
      "Tasks & deadlines",
      "Documents",
      "Appointments",
      "Time tracking",
      "Billing",
      "Client communications",
      "Conflict checks",
      "AI document intelligence",
    ],
  },
  {
    key: "surveying",
    label: "Surveying",
    configures: [
      "Clients",
      "Projects",
      "Site jobs",
      "Quotes",
      "Scheduling",
      "Field teams",
      "Documents & plans",
      "Milestones",
      "Invoicing",
      "Compliance",
      "Recurring workflows",
    ],
  },
  {
    key: "engineering",
    label: "Engineering",
    configures: ["Projects", "Engagements", "Deliverables", "Documents", "Milestones", "Billing"],
  },
  {
    key: "architecture",
    label: "Architecture",
    configures: ["Projects", "Clients", "Drawings/files", "Milestones", "Approvals", "Billing"],
  },
  {
    key: "consulting",
    label: "Consulting",
    configures: ["Engagements", "Projects", "Deliverables", "Retainers", "Time", "Reporting"],
  },
  {
    key: "agencies",
    label: "Agencies",
    configures: ["Clients", "Campaigns/projects", "Retainers", "Deliverables", "Billing"],
  },
  {
    key: "it-technology",
    label: "IT & Technology",
    configures: ["Clients", "Projects", "Tickets/engagements", "Documents", "Retainers", "Billing"],
  },
];

/** Classify a business into an Industry Platform — product rule of thumb. */
export const INDUSTRY_CLASSIFICATION_RULES = [
  { primarily: "Selling or managing property / stays", industryId: "property" },
  { primarily: "Managing physical or field service work", industryId: "services" },
  { primarily: "Managing money / financial relationships", industryId: "finance" },
  { primarily: "Selling expertise, time or professional projects", industryId: "professional-services" },
  { primarily: "Selling products", industryId: "commerce" },
  { primarily: "Selling or servicing vehicles", industryId: "automotive" },
  { primarily: "Creating intellectual / media output", industryId: "creator" },
] as const;

export const TEMPLATE_CONFIGURES = [
  "Navigation",
  "Objects & fields",
  "Pipelines",
  "Automations",
  "Forms",
  "Documents",
  "Dashboards",
  "AI context",
  "Terminology",
  "Permissions",
  "Reporting",
] as const;
