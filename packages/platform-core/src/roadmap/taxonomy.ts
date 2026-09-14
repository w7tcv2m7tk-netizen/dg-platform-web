export type RoadmapMajorSectionId = "core" | "growth" | "command" | "industry" | "configuration";

export const ROADMAP_MAJOR_SECTIONS = [
  { id: "core", label: "Core", description: "The operating foundation every DigitalGate customer relies on." },
  { id: "growth", label: "Growth Apps", description: "Acquisition, visibility, reputation, social and growth intelligence." },
  { id: "command", label: "Command Centre", description: "DigitalGate operator, customer success, governance and platform operations." },
  { id: "industry", label: "Industry Apps", description: "Deep operating systems tailored to industries and their sub-industries." },
  { id: "configuration", label: "Configuration", description: "Organisation setup, integrations, security, billing, infrastructure and administration." },
] as const;

export type IndustrySubIndustry = {
  id: string;
  label: string;
  appId?: string;
  description: string;
};

export type IndustryGroup = {
  id: string;
  label: string;
  description: string;
  subIndustries: IndustrySubIndustry[];
};

/**
 * Canonical strategic industry taxonomy for the Apps catalogue and Roadmap.
 * appId links a sub-industry to a currently registered app. Entries without an
 * appId are deliberate future vertical packs that should remain visible in the
 * product horizon before their manifest exists.
 */
export const INDUSTRY_TAXONOMY: IndustryGroup[] = [
  {
    id: "property",
    label: "Property",
    description: "Property sales, management, commercial, development and accommodation operations.",
    subIndustries: [
      { id: "real-estate", label: "Real Estate", appId: "real-estate", description: "Residential agency sales, prospecting, appraisals, listings, buyers and vendors." },
      { id: "property-management", label: "Property Management", appId: "property-management", description: "Residential property management, owners, tenants, leases, inspections and maintenance." },
      { id: "commercial-property", label: "Commercial Property", appId: "commercial", description: "Commercial sales, leasing, tenancy schedules, campaigns and asset performance." },
      { id: "property-development", label: "Property Development", description: "Projects, sites, feasibility, sales, milestones, consultants, budgets and development reporting." },
      { id: "accommodation", label: "Accommodation", appId: "accommodation", description: "Short-stay accommodation, direct bookings, guests, housekeeping, rates and distribution." },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    description: "Advice, broking, lending and finance workflows from lead through settlement and retention.",
    subIndustries: [
      { id: "mortgage-broking", label: "Mortgage Broking", appId: "finance", description: "Client discovery, applications, lender workflows, documents, compliance and commissions." },
      { id: "finance-broking", label: "Finance Broking", description: "Asset, commercial and business finance broking with lender and document workflows." },
      { id: "lending", label: "Lending", description: "Origination, assessment, approvals, settlements, servicing and portfolio intelligence." },
      { id: "financial-advice", label: "Financial Advice", description: "Client reviews, advice workflows, documents, compliance, tasks and relationship intelligence." },
    ],
  },
  {
    id: "services",
    label: "Services",
    description: "Field, trade, maintenance and recurring service businesses.",
    subIndustries: [
      { id: "field-services", label: "Field Services", appId: "services", description: "Shared estimating, jobs, scheduling, dispatch, field capture, invoicing and customer workflows." },
      { id: "electrical", label: "Electrical", description: "Electrical quoting, jobs, compliance, assets, recurring service and field workflows." },
      { id: "plumbing", label: "Plumbing", description: "Plumbing quoting, dispatch, job capture, materials, compliance and maintenance workflows." },
      { id: "cleaning", label: "Cleaning", description: "Commercial and residential cleaning, recurring schedules, sites, teams, checklists and QA." },
      { id: "maintenance", label: "Maintenance", description: "Reactive and planned maintenance, work orders, assets, contractors, SLAs and reporting." },
      { id: "building-construction", label: "Building & Construction", description: "Projects, estimates, jobs, variations, subcontractors, site records, costs and handover." },
      { id: "landscaping", label: "Landscaping", description: "Quoting, recurring maintenance, crews, scheduling, materials and site history." },
      { id: "hvac", label: "HVAC", description: "Installations, service agreements, assets, maintenance schedules, compliance and field work." },
    ],
  },
  {
    id: "automotive",
    label: "Automotive",
    description: "Vehicle sales, service and customer lifecycle operations.",
    subIndustries: [
      { id: "automotive-sales", label: "Vehicle Sales", appId: "automotive", description: "Inventory, enquiries, test drives, trade-ins, finance, deals and delivery." },
      { id: "automotive-service", label: "Service & Repair", description: "Bookings, workshop jobs, inspections, parts, service history and retention." },
      { id: "detailing", label: "Detailing", description: "Bookings, packages, recurring customers, jobs, add-ons and customer communications." },
    ],
  },
  {
    id: "creator-media",
    label: "Creator & Media",
    description: "Audience, content, partnerships, products and creator revenue operations.",
    subIndustries: [
      { id: "creator", label: "Creators", appId: "creator", description: "Audience CRM, content, campaigns, partnerships, products, memberships and revenue." },
      { id: "music", label: "Music", description: "Releases, catalogue, rights, collaborators, promotion, audience and performance intelligence." },
      { id: "content-media", label: "Content & Media", description: "Editorial planning, production, distribution, sponsorships, audience and monetisation." },
    ],
  },
];

export const INDUSTRY_APP_IDS = new Set(
  INDUSTRY_TAXONOMY.flatMap((group) => group.subIndustries.map((item) => item.appId).filter((id): id is string => Boolean(id))),
);
