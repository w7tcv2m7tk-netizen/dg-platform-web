/**
 * DigitalGate Industry Platform — Gen 2 lock (August 2026).
 *
 * Industry App = broad commercial vertical ($99/mo)
 * Template = specialised business model within that vertical
 *
 * Do not add new top-level Industry Apps for every business type —
 * add a Template under one of these twelve verticals.
 */

export type IndustryRoadmapLane =
  | "available"
  | "early-access"
  | "coming"
  | "reserved";

export type IndustrySpecialisationStatus =
  | "live"
  | "rolling-out"
  | "soon"
  | "future"
  | "reserved";

export type IndustrySpecialisation = {
  id: string;
  label: string;
  /** Existing Gen 2 module id when one exists */
  appId?: string;
  templateId: string;
  status: IndustrySpecialisationStatus;
  summary: string;
};

export type IndustryPlatform = {
  id: string;
  label: string;
  icon: string;
  price: string;
  includedSpecialisations: number;
  additionalSpecialisationPrice: string;
  roadmap: IndustryRoadmapLane;
  /** Public pricing / marketing prominence */
  publicSurface: boolean;
  summary: string;
  proposition: string;
  specialisations: IndustrySpecialisation[];
};

export const INDUSTRY_ARCHITECTURE_POSITIONING =
  "Industry Apps specialise DigitalGate around how your business operates. Choose an Industry, activate a Template, and DigitalGate configures workflows, objects and AI context. New business types become Templates — not new top-level Apps.";

/**
 * Canonical Industry commercial rule (lock — August 2026).
 *
 * Industry App = major vertical capability / infrastructure ($99/mo).
 * Industry Template = specialised workflow configuration within that App.
 * One primary Template is included with each Industry App; extras are +$29/mo.
 */
export const INDUSTRY_COMMERCIAL_LOCK = {
  industryPrice: "$99/mo",
  industryPriceCents: 9900,
  includedTemplates: 1,
  /** @deprecated Prefer includedTemplates — same meaning as specialisations */
  includedSpecialisations: 1,
  additionalTemplatePrice: "+$29/mo",
  additionalTemplatePriceCents: 2900,
  /** @deprecated Prefer additionalTemplatePrice */
  additionalSpecialisationPrice: "+$29/mo",
  terminology: {
    industryApp:
      "The major vertical capability and infrastructure the customer buys.",
    industryTemplate:
      "A specialised workflow configuration within that Industry App.",
    primaryTemplateRule:
      "Each Industry App includes exactly one primary Template. Additional Templates are optional paid expansions.",
  },
  foundingDiscount: {
    rule:
      "Founding acquisition discount applies to qualifying Platform + Industry App subscription fees and any additional Industry Templates purchased as part of the qualifying Founding subscription at initial onboarding.",
    exampleListCents: 99_00 + 99_00 + 29_00, // Starter + Property + PM Template
    exampleFounding10Cents: Math.round((99_00 + 99_00 + 29_00) * 0.7), // $158.90
    exampleNarrative:
      "Starter $99 + Property $99 (Real Estate included) + Property Management $29 = $227 → Founding 10 30% = $158.90/mo for 24 months.",
  },
  avoidWording: [
    "Get Real Estate, Property Management, Accommodation… for $99",
    "1 Industry App included in Starter",
    "Unlimited Industry Apps",
    "Twelve finished Industry products",
    "Buy Real Estate as a separate Industry App",
    "Buy Accommodation as a separate Industry App",
  ],
  say: [
    "Industry App — $99/mo — one connected vertical operating platform",
    "Includes 1 Industry Template — customer chooses their primary business model",
    "Additional Templates — +$29/mo each",
    "Industry App is the commercial boundary; Templates are the expansion layer",
    "Architecture can be broad; public pricing stays honest about readiness",
  ],
} as const;

export const INDUSTRY_PUBLIC_GROUPS = [
  {
    id: "available",
    label: "Available",
    industryIds: ["property", "services"],
  },
  {
    id: "early-access",
    label: "Early Access",
    industryIds: ["hospitality-accommodation", "finance", "creator-media"],
  },
  {
    id: "coming",
    label: "Coming Soon",
    industryIds: [
      "professional",
      "health-wellness",
      "automotive",
      "retail-commerce",
      "transport-logistics",
      "education-organisations",
    ],
  },
  {
    id: "reserved",
    label: "Architecture Reserved",
    industryIds: ["agriculture-primary"],
  },
] as const;

export const INDUSTRY_LAYER_STACK = [
  { id: "core", label: "Core", body: "Universal operating infrastructure" },
  {
    id: "infrastructure",
    label: "Infrastructure",
    body: "Websites, domains, hosting, connectors, identity",
  },
  {
    id: "industry",
    label: "Industry",
    body: "Twelve verticals — Property · Hospitality & Accommodation · Services · Finance · Professional · Health & Wellness · Automotive · Retail & Commerce · Creator & Media · Transport & Logistics · Agriculture · Education & Organisations",
  },
  { id: "template", label: "Template", body: "Specialised business model within an Industry" },
  {
    id: "growth",
    label: "Growth",
    body: "Prospecting, AI Visibility, SEO, Reputation, Social, Analytics, AI Communications",
  },
  {
    id: "intelligence",
    label: "Intelligence",
    body: "Twin, Business Brain, Advisor, Health, Insights, Command Centre",
  },
] as const;

/** Canonical twelve Industry Platforms. */
export const INDUSTRY_PLATFORMS: IndustryPlatform[] = [
  {
    id: "property",
    label: "Property",
    icon: "🏠",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "available",
    publicSurface: true,
    summary:
      "Property transactions, ownership and development — not short-stay hospitality.",
    proposition:
      "Real Estate is the founding Template. PM, Commercial, Development and Buyers Agency follow.",
    specialisations: [
      {
        id: "real-estate",
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
      {
        id: "buyers-agency",
        label: "Buyers Agency",
        templateId: "buyers-agency",
        status: "soon",
        summary: "Buyer representation and search workflows",
      },
      {
        id: "valuation-property-advisory",
        label: "Valuation / Property Advisory",
        templateId: "valuation-advisory",
        status: "future",
        summary: "Valuation and property advisory engagements",
      },
    ],
  },
  {
    id: "hospitality-accommodation",
    label: "Hospitality & Accommodation",
    icon: "🏨",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "early-access",
    publicSurface: true,
    summary:
      "Stays, venues and hospitality groups — Accommodation belongs here (not under Property).",
    proposition:
      "Short-stay and holiday rentals early access; hotels, restaurants and venues on the roadmap.",
    specialisations: [
      {
        id: "short-stay",
        label: "Short-Stay Accommodation",
        appId: "accommodation",
        templateId: "short-stay",
        status: "rolling-out",
        summary: "Bookings, guests, availability and revenue",
      },
      {
        id: "holiday-rentals",
        label: "Holiday Rentals",
        appId: "accommodation",
        templateId: "holiday-rentals",
        status: "rolling-out",
        summary: "Holiday rental operations",
      },
      {
        id: "hotels",
        label: "Hotels",
        templateId: "hotels",
        status: "soon",
        summary: "Hotel operations",
      },
      {
        id: "motels",
        label: "Motels",
        templateId: "motels",
        status: "soon",
        summary: "Motel operations",
      },
      {
        id: "resorts",
        label: "Resorts",
        templateId: "resorts",
        status: "soon",
        summary: "Resort operations",
      },
      {
        id: "boutique-accommodation",
        label: "Boutique Accommodation",
        templateId: "boutique-accommodation",
        status: "soon",
        summary: "Boutique stays",
      },
      {
        id: "caravan-holiday-parks",
        label: "Caravan & Holiday Parks",
        templateId: "caravan-parks",
        status: "future",
        summary: "Parks and powered sites",
      },
      {
        id: "restaurants-cafes",
        label: "Restaurants & Cafés",
        templateId: "restaurants-cafes",
        status: "future",
        summary: "Food and beverage venues",
      },
      {
        id: "bars-venues",
        label: "Bars & Venues",
        templateId: "bars-venues",
        status: "future",
        summary: "Bars and event venues",
      },
      {
        id: "hospitality-groups",
        label: "Hospitality Groups",
        templateId: "hospitality-groups",
        status: "future",
        summary: "Multi-venue hospitality groups",
      },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: "🔧",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "available",
    publicSurface: true,
    summary:
      "Physical and field service work — jobs, quotes, schedule. Templates customise trades.",
    proposition: "One Services App + Templates — never Electrician App / Plumber App.",
    specialisations: [
      {
        id: "trades",
        label: "Trades",
        appId: "services",
        templateId: "general",
        status: "soon",
        summary: "General trades jobs and quotes",
      },
      {
        id: "electrical",
        label: "Electrical",
        appId: "services",
        templateId: "electrician",
        status: "soon",
        summary: "Electrical contractor workflows",
      },
      {
        id: "plumbing",
        label: "Plumbing",
        appId: "services",
        templateId: "plumber",
        status: "soon",
        summary: "Plumbing contractor workflows",
      },
      {
        id: "hvac",
        label: "HVAC",
        appId: "services",
        templateId: "hvac",
        status: "soon",
        summary: "HVAC service workflows",
      },
      {
        id: "cleaning",
        label: "Cleaning",
        appId: "services",
        templateId: "cleaner",
        status: "soon",
        summary: "Commercial and residential cleaning",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        appId: "services",
        templateId: "handyman",
        status: "soon",
        summary: "Maintenance and facilities",
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
        id: "construction-services",
        label: "Construction Services",
        appId: "services",
        templateId: "builder",
        status: "soon",
        summary: "Builder / construction jobs",
      },
      {
        id: "pest-control",
        label: "Pest Control",
        appId: "services",
        templateId: "pest_control",
        status: "soon",
        summary: "Pest control jobs",
      },
      {
        id: "field-services",
        label: "Field Services",
        appId: "services",
        templateId: "general",
        status: "soon",
        summary: "Professional field services",
      },
      {
        id: "facilities-management",
        label: "Facilities Management",
        templateId: "facilities",
        status: "future",
        summary: "Facilities and site services",
      },
      {
        id: "security",
        label: "Security",
        templateId: "security",
        status: "future",
        summary: "Security services",
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
    roadmap: "early-access",
    publicSurface: true,
    summary:
      "Money and financial relationships — Accounting first. Not an “Accounting App”.",
    proposition:
      "Accounting · Bookkeeping · Broking · Planning · Insurance · Lending on one Finance platform.",
    specialisations: [
      {
        id: "accounting",
        label: "Accounting",
        appId: "finance",
        templateId: "accounting-practice",
        status: "soon",
        summary: "Clients, entities, engagements, compliance, deadlines",
      },
      {
        id: "bookkeeping",
        label: "Bookkeeping",
        appId: "finance",
        templateId: "bookkeeping",
        status: "soon",
        summary: "Bookkeeping and BAS workflows",
      },
      {
        id: "mortgage-broking",
        label: "Mortgage Broking",
        appId: "finance",
        templateId: "mortgage-broking",
        status: "soon",
        summary: "Application → approval → settlement",
      },
      {
        id: "finance-broking",
        label: "Finance Broking",
        appId: "finance",
        templateId: "finance-broking",
        status: "soon",
        summary: "Commercial and asset finance broking",
      },
      {
        id: "lending",
        label: "Lending",
        templateId: "lending",
        status: "future",
        summary: "Credit and lending workflows",
      },
      {
        id: "financial-planning",
        label: "Financial Planning",
        templateId: "financial-planning",
        status: "soon",
        summary: "Advice, reviews and client tasks",
      },
      {
        id: "wealth-management",
        label: "Wealth Management",
        templateId: "wealth-management",
        status: "future",
        summary: "Wealth and investment clients",
      },
      {
        id: "insurance-broking",
        label: "Insurance Broking",
        templateId: "insurance-broking",
        status: "soon",
        summary: "Quotes, policies and renewals",
      },
      {
        id: "tax-advisory",
        label: "Tax Advisory",
        templateId: "tax-advisory",
        status: "soon",
        summary: "Tax advisory engagements",
      },
    ],
  },
  {
    id: "professional",
    label: "Professional",
    icon: "⚖️",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    publicSurface: true,
    summary:
      "Knowledge firms — clients → matters/projects → documents → tasks → billing. Lawyers and surveyors live here.",
    proposition:
      "Legal and Surveying are Templates — not separate Industry Apps. Accountants prefer Finance.",
    specialisations: [
      {
        id: "legal",
        label: "Legal",
        templateId: "legal-practice",
        status: "soon",
        summary: "Matters, deadlines, documents, time, billing",
      },
      {
        id: "surveying",
        label: "Surveying",
        templateId: "surveying",
        status: "soon",
        summary: "Projects, site jobs, plans, field teams",
      },
      {
        id: "engineering",
        label: "Engineering",
        templateId: "engineering",
        status: "soon",
        summary: "Engineering project engagements",
      },
      {
        id: "architecture",
        label: "Architecture",
        templateId: "architecture",
        status: "soon",
        summary: "Architecture practices",
      },
      {
        id: "consulting",
        label: "Consulting",
        templateId: "consulting",
        status: "soon",
        summary: "Consulting and advisory",
      },
      {
        id: "recruitment",
        label: "Recruitment",
        templateId: "recruitment",
        status: "future",
        summary: "Recruitment firms",
      },
      {
        id: "hr",
        label: "HR",
        templateId: "hr",
        status: "future",
        summary: "HR professional services",
      },
      {
        id: "business-consulting",
        label: "Business Consulting",
        templateId: "business-consulting",
        status: "soon",
        summary: "Business consulting engagements",
      },
      {
        id: "education-training-ps",
        label: "Education & Training",
        templateId: "education-training",
        status: "future",
        summary: "Professional training providers (also see Education & Organisations)",
      },
    ],
  },
  {
    id: "health-wellness",
    label: "Health & Wellness",
    icon: "🏥",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    publicSurface: true,
    summary:
      "Clinical and wellness practices — significant privacy/compliance considerations. Architecture, not production-ready.",
    proposition: "Coming Soon — do not imply clinical readiness.",
    specialisations: [
      { id: "medical", label: "Medical Practices", templateId: "medical", status: "future", summary: "Medical practices" },
      { id: "gp", label: "General Practice", templateId: "gp", status: "future", summary: "GP clinics" },
      { id: "allied-health", label: "Allied Health", templateId: "allied-health", status: "future", summary: "Allied health" },
      { id: "physiotherapy", label: "Physiotherapy", templateId: "physiotherapy", status: "future", summary: "Physio clinics" },
      { id: "psychology", label: "Psychology", templateId: "psychology", status: "future", summary: "Psychology practices" },
      { id: "chiropractic", label: "Chiropractic", templateId: "chiropractic", status: "future", summary: "Chiropractic" },
      { id: "dental", label: "Dental", templateId: "dental", status: "future", summary: "Dental practices" },
      { id: "optometry", label: "Optometry", templateId: "optometry", status: "future", summary: "Optometry" },
      { id: "veterinary", label: "Veterinary", templateId: "veterinary", status: "future", summary: "Veterinary practices" },
      { id: "health-wellness-general", label: "Health & Wellness", templateId: "health-wellness", status: "future", summary: "Wellness businesses" },
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
    publicSurface: true,
    summary: "Vehicle sales and workshop services.",
    proposition: "Dealerships, mechanics and auto services on Core.",
    specialisations: [
      {
        id: "dealerships",
        label: "Car Dealerships",
        appId: "automotive",
        templateId: "dealership",
        status: "soon",
        summary: "New and used vehicle sales",
      },
      {
        id: "used-car-dealers",
        label: "Used Car Dealers",
        appId: "automotive",
        templateId: "used-car",
        status: "soon",
        summary: "Used vehicle sales",
      },
      {
        id: "workshops",
        label: "Automotive Workshops",
        templateId: "workshop",
        status: "soon",
        summary: "Workshop jobs",
      },
      {
        id: "mechanics",
        label: "Mechanics",
        templateId: "mechanical",
        status: "soon",
        summary: "Mechanical services",
      },
      {
        id: "auto-electrical",
        label: "Auto Electrical",
        templateId: "auto-electrical",
        status: "soon",
        summary: "Auto electrical",
      },
      {
        id: "tyres-parts",
        label: "Tyres & Parts",
        templateId: "tyres-parts",
        status: "future",
        summary: "Tyres and parts retail/service",
      },
      {
        id: "vehicle-services",
        label: "Vehicle Services",
        templateId: "vehicle-services",
        status: "soon",
        summary: "General vehicle services",
      },
    ],
  },
  {
    id: "retail-commerce",
    label: "Retail & Commerce",
    icon: "🛍️",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    publicSurface: true,
    summary: "Product businesses — retail, e-commerce, wholesale. Leverages Core Commerce.",
    proposition: "Not a separate Retail App — Retail & Commerce Industry + Templates.",
    specialisations: [
      { id: "retail", label: "Retail", templateId: "retail", status: "soon", summary: "Storefront retail" },
      { id: "ecommerce", label: "E-commerce", templateId: "ecommerce", status: "soon", summary: "Online commerce" },
      { id: "wholesale", label: "Wholesale", templateId: "wholesale", status: "soon", summary: "B2B wholesale" },
      { id: "multi-location-retail", label: "Multi-location Retail", templateId: "multi-location-retail", status: "future", summary: "Multi-store retail" },
      { id: "franchises", label: "Franchises", templateId: "franchises", status: "future", summary: "Franchise networks" },
      { id: "consumer-products", label: "Consumer Products", templateId: "consumer-products", status: "future", summary: "CPG / consumer brands" },
    ],
  },
  {
    id: "creator-media",
    label: "Creator & Media",
    icon: "🎨",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "early-access",
    publicSurface: true,
    summary: "Creators, artists, music, media and personal brands.",
    proposition: "Aëtherra and creator businesses sit naturally here.",
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
        id: "artists",
        label: "Artists",
        appId: "creator",
        templateId: "artists",
        status: "soon",
        summary: "Artists and creatives",
      },
      {
        id: "musicians",
        label: "Musicians",
        appId: "creator",
        templateId: "musicians",
        status: "soon",
        summary: "Musicians and DJs",
      },
      {
        id: "agencies-media",
        label: "Agencies",
        templateId: "media-agencies",
        status: "soon",
        summary: "Creative and media agencies",
      },
      {
        id: "production-media",
        label: "Production & Media",
        templateId: "production-media",
        status: "soon",
        summary: "Production and media businesses",
      },
      {
        id: "personal-brands",
        label: "Personal Brands",
        templateId: "personal-brands",
        status: "soon",
        summary: "Personal brand businesses",
      },
      {
        id: "digital-products",
        label: "Digital Products",
        templateId: "digital-products",
        status: "soon",
        summary: "Digital product sellers",
      },
    ],
  },
  {
    id: "transport-logistics",
    label: "Transport & Logistics",
    icon: "🚚",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    publicSurface: true,
    summary: "Transport, courier, freight, warehousing and fleet.",
    proposition: "Reserved vertical — Coming Soon.",
    specialisations: [
      { id: "transport", label: "Transport", templateId: "transport", status: "soon", summary: "Transport operators" },
      { id: "courier", label: "Courier", templateId: "courier", status: "soon", summary: "Courier businesses" },
      { id: "logistics", label: "Logistics", templateId: "logistics", status: "soon", summary: "Logistics providers" },
      { id: "freight", label: "Freight", templateId: "freight", status: "soon", summary: "Freight" },
      { id: "removalists", label: "Removalists", templateId: "removalists", status: "soon", summary: "Removals" },
      { id: "warehousing", label: "Warehousing", templateId: "warehousing", status: "future", summary: "Warehousing" },
      { id: "fleet", label: "Fleet Operations", templateId: "fleet", status: "future", summary: "Fleet ops" },
    ],
  },
  {
    id: "agriculture-primary",
    label: "Agriculture & Primary Industries",
    icon: "🌾",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "reserved",
    publicSurface: false,
    summary: "Farming, horticulture, rural and primary production — architecture reserved.",
    proposition: "Not on public pricing as an active sell — reserve the slot.",
    specialisations: [
      { id: "agriculture", label: "Agriculture", templateId: "agriculture", status: "reserved", summary: "Agriculture" },
      { id: "farming", label: "Farming", templateId: "farming", status: "reserved", summary: "Farming" },
      { id: "horticulture", label: "Horticulture", templateId: "horticulture", status: "reserved", summary: "Horticulture" },
      { id: "rural-services", label: "Rural Services", templateId: "rural-services", status: "reserved", summary: "Rural services" },
      { id: "primary-production", label: "Primary Production", templateId: "primary-production", status: "reserved", summary: "Primary production" },
    ],
  },
  {
    id: "education-organisations",
    label: "Education & Organisations",
    icon: "🏛️",
    price: "$99/mo",
    includedSpecialisations: 1,
    additionalSpecialisationPrice: "+$29/mo",
    roadmap: "coming",
    publicSurface: true,
    summary:
      "Education, training, schools, childcare, memberships, associations, clubs and non-profits.",
    proposition: "Broader than a Schools App — one Industry for community and education orgs.",
    specialisations: [
      { id: "education", label: "Education", templateId: "education", status: "soon", summary: "Education providers" },
      { id: "training", label: "Training", templateId: "training", status: "soon", summary: "Training organisations" },
      { id: "schools", label: "Schools", templateId: "schools", status: "future", summary: "Schools" },
      { id: "childcare", label: "Childcare", templateId: "childcare", status: "future", summary: "Childcare" },
      { id: "membership", label: "Membership Organisations", templateId: "membership", status: "soon", summary: "Memberships" },
      { id: "associations", label: "Associations", templateId: "associations", status: "soon", summary: "Associations" },
      { id: "clubs", label: "Clubs", templateId: "clubs", status: "soon", summary: "Clubs" },
      { id: "nonprofits", label: "Non-profits", templateId: "nonprofits", status: "soon", summary: "Non-profits" },
    ],
  },
];

export function getIndustryPlatform(id: string): IndustryPlatform | undefined {
  return INDUSTRY_PLATFORMS.find((p) => p.id === id);
}

export function getIndustryPlatformsByRoadmap(lane: IndustryRoadmapLane): IndustryPlatform[] {
  return INDUSTRY_PLATFORMS.filter((p) => p.roadmap === lane);
}

export function getPublicIndustryPlatforms(): IndustryPlatform[] {
  return INDUSTRY_PLATFORMS.filter((p) => p.publicSurface);
}

/** Map specialisation / template / app id → Industry + Template. */
export function resolveIndustrySpecialisation(id: string): {
  platform: IndustryPlatform;
  specialisation: IndustrySpecialisation;
} | null {
  const key = id.trim();
  if (!key) return null;
  for (const platform of INDUSTRY_PLATFORMS) {
    const specialisation = platform.specialisations.find(
      (s) => s.id === key || s.appId === key || s.templateId === key,
    );
    if (specialisation) return { platform, specialisation };
  }
  return null;
}

/** Map Gen 2 app install id → Industry + Template (first match when appId is shared). */
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

/** Industry Platforms shown on sell sheets (not Architecture Reserved). */
export const BILLABLE_INDUSTRY_PLATFORMS = INDUSTRY_PLATFORMS.filter(
  (p) => p.roadmap !== "reserved",
);

export const INDUSTRY_CLASSIFICATION_RULES = [
  { primarily: "Property transactions, ownership or development", industryId: "property" },
  { primarily: "Stays, venues or hospitality", industryId: "hospitality-accommodation" },
  { primarily: "Physical / field service work", industryId: "services" },
  { primarily: "Money / financial relationships", industryId: "finance" },
  { primarily: "Expertise, matters, projects and professional billing", industryId: "professional" },
  { primarily: "Clinical or wellness practice", industryId: "health-wellness" },
  { primarily: "Vehicles — sales or workshop", industryId: "automotive" },
  { primarily: "Selling products", industryId: "retail-commerce" },
  { primarily: "Creating intellectual / media output", industryId: "creator-media" },
  { primarily: "Transport, courier, freight or fleet", industryId: "transport-logistics" },
  { primarily: "Farming or primary production", industryId: "agriculture-primary" },
  { primarily: "Education, membership or community organisations", industryId: "education-organisations" },
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

/** @deprecated Use IndustryPlatforms — kept for Finance template tooling */
export type FinanceTemplateKey =
  | "accounting-practice"
  | "bookkeeping"
  | "mortgage-broking"
  | "finance-broking"
  | "financial-planning"
  | "insurance-broking"
  | "tax-advisory"
  | "lending"
  | "wealth-management";

export const FINANCE_TEMPLATES: Array<{
  key: FinanceTemplateKey;
  label: string;
  configures: string[];
}> = [
  {
    key: "accounting-practice",
    label: "Accounting",
    configures: [
      "Clients",
      "Entities",
      "Engagements",
      "Compliance",
      "Deadlines",
      "Document requests",
    ],
  },
  {
    key: "bookkeeping",
    label: "Bookkeeping",
    configures: ["Clients", "BAS", "Reconciliations", "Documents"],
  },
  {
    key: "mortgage-broking",
    label: "Mortgage Broking",
    configures: ["Lead → Settlement", "Lenders", "Documents"],
  },
  {
    key: "finance-broking",
    label: "Finance Broking",
    configures: ["Applications", "Lenders", "Documents"],
  },
  {
    key: "financial-planning",
    label: "Financial Planning",
    configures: ["Onboarding", "Advice", "Reviews"],
  },
  {
    key: "insurance-broking",
    label: "Insurance Broking",
    configures: ["Quotes", "Policies", "Renewals"],
  },
  {
    key: "tax-advisory",
    label: "Tax Advisory",
    configures: ["Engagements", "Deadlines", "Documents"],
  },
  {
    key: "lending",
    label: "Lending",
    configures: ["Applications", "Underwriting", "Portfolio"],
  },
  {
    key: "wealth-management",
    label: "Wealth Management",
    configures: ["Portfolios", "Reviews", "Communications"],
  },
];

export type ProfessionalTemplateKey =
  | "legal-practice"
  | "surveying"
  | "engineering"
  | "architecture"
  | "consulting";

/** @deprecated Prefer PROFESSIONAL under INDUSTRY_PLATFORMS */
export const PROFESSIONAL_SERVICES_TEMPLATES = [
  {
    key: "legal-practice" as const,
    label: "Legal",
    configures: ["Matters", "Deadlines", "Documents", "Time", "Billing"],
  },
  {
    key: "surveying" as const,
    label: "Surveying",
    configures: ["Projects", "Site jobs", "Plans", "Scheduling", "Invoicing"],
  },
];

/** Map a Gen 2 module / Template id to its parent Industry Platform id. */
export function industryIdForAppOrTemplate(id: string): string | null {
  const direct = INDUSTRY_PLATFORMS.find((p) => p.id === id);
  if (direct) return direct.id;
  for (const platform of INDUSTRY_PLATFORMS) {
    if (
      platform.specialisations.some(
        (s) => s.id === id || s.appId === id || s.templateId === id,
      )
    ) {
      return platform.id;
    }
  }
  return null;
}

export type IndustryCheckoutLine = {
  kind: "industry" | "template";
  industryId: string;
  industryLabel: string;
  templateId?: string;
  templateLabel?: string;
  amountCents: number;
  name: string;
};

/**
 * Build Stripe-ready line items from selected Industry / Template ids.
 * First Template per Industry is included in the $99 Industry fee;
 * each additional Template under the same Industry is +$29/mo.
 */
export function industryCheckoutLines(
  selectedIds: string[],
): IndustryCheckoutLine[] {
  const byIndustry = new Map<
    string,
    { platform: IndustryPlatform; templateIds: string[] }
  >();

  for (const raw of selectedIds) {
    const id = raw.trim();
    if (!id) continue;
    const industryId = industryIdForAppOrTemplate(id);
    if (!industryId) continue;
    const platform = INDUSTRY_PLATFORMS.find((p) => p.id === industryId);
    if (!platform) continue;

    const entry = byIndustry.get(industryId) ?? {
      platform,
      templateIds: [] as string[],
    };
    const isIndustryOnly = platform.id === id;
    if (!isIndustryOnly) {
      const spec =
        platform.specialisations.find(
          (s) => s.id === id || s.appId === id || s.templateId === id,
        ) ?? null;
      const tid = spec?.id ?? id;
      if (!entry.templateIds.includes(tid)) entry.templateIds.push(tid);
    }
    byIndustry.set(industryId, entry);
  }

  const lines: IndustryCheckoutLine[] = [];
  for (const { platform, templateIds } of byIndustry.values()) {
    lines.push({
      kind: "industry",
      industryId: platform.id,
      industryLabel: platform.label,
      amountCents: INDUSTRY_COMMERCIAL_LOCK.industryPriceCents,
      name: `DigitalGate ${platform.label} Industry App`,
    });
    for (let i = 1; i < templateIds.length; i++) {
      const tid = templateIds[i]!;
      const spec = platform.specialisations.find((s) => s.id === tid);
      lines.push({
        kind: "template",
        industryId: platform.id,
        industryLabel: platform.label,
        templateId: tid,
        templateLabel: spec?.label ?? tid,
        amountCents: INDUSTRY_COMMERCIAL_LOCK.additionalTemplatePriceCents,
        name: `DigitalGate ${platform.label} Template — ${spec?.label ?? tid}`,
      });
    }
  }
  return lines;
}

export function industryCheckoutTotalCents(selectedIds: string[]): number {
  return industryCheckoutLines(selectedIds).reduce(
    (sum, line) => sum + line.amountCents,
    0,
  );
}
