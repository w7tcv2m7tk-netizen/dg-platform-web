/**
 * Shared scaffold floor for deferred Business Apps (Finance, Creator, Commercial, Automotive).
 * Matches Marketing / Social honesty pattern — product map + Core links, not fake product.
 * @see docs/foundations/BUSINESS-APPS-SCAFFOLD.md
 */

export type BusinessAppScaffoldId =
  | "finance"
  | "creator"
  | "commercial"
  | "automotive"
  | "property-management";

export type BusinessAppNavLink = {
  href: string;
  label: string;
};

export type BusinessAppCoreLink = {
  href: string;
  label: string;
  note: string;
};

export type BusinessAppRouteDef = {
  /** Segment after /apps/{id}/ — empty string = overview */
  segment: string;
  title: string;
  summary: string;
  emptyTitle: string;
  emptyBody: string;
};

export type BusinessAppScaffold = {
  id: BusinessAppScaffoldId;
  name: string;
  /** Manifest / sidebar icon glyph */
  icon: string;
  tagline: string;
  deferredTitle: string;
  deferredBody: string;
  gen1Note?: string;
  nav: BusinessAppNavLink[];
  coreLinks: BusinessAppCoreLink[];
  routes: BusinessAppRouteDef[];
  staffDocSlug: string;
  staffDocLabel: string;
};

export const BUSINESS_APP_SCAFFOLDS: Record<
  BusinessAppScaffoldId,
  BusinessAppScaffold
> = {
  finance: {
    id: "finance",
    name: "Finance",
    icon: "▣",
    tagline: "Loan pipeline, clients, and applications — broker workflow on Gen 2",
    deferredTitle: "Scaffold floor — not a closed beta yet",
    deferredBody:
      "Routes are registered so the product map is visible. No loan pipeline, approval scores, commission MRR, or lender integrations are live here. Use CRM for clients until Finance ships.",
    gen1Note:
      "WordPress Gen 1 Finance module remains the operational surface until Gen 2 migrates broker workflows.",
    nav: [
      { href: "/apps/finance", label: "Overview" },
      { href: "/apps/finance/pipeline", label: "Pipeline" },
      { href: "/apps/finance/clients", label: "Clients" },
      { href: "/apps/finance/applications", label: "Applications" },
    ],
    coreLinks: [
      {
        href: "/apps/crm/contacts",
        label: "CRM contacts",
        note: "Client records live in Core CRM today",
      },
      {
        href: "/apps/crm",
        label: "CRM overview",
        note: "Pipeline and activities without inventing a finance board",
      },
      {
        href: "/apps/commerce",
        label: "Commerce",
        note: "Quotes and invoices when you need billing",
      },
    ],
    routes: [
      {
        segment: "",
        title: "Finance",
        summary: "Broker dashboard — pipeline, clients, and applications",
        emptyTitle: "Finance App scaffold",
        emptyBody:
          "Overview counts and broker KPIs will appear here when the pilot floor ships. Nothing is fabricated.",
      },
      {
        segment: "pipeline",
        title: "Pipeline",
        summary: "Loan and finance application stages",
        emptyTitle: "No finance pipeline yet",
        emptyBody:
          "Stage boards and lender tracking are planned. Track people in CRM until this surface is real.",
      },
      {
        segment: "clients",
        title: "Clients",
        summary: "Finance client records and document collection",
        emptyTitle: "Clients → CRM for now",
        emptyBody:
          "Dedicated broker client folders are not built. Use CRM contacts and activities.",
      },
      {
        segment: "applications",
        title: "Applications",
        summary: "Application forms, status, and lender submissions",
        emptyTitle: "No applications store yet",
        emptyBody:
          "Application forms and lender submission flows are planned — not stubbed with fake statuses.",
      },
    ],
    staffDocSlug: "business-apps-scaffold",
    staffDocLabel: "Business Apps scaffold checklist",
  },
  creator: {
    id: "creator",
    name: "Creator",
    icon: "✦",
    tagline: "Content, memberships, and storefront — Commerce-backed creator toolkit",
    deferredTitle: "Scaffold floor — Commerce first",
    deferredBody:
      "Creator routes are product-map only. No audience counts, fake MRR, or engagement charts. Memberships and checkout belong in Commerce when you sell digital products.",
    gen1Note:
      "WordPress Gen 1 Creator module may still be live for early creator clients until Gen 2 storefront migrates.",
    nav: [
      { href: "/apps/creator", label: "Overview" },
      { href: "/apps/creator/content", label: "Content library" },
      { href: "/apps/creator/memberships", label: "Memberships" },
      { href: "/apps/creator/storefront", label: "Storefront" },
    ],
    coreLinks: [
      {
        href: "/apps/commerce",
        label: "Commerce",
        note: "Products, quotes, invoices, and checkout",
      },
      {
        href: "/apps/commerce/subscriptions",
        label: "Subscriptions",
        note: "Membership billing will lean on Commerce subscriptions",
      },
      {
        href: "/apps/crm/contacts",
        label: "CRM contacts",
        note: "Audience and member contacts",
      },
    ],
    routes: [
      {
        segment: "",
        title: "Creator",
        summary: "Content, members, and storefront — deferred Business App",
        emptyTitle: "Creator App scaffold",
        emptyBody:
          "No decorative revenue tiles. Wire Commerce and CRM first; Creator UX comes after.",
      },
      {
        segment: "content",
        title: "Content library",
        summary: "Posts, courses, and digital assets",
        emptyTitle: "No content library yet",
        emptyBody:
          "Asset and course management is planned. Store files elsewhere for now — this route is a map pin.",
      },
      {
        segment: "memberships",
        title: "Memberships",
        summary: "Tiers and subscriber management",
        emptyTitle: "Memberships → Commerce",
        emptyBody:
          "Subscriber tiers will use Commerce subscriptions. No fake member counts here.",
      },
      {
        segment: "storefront",
        title: "Storefront",
        summary: "Digital products and checkout pages",
        emptyTitle: "Storefront → Commerce products",
        emptyBody:
          "Checkout and catalogues live under Commerce until Creator storefront ships.",
      },
    ],
    staffDocSlug: "business-apps-scaffold",
    staffDocLabel: "Business Apps scaffold checklist",
  },
  commercial: {
    id: "commercial",
    name: "Commercial Property",
    icon: "▦",
    tagline: "Commercial sales, leasing, landlords and assets — distinct from RE Sales & PM",
    deferredTitle: "Domain floor started — registry still off",
    deferredBody:
      "Commercial Property register CRUD is live on /properties. Leases/tenants deepen next. Not residential Real Estate Sales.",
    nav: [
      { href: "/apps/commercial", label: "Overview" },
      { href: "/apps/commercial/properties", label: "Properties" },
      { href: "/apps/commercial/leases", label: "Leases" },
      { href: "/apps/commercial/tenants", label: "Tenants" },
    ],
    coreLinks: [
      {
        href: "/apps/re",
        label: "Real Estate",
        note: "Residential vendor/buyer workflows (separate app)",
      },
      {
        href: "/apps/property-management",
        label: "Property Management",
        note: "Long-term residential rentals (separate app)",
      },
      {
        href: "/apps/crm/contacts",
        label: "CRM contacts",
        note: "Landlord and tenant contacts",
      },
    ],
    routes: [
      {
        segment: "",
        title: "Commercial Property",
        summary: "Portfolio dashboard for commercial property ops",
        emptyTitle: "Commercial Property floor",
        emptyBody:
          "Start with Properties CRUD. Sales pipeline and outgoings come later.",
      },
      {
        segment: "properties",
        title: "Properties",
        summary: "Commercial property register",
        emptyTitle: "Use the live register",
        emptyBody: "Create commercial assets on this route — Neon SoT.",
      },
      {
        segment: "leases",
        title: "Leases",
        summary: "Lease terms, renewals, and rent schedules",
        emptyTitle: "Lease CRUD next",
        emptyBody: "Property register ships first; lease API is available for the next UI pass.",
      },
      {
        segment: "tenants",
        title: "Tenants",
        summary: "Tenant records and communication history",
        emptyTitle: "Tenants → CRM for now",
        emptyBody: "Use CRM contacts until commercial tenant context deepens.",
      },
    ],
    staffDocSlug: "business-apps-scaffold",
    staffDocLabel: "Business Apps scaffold checklist",
  },
  "property-management": {
    id: "property-management",
    name: "Property Management",
    icon: "⌂",
    tagline: "Long-term rentals — owners, tenants, leases & maintenance",
    deferredTitle: "Domain floor started — registry still off",
    deferredBody:
      "PmLease create/list is live. Not Real Estate sales. Not short-stay Accommodation. Not Commercial Property.",
    nav: [
      { href: "/apps/property-management", label: "Overview" },
      { href: "/apps/property-management/properties", label: "Rental properties" },
      { href: "/apps/property-management/owners", label: "Owners" },
      { href: "/apps/property-management/tenants", label: "Tenants" },
      { href: "/apps/property-management/leases", label: "Leases" },
      { href: "/apps/property-management/maintenance", label: "Maintenance" },
    ],
    coreLinks: [
      {
        href: "/apps/property-management/leases",
        label: "Leases",
        note: "First CRUD surface — create and list leases",
      },
      {
        href: "/apps/crm/contacts",
        label: "CRM contacts",
        note: "Owners and tenants are Contact roles",
      },
      {
        href: "/apps/re",
        label: "Real Estate",
        note: "Sales only — keep separate",
      },
    ],
    routes: [
      {
        segment: "",
        title: "Property Management",
        summary: "Long-term rental operations on Platform Core",
        emptyTitle: "PM floor",
        emptyBody: "Open Leases to create the first tenancy record.",
      },
      {
        segment: "properties",
        title: "Rental properties",
        summary: "Managed rental stock",
        emptyTitle: "Property register next",
        emptyBody: "Leases can carry address for now; dedicated rental property table follows.",
      },
      {
        segment: "owners",
        title: "Owners",
        summary: "Property owners",
        emptyTitle: "Owners → CRM",
        emptyBody: "Link owner contacts on each lease until an owner board ships.",
      },
      {
        segment: "tenants",
        title: "Tenants",
        summary: "Tenants",
        emptyTitle: "Tenants → CRM",
        emptyBody: "Link tenant contacts on each lease.",
      },
      {
        segment: "leases",
        title: "Leases",
        summary: "Lease and tenancy records",
        emptyTitle: "Use live leases",
        emptyBody: "Create/list on this route.",
      },
      {
        segment: "maintenance",
        title: "Maintenance",
        summary: "Maintenance requests",
        emptyTitle: "Maintenance next",
        emptyBody: "Use Tasks or Services until PM maintenance objects ship.",
      },
    ],
    staffDocSlug: "property-ecosystem",
    staffDocLabel: "Property ecosystem lock",
  },
  automotive: {
    id: "automotive",
    name: "Automotive",
    icon: "⬡",
    tagline: "Dealership inventory, buyer leads, and test drives",
    deferredTitle: "Scaffold floor — Gen 1 dealer still live",
    deferredBody:
      "Gen 2 Automotive routes are product-map only. No stock valuation, conversion scores, or fake test-drive calendars. Run dealership ops on WordPress Gen 1 until migration.",
    gen1Note:
      "WordPress Gen 1 Dealership module remains the operational surface for inventory and leads.",
    nav: [
      { href: "/apps/automotive", label: "Overview" },
      { href: "/apps/automotive/inventory", label: "Inventory" },
      { href: "/apps/automotive/leads", label: "Buyer leads" },
      { href: "/apps/automotive/test-drives", label: "Test drives" },
    ],
    coreLinks: [
      {
        href: "/apps/crm/contacts",
        label: "CRM contacts",
        note: "Buyer contacts until dealer lead SoT migrates",
      },
      {
        href: "/apps/crm",
        label: "CRM overview",
        note: "Activities and follow-ups",
      },
      {
        href: "/apps/commerce",
        label: "Commerce",
        note: "Deposits and invoices when needed",
      },
    ],
    routes: [
      {
        segment: "",
        title: "Automotive",
        summary: "Dealership dashboard — inventory, leads, test drives",
        emptyTitle: "Automotive App scaffold",
        emptyBody:
          "No decorative stock or lead tiles. Gen 1 dealership stays authoritative until Gen 2 migrates.",
      },
      {
        segment: "inventory",
        title: "Inventory",
        summary: "Vehicle stock, specs, and listing status",
        emptyTitle: "No Gen 2 inventory yet",
        emptyBody:
          "Vehicle stock remains on WordPress Gen 1 Dealership until Neon inventory SoT ships.",
      },
      {
        segment: "leads",
        title: "Buyer leads",
        summary: "Enquiries and sales pipeline",
        emptyTitle: "Buyer leads → CRM / Gen 1",
        emptyBody:
          "Use CRM or Gen 1 dealer pipeline. No fake finance pre-approval scores here.",
      },
      {
        segment: "test-drives",
        title: "Test drives",
        summary: "Bookings, calendar, and follow-ups",
        emptyTitle: "No test-drive calendar yet",
        emptyBody:
          "Booking UI is planned. Do not treat this route as a live schedule.",
      },
    ],
    staffDocSlug: "business-apps-scaffold",
    staffDocLabel: "Business Apps scaffold checklist",
  },
};

export function getBusinessAppScaffold(
  id: BusinessAppScaffoldId,
): BusinessAppScaffold {
  return BUSINESS_APP_SCAFFOLDS[id];
}

export function getBusinessAppRoute(
  app: BusinessAppScaffold,
  segment: string,
): BusinessAppRouteDef | undefined {
  return app.routes.find((r) => r.segment === segment);
}
