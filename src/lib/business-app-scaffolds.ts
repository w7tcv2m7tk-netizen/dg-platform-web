/**
 * Shared scaffold floor for deferred Business Apps (Finance, Creator, Commercial, Automotive).
 * Matches Marketing / Social honesty pattern — product map + Core links, not fake product.
 * @see docs/foundations/BUSINESS-APPS-SCAFFOLD.md
 */

export type BusinessAppScaffoldId =
  | "finance"
  | "creator"
  | "commercial"
  | "automotive";

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
    name: "Commercial",
    icon: "▦",
    tagline: "Commercial property, leases, and tenants — distinct from residential RE",
    deferredTitle: "Scaffold floor — not residential Real Estate",
    deferredBody:
      "Commercial is a separate Business App from Real Estate (residential vendor/buyer). No portfolio valuations, occupancy %, or rent-roll MRR are shown until data is real.",
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
        href: "/apps/crm/contacts",
        label: "CRM contacts",
        note: "Tenant and landlord contacts today",
      },
      {
        href: "/apps/crm/companies",
        label: "CRM companies",
        note: "Corporate tenants and owners",
      },
    ],
    routes: [
      {
        segment: "",
        title: "Commercial",
        summary: "Portfolio dashboard for commercial property ops",
        emptyTitle: "Commercial App scaffold",
        emptyBody:
          "Portfolio KPIs stay empty until leases and properties are modelled. Use RE only for residential.",
      },
      {
        segment: "properties",
        title: "Properties",
        summary: "Commercial property register",
        emptyTitle: "No commercial register yet",
        emptyBody:
          "Commercial assets are not the same as RE residential listings. Register UI is planned.",
      },
      {
        segment: "leases",
        title: "Leases",
        summary: "Lease terms, renewals, and rent schedules",
        emptyTitle: "No leases store yet",
        emptyBody:
          "Lease documents and rent schedules are planned — no placeholder rent rolls.",
      },
      {
        segment: "tenants",
        title: "Tenants",
        summary: "Tenant records and communication history",
        emptyTitle: "Tenants → CRM for now",
        emptyBody:
          "Use CRM contacts and companies until commercial tenant context ships.",
      },
    ],
    staffDocSlug: "business-apps-scaffold",
    staffDocLabel: "Business Apps scaffold checklist",
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
