/**
 * DigitalGate Industry Platform — Gen 2 lock (August 2026).
 *
 * Industry App = broad commercial vertical ($99/mo)
 * Sub-industry App = specialised customer-facing app experience within that vertical
 *
 * Do not add new top-level Industry Apps for every business type. Sub-industries remain
 * children of the parent Industry App, but each selected sub-industry should feel like
 * its own app in navigation and workspace UX. Shared runtimes are an implementation detail.
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
  "Industry Apps specialise DigitalGate around how your business operates. Choose a parent Industry App, then activate the sub-industry Apps your business needs. Each sub-industry gets its own customer-facing app experience while shared runtime infrastructure stays behind the scenes.";

/**
 * Canonical Industry commercial rule (lock — August 2026).
 *
 * Industry App = major vertical capability / infrastructure ($99/mo).
 * Sub-industry App = specialised customer-facing app/workflow configuration within that parent App.
 * One primary sub-industry App is included with each Industry App; extras are +$29/mo.
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
      "A specialised customer-facing sub-industry App within that parent Industry App.",
    primaryTemplateRule:
      "Each Industry App includes exactly one primary Template. Additional Templates are optional paid expansions.",
  },
  foundingCommercial: {
    rule:
      "Founding customers pay standard published Platform + Industry App + Template pricing. Benefits are exclusivity, early access, priority onboarding and influence — not a recurring percentage discount.",
    exampleListCents: 99_00 + 99_00 + 29_00, // Starter + Property + PM Template
    exampleNarrative:
      "Starter $99 + Property $99 (Real Estate included) + Property Management $29 = $227/mo at published pricing. Try DigitalGate free for 14 days. Annual billing ≈ 10 months of monthly pricing.",
  },
  /** @deprecated Prefer foundingCommercial — Founding % discount removed. */
  foundingDiscount: {
    rule:
      "Founding customers pay standard published pricing. No recurring founding percentage discount.",
    exampleListCents: 99_00 + 99_00 + 29_00,
    exampleFounding10Cents: 99_00 + 99_00 + 29_00,
    exampleNarrative:
      "Starter $99 + Property $99 (Real Estate included) + Property Management $29 = $227/mo at published pricing.",
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
    "Includes 1 sub-industry App — customer chooses their primary business model",
    "Additional sub-industry Apps — +$29/mo each",
    "Parent Industry App is the commercial boundary; sub-industry Apps are the expansion layer",
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
  { id: "template", label: "Sub-industry App", body: "Specialised business model within a parent Industry App" },
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
      "Property is the parent Industry App. Real Estate, Property Management, Commercial, Development and Buyers Agency are distinct sub-industry Apps.",
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
        id: "property-advisory",
        label: "Property Advisory & Valuation",
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
      "Hospitality & Accommodation is the parent Industry App. Short-Stay, Hotels & Motels, Holiday Parks & Retreats, Venues & Events, Restaurants & Cafés and Bars are distinct sub-industry Apps.",
    specialisations: [
      {
        id: "short-stay",
        label: "Short-Stay Accommodation",
        appId: "accommodation",
        templateId: "short-stay",
        status: "rolling-out",
        summary: "Direct bookings, OTA sync, guests, availability and revenue",
      },
      {
        id: "hotels-motels",
        label: "Hotels & Motels",
        templateId: "hotels",
        status: "soon",
        summary: "Hotel and motel operations",
      },
      {
        id: "holiday-parks-retreats",
        label: "Holiday Parks & Retreats",
        templateId: "caravan-parks",
        status: "future",
        summary: "Multi-unit stays, retreats, parks and guest experiences",
      },
      {
        id: "venues-events",
        label: "Venues & Events",
        templateId: "venues-events",
        status: "future",
        summary: "Venue enquiries, bookings, packages and events",
      },
      {
        id: "restaurants-cafes",
        label: "Restaurants & Cafés",
        templateId: "restaurants-cafes",
        status: "future",
        summary: "Food and beverage venues",
      },
      {
        id: "bars-hospitality",
        label: "Bars & Hospitality Venues",
        templateId: "bars-venues",
        status: "future",
        summary: "Bars, hospitality venues and guest marketing",
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
      "Physical and field service work — jobs, quotes, schedule. Sub-industry Apps tailor the shared Services engine.",
    proposition: "Services is the parent Industry App. Electrical, Plumbing, Cleaning, Maintenance and other selected sub-industries are distinct child Apps with independently selected workspaces.",
    specialisations: [
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
        id: "cleaning",
        label: "Commercial Cleaning",
        appId: "services",
        templateId: "cleaner",
        status: "soon",
        summary: "Commercial and residential cleaning",
      },
      {
        id: "maintenance",
        label: "Property & Facility Maintenance",
        appId: "services",
        templateId: "maintenance",
        status: "soon",
        summary: "Reactive and planned maintenance, work orders and facilities",
      },
      {
        id: "hvac",
        label: "HVAC & Refrigeration",
        appId: "services",
        templateId: "hvac",
        status: "soon",
        summary: "HVAC service workflows",
      },
      {
        id: "building-construction",
        label: "Building & Construction",
        appId: "services",
        templateId: "builder",
        status: "soon",
        summary: "Builder and construction workflows",
      },
      {
        id: "landscaping",
        label: "Landscaping & Grounds",
        appId: "services",
        templateId: "landscaper",
        status: "soon",
        summary: "Landscaping and outdoor services",
      },
      {
        id: "pest-control",
        label: "Pest Control",
        appId: "services",
        templateId: "pest_control",
        status: "soon",
        summary: "Pest control jobs and recurring treatments",
      },
      {
        id: "painting",
        label: "Painting",
        appId: "services",
        templateId: "painter",
        status: "soon",
        summary: "Painting quotes, stages, crews and completion",
      },
      {
        id: "handyman",
        label: "Handyman & General Maintenance",
        appId: "services",
        templateId: "handyman",
        status: "soon",
        summary: "Small works, repairs and general maintenance",
      },
      {
        id: "solar",
        label: "Solar & Energy Services",
        appId: "services",
        templateId: "solar",
        status: "soon",
        summary: "Solar assessment, installation and maintenance",
      },
      {
        id: "pool-service",
        label: "Pool Service",
        appId: "services",
        templateId: "pool_service",
        status: "soon",
        summary: "Recurring pool servicing, chemicals and equipment",
      },
      {
        id: "security-services",
        label: "Security Services",
        templateId: "security",
        status: "future",
        summary: "Security sites, rosters, patrols and incidents",
      },
      {
        id: "general-services",
        label: "General Services",
        appId: "services",
        templateId: "general",
        status: "soon",
        summary: "Flexible field service workflow",
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
      "Money and financial relationships across broking, lending, advice, accounting, insurance and wealth.",
    proposition:
      "Finance is the parent Industry App. Mortgage & Finance Broking, Lending, Financial Advice, Accounting & Bookkeeping, Insurance Broking and Wealth Management are distinct sub-industry Apps on shared Finance infrastructure.",
    specialisations: [
      {
        id: "mortgage-finance-broking",
        label: "Mortgage & Finance Broking",
        appId: "finance",
        templateId: "mortgage-broking",
        status: "soon",
        summary: "Lead-to-settlement broking, applications, documents and commissions",
      },
      {
        id: "lending",
        label: "Lending",
        templateId: "lending",
        status: "future",
        summary: "Loan origination, assessment, approvals and servicing",
      },
      {
        id: "financial-advice",
        label: "Financial Advice",
        appId: "finance",
        templateId: "financial-planning",
        status: "soon",
        summary: "Client discovery, advice workflows, reviews and compliance",
      },
      {
        id: "accounting-bookkeeping",
        label: "Accounting & Bookkeeping",
        appId: "finance",
        templateId: "accounting-practice",
        status: "soon",
        summary: "Client work, recurring obligations, documents and deadlines",
      },
      {
        id: "insurance-broking",
        label: "Insurance Broking",
        appId: "finance",
        templateId: "insurance-broking",
        status: "soon",
        summary: "Quotes, policies, renewals and claims coordination",
      },
      {
        id: "wealth-management",
        label: "Wealth Management",
        templateId: "wealth-management",
        status: "future",
        summary: "Client portfolios, reviews and relationship workflows",
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
    summary: "Vehicle sales, service, rental and automotive parts.",
    proposition: "Automotive is the parent Industry App. Vehicle Dealerships, Service & Repair, Vehicle Rental and Tyres & Automotive Parts are distinct sub-industry Apps.",
    specialisations: [
      {
        id: "dealerships",
        label: "Vehicle Dealerships",
        appId: "automotive",
        templateId: "dealership",
        status: "soon",
        summary: "Inventory, enquiries, test drives, trade-ins and delivery",
      },
      {
        id: "service-repair",
        label: "Service & Repair",
        appId: "automotive",
        templateId: "workshop",
        status: "soon",
        summary: "Bookings, workshop jobs, inspections, parts and approvals",
      },
      {
        id: "vehicle-rental",
        label: "Vehicle Rental",
        templateId: "vehicle-rental",
        status: "future",
        summary: "Fleet availability, reservations, customers and handover",
      },
      {
        id: "tyres-parts",
        label: "Tyres & Automotive Parts",
        templateId: "tyres-parts",
        status: "future",
        summary: "Customers, inventory, quoting, fitting and sales",
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
    summary: "Creators, artists, music, media and digital-product businesses.",
    proposition: "Creator & Media is the parent Industry App. Creators & Influencers, Music & Artists, Creative Agencies, Publishers & Media, Production & Media and Digital Products are distinct sub-industry Apps.",
    specialisations: [
      {
        id: "creators-influencers",
        label: "Creators & Influencers",
        appId: "creator",
        templateId: "creator",
        status: "rolling-out",
        summary: "Audience CRM, content, partnerships and creator businesses",
      },
      {
        id: "music-artists",
        label: "Music & Artists",
        appId: "creator",
        templateId: "musicians",
        status: "soon",
        summary: "Releases, catalogue, audience, promotion and bookings",
      },
      {
        id: "creative-agencies",
        label: "Creative Agencies",
        appId: "creator",
        templateId: "media-agencies",
        status: "soon",
        summary: "Leads, briefs, projects, approvals and retainers",
      },
      {
        id: "publishers-media",
        label: "Publishers & Media",
        templateId: "publishers-media",
        status: "future",
        summary: "Editorial planning, audience, distribution and sponsorship",
      },
      {
        id: "production-media",
        label: "Production & Media",
        templateId: "production-media",
        status: "soon",
        summary: "Projects, productions, assets, collaborators and delivery",
      },
      {
        id: "digital-products",
        label: "Digital Products",
        templateId: "digital-products",
        status: "soon",
        summary: "Audience, products, launches, customers and subscriptions",
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

/** Map exact sub-industry/template identity first, then fall back to a runtime app id. */
export function resolveIndustrySpecialisation(id: string): {
  platform: IndustryPlatform;
  specialisation: IndustrySpecialisation;
} | null {
  const key = id.trim();
  if (!key) return null;
  // Legacy alias — Holiday Rentals collapsed into Short-Stay Accommodation.
  const normalised = key === "holiday-rentals" ? "short-stay" : key;
  for (const platform of INDUSTRY_PLATFORMS) {
    const exact = platform.specialisations.find(
      (s) => s.id === normalised || s.templateId === normalised,
    );
    if (exact) return { platform, specialisation: exact };
  }
  // Shared runtime ids are infrastructure, not customer identity. Preserve this
  // fallback only for legacy callers that have no exact sub-industry key.
  return resolveIndustryFromAppId(normalised);
}

/** Map a Gen 2 runtime app id to its parent Industry. The returned child is legacy/default metadata only; callers must not use a shared runtime id as exact sub-industry identity. */
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
  const normalised = id.trim() === "holiday-rentals" ? "short-stay" : id.trim();
  if (!normalised) return null;
  const direct = INDUSTRY_PLATFORMS.find((p) => p.id === normalised);
  if (direct) return direct.id;
  for (const platform of INDUSTRY_PLATFORMS) {
    if (
      platform.specialisations.some(
        (s) =>
          s.id === normalised || s.appId === normalised || s.templateId === normalised,
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
