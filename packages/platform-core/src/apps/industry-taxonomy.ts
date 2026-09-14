export type IndustrySubIndustry = {
  id: string;
  name: string;
  description: string;
  appId: string;
};

export type IndustryGroup = {
  id: string;
  name: string;
  description: string;
  appIds: string[];
  subIndustries: IndustrySubIndustry[];
};

/**
 * Canonical customer-industry taxonomy used by Apps, onboarding and Product Roadmap.
 * Keep business labels here so product surfaces do not grow their own competing lists.
 */
export const INDUSTRY_TAXONOMY: IndustryGroup[] = [
  {
    id: "property",
    name: "Property",
    description: "Residential, commercial and development property businesses.",
    appIds: ["real-estate", "property-management", "commercial"],
    subIndustries: [
      { id: "real-estate", name: "Real Estate", description: "Residential sales, buyers, listings and agency operations.", appId: "real-estate" },
      { id: "property-management", name: "Property Management", description: "Owners, tenants, leases, inspections, arrears and maintenance.", appId: "property-management" },
      { id: "commercial-property", name: "Commercial Property", description: "Commercial leasing, sales, tenancy and asset workflows.", appId: "commercial" },
      { id: "property-development", name: "Property Development", description: "Sites, feasibility, projects, stages, sales, consultants and development reporting.", appId: "commercial" },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Finance, lending and advisory businesses.",
    appIds: ["finance"],
    subIndustries: [
      { id: "mortgage-finance-broking", name: "Mortgage & Finance Broking", description: "Lead-to-settlement broking, applications, documents and commissions.", appId: "finance" },
      { id: "lending", name: "Lending", description: "Loan origination, assessment, approvals, servicing and portfolio workflows.", appId: "finance" },
      { id: "financial-advice", name: "Financial Advice", description: "Client discovery, advice workflows, reviews, documents and compliance.", appId: "finance" },
      { id: "accounting-bookkeeping", name: "Accounting & Bookkeeping", description: "Client work, recurring obligations, documents, jobs and financial workflow coordination.", appId: "finance" },
    ],
  },
  {
    id: "services",
    name: "Services",
    description: "Field, trade, maintenance and recurring service businesses.",
    appIds: ["services"],
    subIndustries: [
      { id: "electrical", name: "Electrical", description: "Quoting, jobs, scheduling, field work, compliance and recurring electrical services.", appId: "services" },
      { id: "plumbing", name: "Plumbing", description: "Quoting, dispatch, field capture, materials, compliance and maintenance.", appId: "services" },
      { id: "cleaning", name: "Cleaning", description: "Commercial and domestic cleaning, recurring schedules, teams, sites and quality control.", appId: "services" },
      { id: "maintenance", name: "Property & Facility Maintenance", description: "Reactive and planned maintenance, work orders, contractors, sites and service history.", appId: "services" },
      { id: "hvac", name: "HVAC & Refrigeration", description: "Installations, service schedules, assets, compliance and field operations.", appId: "services" },
      { id: "building-construction", name: "Building & Construction", description: "Leads, estimates, projects, trades, variations, milestones and customer communication.", appId: "services" },
      { id: "landscaping", name: "Landscaping & Grounds", description: "Quotes, recurring visits, crews, materials and site servicing.", appId: "services" },
      { id: "pest-control", name: "Pest Control", description: "Bookings, routes, treatments, compliance, recurring visits and customer history.", appId: "services" },
    ],
  },
  {
    id: "accommodation-hospitality",
    name: "Accommodation & Hospitality",
    description: "Short-stay, hospitality and guest-experience operations.",
    appIds: ["accommodation"],
    subIndustries: [
      { id: "short-stay", name: "Short-Stay Accommodation", description: "Direct bookings, OTA sync, rates, guests, housekeeping and revenue management.", appId: "accommodation" },
      { id: "hotels-motels", name: "Hotels & Motels", description: "Inventory, reservations, guests, housekeeping, pricing and operational reporting.", appId: "accommodation" },
      { id: "holiday-parks-retreats", name: "Holiday Parks & Retreats", description: "Multi-unit stays, experiences, guest journeys, operations and direct demand generation.", appId: "accommodation" },
      { id: "venues-events", name: "Venues & Events", description: "Enquiries, bookings, packages, run sheets, suppliers, payments and follow-up.", appId: "accommodation" },
    ],
  },
  {
    id: "automotive",
    name: "Automotive",
    description: "Vehicle sales, service and mobility businesses.",
    appIds: ["automotive"],
    subIndustries: [
      { id: "dealerships", name: "Vehicle Dealerships", description: "Inventory, enquiries, test drives, trade-ins, finance, deals and delivery.", appId: "automotive" },
      { id: "service-repair", name: "Service & Repair", description: "Bookings, workshop jobs, inspections, parts, customer approvals and service history.", appId: "automotive" },
      { id: "vehicle-rental", name: "Vehicle Rental", description: "Fleet availability, reservations, customers, handover, billing and lifecycle management.", appId: "automotive" },
    ],
  },
  {
    id: "creator-media",
    name: "Creator & Media",
    description: "Audience, content, creative and intellectual-property businesses.",
    appIds: ["creator"],
    subIndustries: [
      { id: "creators-influencers", name: "Creators & Influencers", description: "Audience CRM, content, partnerships, campaigns, products and memberships.", appId: "creator" },
      { id: "music-artists", name: "Music & Artists", description: "Releases, catalogue, audience, promotion, bookings, rights and revenue intelligence.", appId: "creator" },
      { id: "creative-agencies", name: "Creative Agencies", description: "Leads, briefs, projects, approvals, assets, retainers and client reporting.", appId: "creator" },
      { id: "publishers-media", name: "Publishers & Media", description: "Editorial planning, audience, distribution, sponsorship, subscriptions and performance.", appId: "creator" },
    ],
  },
];

export function getIndustryGroup(id: string): IndustryGroup | undefined {
  return INDUSTRY_TAXONOMY.find((group) => group.id === id);
}

export function getSubIndustry(id: string): IndustrySubIndustry | undefined {
  return INDUSTRY_TAXONOMY.flatMap((group) => group.subIndustries).find((item) => item.id === id);
}
