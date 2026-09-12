import { platformApps, type AppSetupGuide } from "@dg/platform-core";

const NATIVE_GUIDE_OVERRIDES: Record<string, AppSetupGuide> = {
  crm: {
    appId: "crm",
    headline: "Get your CRM running",
    summary:
      "Create the shared customer relationship foundation used by DigitalGate Apps.",
    estimatedMinutes: 10,
    prerequisites: ["Business organisation created", "Business Profile started"],
    steps: [
      {
        id: "crm-1",
        title: "Confirm the active organisation",
        description:
          "Open Overview and confirm you are working in the correct business before adding customer data.",
        href: "/dashboard",
        hrefLabel: "Open overview",
      },
      {
        id: "crm-2",
        title: "Create your first contact",
        description:
          "Add a real contact in DigitalGate. Contacts provide shared relationship context for tasks, Commerce, Communications and industry apps.",
        href: "/apps/crm/contacts",
        hrefLabel: "Open contacts",
      },
      {
        id: "crm-3",
        title: "Review the activity timeline",
        description:
          "Open the contact and use the shared timeline to keep notes and related activity together.",
      },
      {
        id: "crm-4",
        title: "Invite your team",
        description:
          "Add staff and configure organisation access from Team settings.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team settings",
      },
    ],
  },
  commerce: {
    appId: "commerce",
    headline: "Set up billing and commercial workflows",
    summary:
      "Use DigitalGate Commerce for quotes, invoices, payment requests and supported subscription workflows without managing deployment secrets yourself.",
    estimatedMinutes: 10,
    prerequisites: ["Organisation owner or administrator access", "CRM contacts available"],
    steps: [
      {
        id: "commerce-1",
        title: "Review billing status",
        description:
          "Open Billing to confirm the organisation subscription and any payment actions that need attention.",
        href: "/dashboard/settings/billing",
        hrefLabel: "Billing settings",
      },
      {
        id: "commerce-2",
        title: "Open Commerce",
        description:
          "Review the commercial workspace and confirm the customer or contact you want to work with is available.",
        href: "/apps/commerce",
        hrefLabel: "Open Commerce",
      },
      {
        id: "commerce-3",
        title: "Create a real commercial record",
        description:
          "Start with the quote, invoice or payment-request flow that matches the customer action you actually need.",
      },
      {
        id: "commerce-4",
        title: "Confirm payment state in DigitalGate",
        description:
          "After a payment completes, use DigitalGate as the source of truth for the resulting commercial status. Contact Support before repeating a payment that appears delayed.",
        href: "/support",
        hrefLabel: "Support centre",
      },
    ],
  },
  "real-estate": {
    appId: "real-estate",
    headline: "Set up your Real Estate workspace",
    summary:
      "Run vendor leads, appraisals, properties, listings, buyers, bookings, offers and settlements natively in DigitalGate.",
    estimatedMinutes: 15,
    prerequisites: ["Business Profile completed", "CRM contacts available"],
    steps: [
      {
        id: "re-1",
        title: "Complete Business Profile",
        description:
          "Confirm agency identity, ABN, branding, website and business details used throughout the workspace.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "re-2",
        title: "Invite the agency team",
        description:
          "Add agents and staff, then make sure each person has the organisation access needed for their role.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team settings",
      },
      {
        id: "re-3",
        title: "Create a vendor lead",
        description:
          "Open Vendor Leads and add the first real prospect you want to move through appraisal and listing preparation.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Vendor leads",
      },
      {
        id: "re-4",
        title: "Run the property workflow",
        description:
          "Progress the relationship through appraisal, property, listing, offer and settlement using native DigitalGate records.",
        href: "/apps/re/properties",
        hrefLabel: "Properties",
      },
      {
        id: "re-5",
        title: "Work buyers and bookings",
        description:
          "Use Buyer Leads and Bookings for buyer enquiries and appraisal appointments while keeping the relationship linked to CRM.",
        href: "/apps/re/buyer-leads",
        hrefLabel: "Buyer leads",
      },
    ],
  },
  accommodation: {
    appId: "accommodation",
    headline: "Set up your Accommodation workspace",
    summary:
      "Manage units, native availability, stays, guests, payments, check-ins and housekeeping from Platform Core.",
    estimatedMinutes: 15,
    prerequisites: ["Business Profile completed", "Accommodation units identified"],
    steps: [
      {
        id: "acc-1",
        title: "Create or review units",
        description:
          "Open Units and confirm each accommodation unit you operate. Native units and bookings drive availability and housekeeping.",
        href: "/apps/accommodation/units",
        hrefLabel: "Units",
      },
      {
        id: "acc-2",
        title: "Review availability and booking rules",
        description:
          "Check the calendar and availability settings before taking or changing stays.",
        href: "/apps/accommodation/calendar",
        hrefLabel: "Calendar",
      },
      {
        id: "acc-3",
        title: "Create or review a booking",
        description:
          "Use Bookings for stay dates and guest context. Dates and times follow your organisation timezone.",
        href: "/apps/accommodation/bookings",
        hrefLabel: "Bookings",
      },
      {
        id: "acc-4",
        title: "Work arrivals and housekeeping",
        description:
          "Use Check-ins for upcoming arrivals and Housekeeping for turnover work generated from native bookings.",
        href: "/apps/accommodation/housekeeping",
        hrefLabel: "Housekeeping",
      },
      {
        id: "acc-5",
        title: "Review payments",
        description:
          "Use the Accommodation payment view for supported booking payment state. Money follows the organisation locale and currency.",
        href: "/apps/accommodation/payments",
        hrefLabel: "Payments",
      },
    ],
  },
  finance: {
    appId: "finance",
    headline: "Set up your Finance pipeline",
    summary:
      "Track borrowers and applications through a native finance workflow linked to shared CRM contacts.",
    estimatedMinutes: 10,
    prerequisites: ["CRM contacts available", "Finance team access configured"],
    steps: [
      {
        id: "finance-1",
        title: "Open Finance",
        description: "Review the Finance overview and current application pipeline.",
        href: "/apps/finance",
        hrefLabel: "Finance overview",
      },
      {
        id: "finance-2",
        title: "Create an application",
        description:
          "Add the first real application, link the client where appropriate, and record the requested amount and key details.",
        href: "/apps/finance/applications",
        hrefLabel: "Applications",
      },
      {
        id: "finance-3",
        title: "Progress the pipeline",
        description:
          "Move the application through the real stages as the deal progresses. Read-only team members can review without mutation controls.",
        href: "/apps/finance/pipeline",
        hrefLabel: "Pipeline",
      },
    ],
  },
  services: {
    appId: "services",
    headline: "Set up jobs and scheduling",
    summary:
      "Create service jobs, schedule field work and keep progress connected to CRM customers.",
    estimatedMinutes: 10,
    prerequisites: ["CRM customers available", "Team access configured"],
    steps: [
      {
        id: "services-1",
        title: "Open Services",
        description: "Review the service workflow and any existing jobs.",
        href: "/apps/services",
        hrefLabel: "Services overview",
      },
      {
        id: "services-2",
        title: "Create a job",
        description:
          "Add the customer, job details and assignment required for the work.",
        href: "/apps/services/jobs",
        hrefLabel: "Jobs",
      },
      {
        id: "services-3",
        title: "Schedule the work",
        description:
          "Use Scheduling to set the service time in the organisation timezone and coordinate the assigned team member.",
        href: "/apps/services/scheduling",
        hrefLabel: "Scheduling",
      },
      {
        id: "services-4",
        title: "Keep the job current",
        description:
          "Update stages, notes and checklist items so the record reflects the work actually completed.",
      },
    ],
  },
  commercial: {
    appId: "commercial",
    headline: "Set up Commercial property records",
    summary:
      "Manage commercial properties, tenants and leases using native DigitalGate records and shared CRM contacts.",
    estimatedMinutes: 10,
    prerequisites: ["CRM contacts available"],
    steps: [
      {
        id: "commercial-1",
        title: "Create a property",
        description: "Add the first commercial property you manage.",
        href: "/apps/commercial/properties",
        hrefLabel: "Properties",
      },
      {
        id: "commercial-2",
        title: "Add tenant relationships",
        description:
          "Use the shared CRM contact context for tenants and other commercial relationships.",
        href: "/apps/commercial/tenants",
        hrefLabel: "Tenants",
      },
      {
        id: "commercial-3",
        title: "Record the lease",
        description:
          "Create the lease with the correct property, tenant, dates and rent. Money follows the organisation locale and currency.",
        href: "/apps/commercial/leases",
        hrefLabel: "Leases",
      },
    ],
  },
  "property-management": {
    appId: "property-management",
    headline: "Set up Property Management",
    summary:
      "Manage rental properties, owners, tenants, leases and maintenance from a native property-management workspace.",
    estimatedMinutes: 10,
    prerequisites: ["CRM contacts available"],
    steps: [
      {
        id: "pm-1",
        title: "Create a managed property",
        description: "Add the first property you manage and confirm its address and details.",
        href: "/apps/property-management/properties",
        hrefLabel: "Properties",
      },
      {
        id: "pm-2",
        title: "Review owner and tenant contacts",
        description:
          "Use the linked CRM relationships so people are not duplicated across property records.",
        href: "/apps/property-management/owners",
        hrefLabel: "Owners",
      },
      {
        id: "pm-3",
        title: "Create the lease",
        description:
          "Record the property, tenant, dates and weekly rent using the organisation's configured money settings.",
        href: "/apps/property-management/leases",
        hrefLabel: "Leases",
      },
      {
        id: "pm-4",
        title: "Work maintenance",
        description:
          "Use Maintenance to record and update property issues that need follow-through.",
        href: "/apps/property-management/maintenance",
        hrefLabel: "Maintenance",
      },
    ],
  },
  websites: {
    appId: "websites",
    headline: "Create and publish a DigitalGate website",
    summary:
      "Build, edit, preview and publish a native site, then connect the domain when it is ready to go live.",
    estimatedMinutes: 15,
    prerequisites: ["Business Profile completed"],
    steps: [
      {
        id: "web-1",
        title: "Open Websites",
        description:
          "Create a site from your business context or open the existing site you want to edit.",
        href: "/apps/websites",
        hrefLabel: "Websites",
      },
      {
        id: "web-2",
        title: "Edit and preview",
        description:
          "Update content, design and SEO fields, then preview the site before publishing.",
      },
      {
        id: "web-3",
        title: "Publish",
        description:
          "Publish the approved site so the current DigitalGate version is available publicly.",
      },
      {
        id: "web-4",
        title: "Connect the domain",
        description:
          "Use Domains to connect the public hostname and complete the DNS/SSL go-live path.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
    ],
  },
  infrastructure: {
    appId: "infrastructure",
    headline: "Connect domains and infrastructure",
    summary:
      "Manage domains, DNS and supported hosting/deployment relationships from the DigitalGate Infrastructure app.",
    estimatedMinutes: 10,
    prerequisites: ["A website or service that needs a domain"],
    steps: [
      {
        id: "infra-1",
        title: "Open Domains",
        description:
          "Search for a domain or select the existing domain you want to connect.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
      {
        id: "infra-2",
        title: "Connect the destination",
        description:
          "Choose the DigitalGate website or supported destination the domain should serve.",
      },
      {
        id: "infra-3",
        title: "Apply DNS and verify SSL",
        description:
          "Use the in-app go-live actions and wait for DNS/SSL state to report healthy before treating the domain as complete.",
      },
    ],
  },
};

function buildGenericNativeGuide(appId: string): AppSetupGuide | undefined {
  const registered = platformApps.get(appId);
  if (!registered?.enabled) return undefined;
  if ((registered.manifest.visibility ?? "customer") !== "customer") return undefined;

  const primary = registered.manifest.navigation[0];
  const steps: AppSetupGuide["steps"] = [
    {
      id: `${appId}-1`,
      title: `Open ${registered.manifest.name}`,
      description:
        "Review the app in the correct organisation and start with the first real workflow your business needs.",
      ...(primary ? { href: primary.href, hrefLabel: `Open ${registered.manifest.name}` } : {}),
    },
    {
      id: `${appId}-2`,
      title: "Confirm access and source information",
      description:
        "Make sure the Business Profile, CRM relationships and team access needed by this workflow are current before adding more data.",
      href: "/dashboard/business",
      hrefLabel: "Business Profile",
    },
    {
      id: `${appId}-3`,
      title: "Run one real workflow end to end",
      description:
        "Use a real record from start to finish, confirm the resulting state is correct, then expand the workflow to the rest of the team.",
    },
    {
      id: `${appId}-4`,
      title: "Use Support when the expected path is unavailable",
      description:
        "If a control or workflow your organisation should have cannot be used, contact Support with the organisation name and page URL.",
      href: "/support",
      hrefLabel: "Support centre",
    },
  ];

  return {
    appId,
    headline: `Set up ${registered.manifest.name}`,
    summary: registered.manifest.description,
    estimatedMinutes: 10,
    steps,
  };
}

export function getNativeAppSetupGuide(appId: string): AppSetupGuide | undefined {
  return NATIVE_GUIDE_OVERRIDES[appId] ?? buildGenericNativeGuide(appId);
}
