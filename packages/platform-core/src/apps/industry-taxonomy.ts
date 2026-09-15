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
      { id: "buyers-agency", name: "Buyers Agency", description: "Buyer representation, briefs, property search, due diligence and acquisition workflows.", appId: "real-estate" },
      { id: "property-advisory", name: "Property Advisory & Valuation", description: "Property advice, valuation engagements, reports, clients and follow-up.", appId: "commercial" },
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
      { id: "insurance-broking", name: "Insurance Broking", description: "Quotes, policies, renewals, claims coordination and client relationships.", appId: "finance" },
      { id: "wealth-management", name: "Wealth Management", description: "Client portfolios, reviews, communications and relationship workflows.", appId: "finance" },
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
      { id: "cleaning", name: "Commercial Cleaning", description: "Commercial cleaning, recurring schedules, teams, sites, quality control, consumables and equipment.", appId: "services" },
      { id: "maintenance", name: "Property & Facility Maintenance", description: "Reactive and planned maintenance, work orders, contractors, sites and service history.", appId: "services" },
      { id: "hvac", name: "HVAC & Refrigeration", description: "Installations, service schedules, assets, compliance and field operations.", appId: "services" },
      { id: "building-construction", name: "Building & Construction", description: "Leads, estimates, projects, trades, variations, milestones and customer communication.", appId: "services" },
      { id: "landscaping", name: "Landscaping & Grounds", description: "Quotes, recurring visits, crews, materials and site servicing.", appId: "services" },
      { id: "pest-control", name: "Pest Control", description: "Bookings, routes, treatments, compliance, recurring visits and customer history.", appId: "services" },
      { id: "painting", name: "Painting", description: "Quoting, colour schedules, preparation, crews, stages, quality checks and completion.", appId: "services" },
      { id: "handyman", name: "Handyman & General Maintenance", description: "Small works, repairs, materials, scheduling, customer approvals and sign-off.", appId: "services" },
      { id: "solar", name: "Solar & Energy Services", description: "Assessment, design, installation, commissioning, compliance, monitoring and warranty workflows.", appId: "services" },
      { id: "pool-service", name: "Pool Service", description: "Recurring pool servicing, water testing, chemicals, equipment, repairs and service reports.", appId: "services" },
      { id: "security-services", name: "Security Services", description: "Sites, rosters, patrols, incidents, compliance and customer reporting.", appId: "services" },
      { id: "general-services", name: "General Services", description: "Flexible quoting, scheduling, jobs, teams, materials, invoicing and recurring service workflows.", appId: "services" },
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
      { id: "restaurants-cafes", name: "Restaurants & Cafés", description: "Guest relationships, bookings, events, promotions, reputation and repeat visitation.", appId: "accommodation" },
      { id: "bars-hospitality", name: "Bars & Hospitality Venues", description: "Bookings, events, guest marketing, promotions and venue operations.", appId: "accommodation" },
    ],
  },
  {
    id: "professional",
    name: "Professional Services",
    description: "Knowledge, advisory and project-based professional firms.",
    appIds: ["professional"],
    subIndustries: [
      { id: "legal", name: "Legal", description: "Clients, matters, documents, deadlines, time and billing workflows.", appId: "professional" },
      { id: "consulting", name: "Consulting & Advisory", description: "Leads, engagements, projects, deliverables, retainers and client reporting.", appId: "professional" },
      { id: "engineering", name: "Engineering", description: "Projects, clients, consultants, deliverables, approvals and commercial tracking.", appId: "professional" },
      { id: "architecture", name: "Architecture", description: "Clients, briefs, projects, stages, consultants, approvals and documentation.", appId: "professional" },
      { id: "surveying", name: "Surveying", description: "Projects, site work, plans, field teams, scheduling and client delivery.", appId: "professional" },
      { id: "recruitment", name: "Recruitment", description: "Clients, roles, candidates, placements, communications and pipeline management.", appId: "professional" },
      { id: "hr-advisory", name: "HR & People Advisory", description: "Clients, engagements, people processes, documents, tasks and recurring advisory work.", appId: "professional" },
      { id: "marketing-agency", name: "Marketing & Digital Agencies", description: "Leads, clients, campaigns, projects, retainers, approvals and reporting.", appId: "professional" },
    ],
  },
  {
    id: "health-wellness",
    name: "Health & Wellness",
    description: "Health, allied-health and wellness practices. Clinical capability remains roadmap-gated.",
    appIds: ["health-wellness"],
    subIndustries: [
      { id: "medical-practice", name: "Medical Practice", description: "Practice relationships, enquiries and operational workflows with clinical capability roadmap-gated.", appId: "health-wellness" },
      { id: "allied-health", name: "Allied Health", description: "Practice operations, enquiries, appointments and client relationships.", appId: "health-wellness" },
      { id: "physiotherapy", name: "Physiotherapy", description: "Practice enquiries, appointments, client communications and business operations.", appId: "health-wellness" },
      { id: "psychology", name: "Psychology", description: "Practice operations and client relationships with sensitive clinical functions roadmap-gated.", appId: "health-wellness" },
      { id: "dental", name: "Dental", description: "Practice enquiries, appointments, communications and business operations.", appId: "health-wellness" },
      { id: "veterinary", name: "Veterinary", description: "Client relationships, appointments, communications and practice operations.", appId: "health-wellness" },
      { id: "fitness-wellness", name: "Fitness & Wellness", description: "Leads, memberships, bookings, programmes, communications and retention.", appId: "health-wellness" },
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
      { id: "tyres-parts", name: "Tyres & Automotive Parts", description: "Customers, inventory, quoting, fitting, sales and repeat-service workflows.", appId: "automotive" },
    ],
  },
  {
    id: "retail-commerce",
    name: "Retail & Commerce",
    description: "Product, retail, e-commerce and wholesale businesses.",
    appIds: ["retail-commerce"],
    subIndustries: [
      { id: "retail", name: "Retail", description: "Customers, products, locations, campaigns, loyalty and sales operations.", appId: "retail-commerce" },
      { id: "ecommerce", name: "E-commerce", description: "Products, customers, orders, lifecycle marketing, support and performance.", appId: "retail-commerce" },
      { id: "wholesale", name: "Wholesale & Distribution", description: "Accounts, products, orders, pricing, sales representatives and fulfilment.", appId: "retail-commerce" },
      { id: "consumer-products", name: "Consumer Products & Brands", description: "Products, channels, campaigns, retailers, customers and brand performance.", appId: "retail-commerce" },
      { id: "franchise-retail", name: "Franchise & Multi-location Retail", description: "Locations, operators, campaigns, standards, reporting and network performance.", appId: "retail-commerce" },
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
      { id: "production-media", name: "Production & Media", description: "Projects, productions, assets, collaborators, clients, rights and delivery.", appId: "creator" },
      { id: "digital-products", name: "Digital Products", description: "Audience, products, launches, customers, subscriptions and digital revenue.", appId: "creator" },
    ],
  },
  {
    id: "transport-logistics",
    name: "Transport & Logistics",
    description: "Transport, freight, courier, warehousing and fleet businesses.",
    appIds: ["transport-logistics"],
    subIndustries: [
      { id: "transport", name: "Transport", description: "Customers, jobs, scheduling, vehicles, drivers and operational reporting.", appId: "transport-logistics" },
      { id: "courier", name: "Courier & Delivery", description: "Bookings, dispatch, routes, drivers, proof of delivery and customer communications.", appId: "transport-logistics" },
      { id: "freight-logistics", name: "Freight & Logistics", description: "Customers, consignments, carriers, movements, documents and delivery workflows.", appId: "transport-logistics" },
      { id: "warehousing", name: "Warehousing", description: "Customers, sites, inventory movements, tasks and operational coordination.", appId: "transport-logistics" },
      { id: "fleet-operations", name: "Fleet Operations", description: "Vehicles, drivers, servicing, compliance, utilisation and fleet performance.", appId: "transport-logistics" },
      { id: "removalists", name: "Removalists", description: "Enquiries, quotes, bookings, crews, vehicles, inventory and customer follow-up.", appId: "transport-logistics" },
    ],
  },
  {
    id: "agriculture-primary",
    name: "Agriculture & Primary Industries",
    description: "Farming, horticulture, rural and primary-production businesses.",
    appIds: ["agriculture-primary"],
    subIndustries: [
      { id: "farming", name: "Farming", description: "Properties, production, suppliers, customers, tasks and business operations.", appId: "agriculture-primary" },
      { id: "horticulture", name: "Horticulture", description: "Production, crops, customers, suppliers, labour and operational planning.", appId: "agriculture-primary" },
      { id: "livestock", name: "Livestock", description: "Properties, livestock operations, suppliers, customers and commercial workflows.", appId: "agriculture-primary" },
      { id: "rural-services", name: "Rural Services", description: "Customers, jobs, properties, scheduling, equipment and recurring rural services.", appId: "agriculture-primary" },
      { id: "primary-production", name: "Primary Production", description: "Production, supply relationships, customers, operations and reporting.", appId: "agriculture-primary" },
    ],
  },
  {
    id: "education-organisations",
    name: "Education & Organisations",
    description: "Education, training, childcare, membership and community organisations.",
    appIds: ["education-organisations"],
    subIndustries: [
      { id: "education-training", name: "Education & Training", description: "Enquiries, learners, programmes, communications, documents and engagement.", appId: "education-organisations" },
      { id: "schools", name: "Schools", description: "Community relationships, communications, events, enquiries and operational coordination.", appId: "education-organisations" },
      { id: "childcare", name: "Childcare", description: "Family enquiries, enrolment journeys, communications, events and centre operations.", appId: "education-organisations" },
      { id: "membership-organisations", name: "Membership Organisations", description: "Members, subscriptions, events, communications, renewals and engagement.", appId: "education-organisations" },
      { id: "associations-clubs", name: "Associations & Clubs", description: "Members, committees, events, communications, sponsors and renewals.", appId: "education-organisations" },
      { id: "nonprofits", name: "Non-profits & Community Organisations", description: "Supporters, programmes, donors, volunteers, communications and impact activity.", appId: "education-organisations" },
    ],
  },
  {
    id: "technology-saas",
    name: "Technology & SaaS",
    description: "Software, technology, IT and recurring digital-service businesses.",
    appIds: ["technology-saas"],
    subIndustries: [
      { id: "saas", name: "SaaS", description: "Leads, trials, subscriptions, customers, onboarding, success, renewals and product-led growth.", appId: "technology-saas" },
      { id: "software-development", name: "Software Development", description: "Leads, clients, projects, delivery, support and recurring commercial relationships.", appId: "technology-saas" },
      { id: "it-managed-services", name: "IT & Managed Services", description: "Customers, agreements, requests, assets, recurring services and account management.", appId: "technology-saas" },
      { id: "technology-consulting", name: "Technology Consulting", description: "Leads, engagements, projects, deliverables, retainers and client success.", appId: "technology-saas" },
      { id: "ai-automation", name: "AI & Automation", description: "Prospects, implementations, workflows, agents, support and recurring service relationships.", appId: "technology-saas" },
      { id: "cybersecurity", name: "Cybersecurity", description: "Customers, assessments, projects, recurring services, compliance and account workflows.", appId: "technology-saas" },
    ],
  },
  {
    id: "marketplace-platforms",
    name: "Marketplaces & Platforms",
    description: "Multi-sided marketplaces and platforms connecting demand with supply.",
    appIds: ["marketplace"],
    subIndustries: [
      { id: "buyer-led-marketplace", name: "Buyer-led Marketplace", description: "Buyer wants, matching, supplier alerts, responses, offers and marketplace conversion.", appId: "marketplace" },
      { id: "product-marketplace", name: "Product Marketplace", description: "Buyers, sellers, listings, matching, transactions and marketplace operations.", appId: "marketplace" },
      { id: "services-marketplace", name: "Services Marketplace", description: "Customer requests, providers, matching, quotes, bookings and marketplace quality.", appId: "marketplace" },
      { id: "property-marketplace", name: "Property Marketplace", description: "Buyer demand, owners and agents, matching, property opportunities and enquiries.", appId: "marketplace" },
      { id: "jobs-gigs-marketplace", name: "Jobs & Gigs Marketplace", description: "Demand, talent, matching, applications, engagements and marketplace activity.", appId: "marketplace" },
      { id: "accommodation-marketplace", name: "Accommodation Marketplace", description: "Guest demand, accommodation supply, matching, enquiries and bookings.", appId: "marketplace" },
      { id: "general-marketplace", name: "General Marketplace / Platform", description: "Flexible multi-sided marketplace workflows for specialised demand and supply.", appId: "marketplace" },
    ],
  },
  {
    id: "manufacturing-industrial",
    name: "Manufacturing & Industrial",
    description: "Manufacturing, fabrication, industrial supply and production businesses.",
    appIds: ["manufacturing-industrial"],
    subIndustries: [
      { id: "manufacturing", name: "Manufacturing", description: "Customers, products, quotes, orders, production coordination and account management.", appId: "manufacturing-industrial" },
      { id: "fabrication", name: "Fabrication", description: "Enquiries, estimates, jobs, drawings, materials, production stages and delivery.", appId: "manufacturing-industrial" },
      { id: "industrial-supply", name: "Industrial Supply", description: "Accounts, products, quotes, orders, sales pipeline and recurring customer relationships.", appId: "manufacturing-industrial" },
      { id: "equipment-machinery", name: "Equipment & Machinery", description: "Products, enquiries, sales, hire or service relationships, assets and customers.", appId: "manufacturing-industrial" },
    ],
  },
  {
    id: "resources-energy",
    name: "Resources & Energy",
    description: "Energy, resources, utilities and related commercial operators.",
    appIds: ["resources-energy"],
    subIndustries: [
      { id: "renewable-energy", name: "Renewable Energy", description: "Projects, customers, sites, partners, assets and commercial energy workflows.", appId: "resources-energy" },
      { id: "energy-services", name: "Energy Services", description: "Customers, projects, sites, assets, service programmes and reporting.", appId: "resources-energy" },
      { id: "mining-resources", name: "Mining & Resources", description: "Projects, sites, contractors, suppliers, stakeholders and commercial operations.", appId: "resources-energy" },
      { id: "utilities", name: "Utilities", description: "Customers, sites, assets, service activity and operational coordination.", appId: "resources-energy" },
    ],
  },
];

export function getIndustryGroup(id: string): IndustryGroup | undefined {
  return INDUSTRY_TAXONOMY.find((group) => group.id === id);
}

export function getSubIndustry(id: string): IndustrySubIndustry | undefined {
  return INDUSTRY_TAXONOMY.flatMap((group) => group.subIndustries).find((item) => item.id === id);
}
