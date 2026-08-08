/**
 * Platform Gen 2 roadmap — single source for progress UI and coming-soon placeholders.
 * Update status here as features ship.
 */

export type RoadmapStatus = "done" | "in_progress" | "scaffold" | "planned";

export type RoadmapPriority = "high" | "medium" | "low";

export interface RoadmapItem {
  id: string;
  area: string;
  label: string;
  description: string;
  status: RoadmapStatus;
  priority?: RoadmapPriority;
  href?: string;
  appId?: string;
}

const STATUS_WEIGHT: Record<RoadmapStatus, number> = {
  done: 1,
  in_progress: 0.65,
  scaffold: 0.35,
  planned: 0.05,
};

export const PLATFORM_ROADMAP: RoadmapItem[] = [
  // —— Platform ——
  {
    id: "platform.auth",
    area: "Platform",
    label: "Auth & org provisioning",
    description: "Clerk sign-in, Postgres orgs, team members",
    status: "done",
    href: "/dashboard",
  },
  {
    id: "platform.setup",
    area: "Platform",
    label: "Setup checklist",
    description: "Onboarding progress tracked in Postgres",
    status: "done",
    href: "/dashboard",
  },
  {
    id: "platform.apps",
    area: "Platform",
    label: "Apps registry & navigation",
    description: "Manifest-driven apps, tiers, and sidebar nav",
    status: "done",
    href: "/dashboard/apps",
  },
  {
    id: "platform.roadmap",
    area: "Platform",
    label: "Roadmap & progress UI",
    description: "Overview progress bar and coming-soon placeholders",
    status: "done",
    href: "/dashboard/settings/roadmap",
  },
  {
    id: "platform.settings",
    area: "Platform",
    label: "Settings",
    description: "Platform settings, connectors, team, and support",
    status: "done",
    href: "/dashboard/settings",
  },
  {
    id: "platform.overview",
    area: "Platform",
    label: "Business Overview (CEO dashboard)",
    description: "AI briefing, Business Health, priorities, and recommended actions",
    status: "done",
    href: "/dashboard",
  },
  {
    id: "platform.api",
    area: "Platform",
    label: "Platform API v1",
    description: "Org-scoped REST API with dg_live_ keys, catalog, and settings UI",
    status: "done",
    href: "/dashboard/settings/api",
  },
  {
    id: "platform.audit",
    area: "Platform",
    label: "Audit log",
    description: "Immutable write log for contacts, companies, and commerce",
    status: "done",
    href: "/dashboard/settings/audit",
  },
  {
    id: "platform.permissions",
    area: "Platform",
    label: "Role-based API permissions",
    description: "Owner/admin write · member read-only on Core APIs",
    status: "done",
    href: "/dashboard/settings/team",
  },

  // —— CRM ——
  {
    id: "crm.contacts",
    area: "CRM",
    label: "Contacts",
    description: "Create, view, and manage contacts",
    status: "done",
    appId: "crm",
    href: "/apps/crm/contacts",
  },
  {
    id: "crm.companies",
    area: "CRM",
    label: "Companies",
    description: "Company records linked to contacts",
    status: "done",
    appId: "crm",
    href: "/apps/crm/companies",
  },
  {
    id: "crm.timeline",
    area: "CRM",
    label: "Unified timeline",
    description: "Cross-entity activity feed",
    status: "done",
    appId: "crm",
    href: "/apps/crm/timeline",
  },
  {
    id: "crm.import",
    area: "CRM",
    label: "Import & export",
    description: "CSV import and bulk export",
    status: "done",
    appId: "crm",
    href: "/apps/crm/contacts",
  },

  // —— Real Estate ——
  {
    id: "re.overview",
    area: "Real Estate",
    label: "Overview",
    description: "Pipeline KPIs, vendor and buyer counts, WordPress summary",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re",
  },
  {
    id: "re.vendor_leads",
    area: "Real Estate",
    label: "Vendor leads pipeline",
    description: "Kanban stages, WordPress sync, lead detail",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re/vendor-leads",
  },
  {
    id: "re.properties",
    area: "Real Estate",
    label: "Properties & appraisals",
    description: "Property records, geocoding, status workflow",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re/properties",
  },
  {
    id: "re.pipeline_sync",
    area: "Real Estate",
    label: "Lead ↔ property sync",
    description: "Bidirectional stage/status sync and WP upsert",
    status: "done",
    priority: "high",
    appId: "real-estate",
  },
  {
    id: "re.buyers",
    area: "Real Estate",
    label: "Buyer leads",
    description: "Buyer kanban, stage editing, detail pages, WordPress sync",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re/buyer-leads",
  },
  {
    id: "re.listings",
    area: "Real Estate",
    label: "Listings",
    description: "Active listings, guide price, and marketing status",
    status: "done",
    appId: "real-estate",
    href: "/apps/re/listings",
  },
  {
    id: "re.bookings",
    area: "Real Estate",
    label: "Bookings",
    description: "Appraisal and consultation bookings — live from WordPress",
    status: "done",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re/bookings",
  },
  {
    id: "re.settlements",
    area: "Real Estate",
    label: "Settlements",
    description: "Settlement checklist and conveyancing handoff",
    status: "done",
    appId: "real-estate",
    href: "/apps/re/settlements",
  },

  // —— Accommodation ——
  {
    id: "accommodation.overview",
    area: "Accommodation",
    label: "Overview",
    description: "Hospitality dashboard — occupancy and revenue from WordPress",
    status: "done",
    priority: "high",
    appId: "accommodation",
    href: "/apps/accommodation",
  },
  {
    id: "accommodation.units",
    area: "Accommodation",
    label: "Units",
    description: "Domes, cabins, and short-stay accommodation units",
    status: "done",
    priority: "high",
    appId: "accommodation",
    href: "/apps/accommodation/units",
  },
  {
    id: "accommodation.bookings",
    area: "Accommodation",
    label: "Bookings",
    description: "Reservations and guest details — live from WordPress",
    status: "done",
    priority: "high",
    appId: "accommodation",
    href: "/apps/accommodation/bookings",
  },
  {
    id: "accommodation.calendar",
    area: "Accommodation",
    label: "Availability",
    description: "Availability calendar and rate management",
    status: "done",
    priority: "high",
    appId: "accommodation",
    href: "/apps/accommodation/calendar",
  },
  {
    id: "accommodation.housekeeping",
    area: "Accommodation",
    label: "Housekeeping",
    description: "Turnover cleaning, QR checklists, and maintenance",
    status: "done",
    priority: "high",
    appId: "accommodation",
    href: "/apps/accommodation/housekeeping",
  },
  {
    id: "accommodation.guests",
    area: "Accommodation",
    label: "Guests",
    description: "Contacts with Accommodation guest context (stays, LTV, VIP/repeat)",
    status: "done",
    priority: "high",
    appId: "accommodation",
    href: "/apps/accommodation/guests",
  },

  // —— Finance ——
  {
    id: "finance.overview",
    area: "Finance",
    label: "Overview",
    description: "Broker dashboard — pipeline, approvals, and commissions",
    status: "planned",
    appId: "finance",
    href: "/apps/finance",
  },
  {
    id: "finance.pipeline",
    area: "Finance",
    label: "Pipeline",
    description: "Loan and finance application pipeline",
    status: "planned",
    appId: "finance",
    href: "/apps/finance/pipeline",
  },
  {
    id: "finance.clients",
    area: "Finance",
    label: "Clients",
    description: "Finance client records and document collection",
    status: "planned",
    appId: "finance",
    href: "/apps/finance/clients",
  },
  {
    id: "finance.applications",
    area: "Finance",
    label: "Applications",
    description: "Application forms, status tracking, and lender submissions",
    status: "planned",
    appId: "finance",
    href: "/apps/finance/applications",
  },

  // —— Services ——
  {
    id: "services.overview",
    area: "Services",
    label: "Overview",
    description: "Field service dashboard — jobs, schedule, and revenue",
    status: "planned",
    appId: "services",
    href: "/apps/services",
  },
  {
    id: "services.jobs",
    area: "Services",
    label: "Jobs",
    description: "Work orders, job status, and technician assignment",
    status: "planned",
    appId: "services",
    href: "/apps/services/jobs",
  },
  {
    id: "services.scheduling",
    area: "Services",
    label: "Scheduling",
    description: "Calendar scheduling and route planning",
    status: "planned",
    appId: "services",
    href: "/apps/services/scheduling",
  },
  {
    id: "services.quotes",
    area: "Services",
    label: "Quotes",
    description: "Service quotes linked to Commerce",
    status: "planned",
    appId: "services",
    href: "/apps/services/quotes",
  },

  // —— Creator ——
  {
    id: "creator.overview",
    area: "Creator",
    label: "Overview",
    description: "Creator dashboard — content, members, and revenue",
    status: "planned",
    appId: "creator",
    href: "/apps/creator",
  },
  {
    id: "creator.content",
    area: "Creator",
    label: "Content library",
    description: "Posts, courses, and digital assets",
    status: "planned",
    appId: "creator",
    href: "/apps/creator/content",
  },
  {
    id: "creator.memberships",
    area: "Creator",
    label: "Memberships",
    description: "Membership tiers and subscriber management",
    status: "planned",
    appId: "creator",
    href: "/apps/creator/memberships",
  },
  {
    id: "creator.storefront",
    area: "Creator",
    label: "Storefront",
    description: "Digital products and checkout pages",
    status: "planned",
    appId: "creator",
    href: "/apps/creator/storefront",
  },

  // —— Commercial ——
  {
    id: "commercial.overview",
    area: "Commercial",
    label: "Overview",
    description: "Commercial portfolio dashboard",
    status: "planned",
    appId: "commercial",
    href: "/apps/commercial",
  },
  {
    id: "commercial.properties",
    area: "Commercial",
    label: "Properties",
    description: "Commercial property register",
    status: "planned",
    appId: "commercial",
    href: "/apps/commercial/properties",
  },
  {
    id: "commercial.leases",
    area: "Commercial",
    label: "Leases",
    description: "Lease terms, renewals, and rent schedules",
    status: "planned",
    appId: "commercial",
    href: "/apps/commercial/leases",
  },
  {
    id: "commercial.tenants",
    area: "Commercial",
    label: "Tenants",
    description: "Tenant records and communication history",
    status: "planned",
    appId: "commercial",
    href: "/apps/commercial/tenants",
  },

  // —— Automotive ——
  {
    id: "automotive.overview",
    area: "Automotive",
    label: "Overview",
    description: "Dealership dashboard — inventory, leads, and test drives",
    status: "planned",
    appId: "automotive",
    href: "/apps/automotive",
  },
  {
    id: "automotive.inventory",
    area: "Automotive",
    label: "Inventory",
    description: "Vehicle stock, specs, and listing status",
    status: "planned",
    appId: "automotive",
    href: "/apps/automotive/inventory",
  },
  {
    id: "automotive.leads",
    area: "Automotive",
    label: "Buyer leads",
    description: "Enquiries, finance pre-approval, and sales pipeline",
    status: "planned",
    appId: "automotive",
    href: "/apps/automotive/leads",
  },
  {
    id: "automotive.test_drives",
    area: "Automotive",
    label: "Test drives",
    description: "Bookings, calendar, and follow-up automations",
    status: "planned",
    appId: "automotive",
    href: "/apps/automotive/test-drives",
  },

  // —— Commerce ——
  {
    id: "commerce.payments",
    area: "Commerce",
    label: "Payment requests & Stripe checkout",
    description: "Checkout links on vendor leads, webhook + success fallback",
    status: "done",
    priority: "high",
    appId: "commerce",
    href: "/apps/commerce/payments",
  },
  {
    id: "commerce.payment_history",
    area: "Commerce",
    label: "Payment history UI",
    description: "Per-lead payment request list and status",
    status: "done",
    appId: "commerce",
    href: "/apps/re/vendor-leads",
  },
  {
    id: "commerce.quotes",
    area: "Commerce",
    label: "Quotes",
    description: "Quote engine, API, list view, and create form",
    status: "done",
    priority: "medium",
    appId: "commerce",
    href: "/apps/commerce/quotes",
  },
  {
    id: "commerce.invoices",
    area: "Commerce",
    label: "Invoices",
    description: "Invoice engine, send flow, list view, and create form",
    status: "done",
    priority: "medium",
    appId: "commerce",
    href: "/apps/commerce/invoices",
  },
  {
    id: "commerce.financial_health",
    area: "Commerce",
    label: "Twin financial health",
    description: "Revenue MTD/YTD, AR, overdue snapshot",
    status: "scaffold",
    appId: "commerce",
    href: "/apps/commerce",
  },
  {
    id: "commerce.products",
    area: "Commerce",
    label: "Products & catalog",
    description: "Product catalogue for quotes and checkout",
    status: "planned",
    appId: "commerce",
    href: "/apps/commerce/products",
  },
  {
    id: "commerce.subscriptions",
    area: "Commerce",
    label: "Subscriptions & MRR",
    description: "Recurring billing and subscription management",
    status: "planned",
    appId: "commerce",
    href: "/apps/commerce/subscriptions",
  },

  // —— Websites ——
  {
    id: "websites.health",
    area: "Websites",
    label: "Website Health Centre",
    description: "WordPress health score, PageSpeed, SSL checks",
    status: "done",
    priority: "medium",
    appId: "websites",
    href: "/apps/websites/health",
  },
  {
    id: "websites.multi_site",
    area: "Websites",
    label: "Multi-site health",
    description: "Site picker and DG_WP_HEALTH_SITES config",
    status: "scaffold",
    appId: "websites",
    href: "/apps/websites/health",
  },
  {
    id: "websites.studio",
    area: "Websites",
    label: "AI Website Studio",
    description: "Generate sites, pages, and copy with AI",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/studio",
  },
  {
    id: "websites.content",
    area: "Websites",
    label: "Content Studio",
    description: "Blog, suburb pages, and social content",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/content",
  },
  {
    id: "websites.funnels",
    area: "Websites",
    label: "Funnel Builder",
    description: "Landing pages and conversion funnels",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/funnels",
  },
  {
    id: "websites.sites",
    area: "Websites",
    label: "Sites manager",
    description: "Connected sites, domains, and publish status",
    status: "planned",
    appId: "websites",
    href: "/apps/websites/sites",
  },

  // —— Automation ——
  {
    id: "automation.engine",
    area: "Automation",
    label: "Automation engine",
    description: "In-process rules, triggers from app manifests",
    status: "scaffold",
    priority: "low",
    appId: "automation",
  },
  {
    id: "automation.ui",
    area: "Automation",
    label: "Automation builder UI",
    description: "Visual trigger → action rules per org",
    status: "scaffold",
    appId: "automation",
    href: "/apps/automation",
  },
  {
    id: "automation.rules",
    area: "Automation",
    label: "Rules list",
    description: "View and manage automation rules",
    status: "planned",
    appId: "automation",
    href: "/apps/automation/rules",
  },
  {
    id: "automation.logs",
    area: "Automation",
    label: "Run log",
    description: "Automation execution history and errors",
    status: "planned",
    appId: "automation",
    href: "/apps/automation/logs",
  },
  {
    id: "automation.commerce_rules",
    area: "Automation",
    label: "Commerce automations",
    description: "Payment completed, quote accepted, invoice overdue",
    status: "scaffold",
    appId: "automation",
  },

  // —— Analytics ——
  {
    id: "analytics.overview",
    area: "Analytics",
    label: "Overview",
    description: "Cross-channel KPI dashboard — Analytics Pro on Gen 2",
    status: "planned",
    appId: "analytics",
    href: "/apps/analytics",
  },
  {
    id: "analytics.dashboard",
    area: "Analytics",
    label: "Dashboard",
    description: "KPI snapshots and trend charts",
    status: "planned",
    appId: "analytics",
    href: "/apps/analytics/dashboard",
  },
  {
    id: "analytics.reports",
    area: "Analytics",
    label: "Reports",
    description: "Scheduled and exportable analytics reports",
    status: "planned",
    appId: "analytics",
    href: "/apps/analytics/reports",
  },
  {
    id: "analytics.connectors",
    area: "Analytics",
    label: "Data sources",
    description: "Google Analytics, Ads, Meta, and connector feeds",
    status: "planned",
    appId: "analytics",
    href: "/apps/analytics/connectors",
  },

  // —— Social Management ——
  {
    id: "social.overview",
    area: "Social Management",
    label: "Overview",
    description: "Social publishing hub — Social Pro on Gen 2",
    status: "planned",
    appId: "social",
    href: "/apps/social",
  },
  {
    id: "social.compose",
    area: "Social Management",
    label: "Compose",
    description: "Write once, publish to LinkedIn, Facebook, Instagram, X, Pinterest",
    status: "planned",
    appId: "social",
    href: "/apps/social/compose",
  },
  {
    id: "social.calendar",
    area: "Social Management",
    label: "Content calendar",
    description: "Scheduled posts and campaign slots",
    status: "planned",
    appId: "social",
    href: "/apps/social/calendar",
  },
  {
    id: "social.accounts",
    area: "Social Management",
    label: "Connected accounts",
    description: "OAuth connections to social platforms",
    status: "planned",
    appId: "social",
    href: "/apps/social/accounts",
  },

  // —— Marketing ——
  {
    id: "marketing.overview",
    area: "Marketing",
    label: "Overview",
    description: "Campaigns, channels, and agency audit workflow",
    status: "planned",
    appId: "marketing",
    href: "/apps/marketing",
  },
  {
    id: "marketing.campaigns",
    area: "Marketing",
    label: "Campaigns",
    description: "Email, social, and multi-channel campaigns",
    status: "planned",
    appId: "marketing",
    href: "/apps/marketing/campaigns",
  },
  {
    id: "marketing.channels",
    area: "Marketing",
    label: "Channels",
    description: "Channel performance and attribution",
    status: "planned",
    appId: "marketing",
    href: "/apps/marketing/channels",
  },
  {
    id: "marketing.audits",
    area: "Marketing",
    label: "Agency audits",
    description: "AI visibility and agency audit pipeline (DigitalGate internal CRM)",
    status: "planned",
    appId: "marketing",
    href: "/apps/marketing/audits",
  },

  // —— Reviews ——
  {
    id: "reviews.overview",
    area: "Reviews",
    label: "Overview",
    description: "Reputation dashboard, Acc feed, and theme stub",
    status: "scaffold",
    appId: "reviews",
    href: "/apps/reviews",
  },
  {
    id: "reviews.inbox",
    area: "Reviews",
    label: "Review inbox",
    description: "Unified inbox — Acc dg_reviews live when connector available",
    status: "scaffold",
    appId: "reviews",
    href: "/apps/reviews/inbox",
  },
  {
    id: "reviews.sources",
    area: "Reviews",
    label: "Review sources",
    description: "Connect / monitor concepts for GBP, Meta, Acc, manual",
    status: "scaffold",
    appId: "reviews",
    href: "/apps/reviews/sources",
  },
  {
    id: "reviews.requests",
    area: "Reviews",
    label: "Review requests",
    description: "Queue review requests after completed stay / settlement",
    status: "scaffold",
    appId: "reviews",
    href: "/apps/reviews/requests",
  },
  {
    id: "reviews.reputation",
    area: "Reviews",
    label: "Reputation score",
    description: "Reputation Score™ stub from live Acc feed + AI themes",
    status: "scaffold",
    appId: "reviews",
    href: "/apps/reviews/reputation",
  },
  // —— Network / Marketplace ——
  {
    id: "network.overview",
    area: "Network",
    label: "Network home",
    description: "B2B referral network scaffold (separate from Refer & Earn)",
    status: "scaffold",
    href: "/dashboard/network",
  },
  {
    id: "network.referrals",
    area: "Network",
    label: "Business referrals",
    description: "Free/Reciprocal/Paid/Commission disclosed funnel on Contact",
    status: "scaffold",
    href: "/dashboard/network/referrals",
  },
  {
    id: "marketplace.browse",
    area: "Marketplace",
    label: "Marketplace browse",
    description: "Software · Services · Professionals · Partners · Integrations",
    status: "scaffold",
    href: "/dashboard/marketplace",
  },

  // —— AI Communications ——
  {
    id: "comms.stub",
    area: "AI Communications",
    label: "Messages API stub",
    description: "Queued send intent — providers not wired",
    status: "scaffold",
    appId: "ai-communications",
  },
  {
    id: "comms.inbox",
    area: "AI Communications",
    label: "Unified inbox",
    description: "Email, SMS, and chat threads",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/inbox",
  },
  {
    id: "comms.voice",
    area: "AI Communications",
    label: "Voice agents",
    description: "Inbound/outbound AI voice",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/voice",
  },
  {
    id: "comms.agents",
    area: "AI Communications",
    label: "Agent builder",
    description: "Configure AI agents and knowledge",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/agents",
  },
  {
    id: "comms.call_centre",
    area: "AI Communications",
    label: "Call centre",
    description: "Live call queue and agent handoff",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/call-centre",
  },
  {
    id: "comms.knowledge",
    area: "AI Communications",
    label: "Knowledge base",
    description: "Training content for AI agents",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/knowledge",
  },
  {
    id: "comms.settings",
    area: "AI Communications",
    label: "Communications settings",
    description: "Provider keys, channels, and defaults",
    status: "planned",
    appId: "ai-communications",
    href: "/apps/ai-communications/settings",
  },

  // —— Growth ——
  {
    id: "seo.audit",
    area: "SEO & Visibility",
    label: "SEO page audit",
    description: "On-page and technical SEO scoring",
    status: "planned",
    appId: "seo",
    href: "/apps/seo/audit",
  },
  {
    id: "ai_vis.dashboard",
    area: "SEO & Visibility",
    label: "AI Visibility dashboard",
    description: "Brand presence across AI platforms",
    status: "planned",
    appId: "ai-visibility",
    href: "/apps/ai-visibility",
  },

  // —— Infrastructure ——
  {
    id: "infra.domains",
    area: "Infrastructure",
    label: "Domains",
    description: "Domain registration and renewal",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/domains",
  },
  {
    id: "infra.dns",
    area: "Infrastructure",
    label: "DNS management",
    description: "DNS records and propagation checks",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/dns",
  },
  {
    id: "infra.hosting",
    area: "Infrastructure",
    label: "Hosting",
    description: "Hosting plans and provisioning",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/hosting",
  },
  {
    id: "infra.deployments",
    area: "Infrastructure",
    label: "Deployments",
    description: "Staging and production deploy pipeline",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/deployments",
  },
  {
    id: "infra.monitoring",
    area: "Infrastructure",
    label: "Monitoring",
    description: "Uptime and performance monitoring",
    status: "planned",
    appId: "infrastructure",
    href: "/apps/infrastructure/monitoring",
  },

  // —— Command Centre (internal) ——
  {
    id: "command.overview",
    area: "Command Centre",
    label: "Platform overview",
    description: "DigitalGate internal ops dashboard — pulse, actions, deep links",
    status: "done",
    appId: "command-centre",
    href: "/command",
  },
  {
    id: "command.clients",
    area: "Command Centre",
    label: "Client intelligence",
    description: "Organisation health signals across clients (Success Score pending Scoring v1)",
    status: "done",
    appId: "command-centre",
    href: "/command/clients",
  },
  {
    id: "command.platform_health",
    area: "Command Centre",
    label: "Platform health",
    description: "Connectors, Stripe checklist, and ops load (APM later)",
    status: "done",
    appId: "command-centre",
    href: "/command/platform-health",
  },
  {
    id: "command.revenue",
    area: "Command Centre",
    label: "Revenue intelligence",
    description: "Commerce MRR snapshot, invoices MTD, Refer & Earn",
    status: "done",
    appId: "command-centre",
    href: "/command/revenue",
  },
  {
    id: "command.opportunities",
    area: "Command Centre",
    label: "Client expansion",
    description: "Upsell and expansion signals on live tenants",
    status: "planned",
    appId: "command-centre",
    href: "/command/opportunities",
  },
  {
    id: "command.benchmarks",
    area: "Command Centre",
    label: "Benchmarking",
    description: "Cross-client performance benchmarks",
    status: "planned",
    appId: "command-centre",
    href: "/command/benchmarks",
  },
  {
    id: "command.reports",
    area: "Command Centre",
    label: "Executive reporting",
    description: "Growth reports and agency rankings",
    status: "planned",
    appId: "command-centre",
    href: "/command/reports",
  },
  {
    id: "command.support",
    area: "Command Centre",
    label: "Support centre",
    description: "Client support queue and SLAs",
    status: "planned",
    appId: "command-centre",
    href: "/command/support",
  },
  {
    id: "command.flags",
    area: "Command Centre",
    label: "Feature flags",
    description: "Beta features and rollout controls",
    status: "planned",
    appId: "command-centre",
    href: "/command/flags",
  },
  {
    id: "command.audit",
    area: "Command Centre",
    label: "Audit & compliance",
    description: "Audit logs and compliance exports",
    status: "planned",
    appId: "command-centre",
    href: "/command/audit",
  },

  // —— Growth Engine (Command Centre acquisition) ——
  {
    id: "growth.engine_hub",
    area: "Growth Engine",
    label: "Growth Engine hub",
    description: "Command Centre acquisition OS shell and module navigation",
    status: "done",
    appId: "command-centre",
    href: "/command/growth-engine",
  },
  {
    id: "growth.discovery",
    area: "Growth Engine",
    label: "Business discovery",
    description: "Search businesses by industry, location, and digital signals",
    status: "done",
    appId: "command-centre",
    href: "/command/growth-engine/discovery",
  },
  {
    id: "growth.audit",
    area: "Growth Engine",
    label: "AI Audit Engine™",
    description: "Automated website, SEO, AI Visibility, GBP, and identity audit",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine/audits",
  },
  {
    id: "growth.reports",
    area: "Growth Engine",
    label: "Opportunity reports",
    description: "Branded interactive audit reports for prospects",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine/reports",
  },
  {
    id: "growth.pipeline",
    area: "Growth Engine",
    label: "Prospect pipeline",
    description: "Auto CRM from report sent through meeting and proposal",
    status: "done",
    appId: "command-centre",
    href: "/command/growth-engine/pipeline",
  },
  {
    id: "growth.follow_up",
    area: "Growth Engine",
    label: "Smart follow-up",
    description: "Engagement-triggered reminders and tasks",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine/follow-ups",
  },
  {
    id: "growth.sales_assistant",
    area: "Growth Engine",
    label: "AI sales assistant",
    description: "Who to call today — ranked by engagement and scores",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine",
  },
  {
    id: "growth.proposals",
    area: "Growth Engine",
    label: "Proposal generator",
    description: "AI proposals with services, pricing, ROI, and timeline",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine/proposals",
  },
  {
    id: "growth.conversions",
    area: "Growth Engine",
    label: "Conversion dashboard",
    description: "Audits, open rates, meetings, MRR won, and forecast",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine/conversions",
  },
  {
    id: "growth.transition",
    area: "Growth Engine",
    label: "Client transition",
    description: "Prospect accepted → org, subscription, apps, onboarding, Twin",
    status: "planned",
    appId: "command-centre",
    href: "/command/growth-engine/pipeline",
  },

  // —— WP Detach (see docs/WP-DETACH-BACKLOG.md) ——
  {
    id: "detach.roe_sot",
    area: "WP Detach",
    label: "P1 · Roe RE source of truth",
    description:
      "Lead create/UI + stage SoT in Gen 2; WP forms dual-write via dg-leads; optional stage write-back",
    status: "in_progress",
    priority: "high",
    appId: "real-estate",
    href: "/apps/re",
  },
  {
    id: "detach.portal_billing",
    area: "WP Detach",
    label: "P2 · Portal & billing entitlements",
    description: "Drop portal/me bridge; Gen 2 Stripe checkout owns apps/tier",
    status: "planned",
    priority: "high",
    href: "/dashboard/settings/billing",
  },
  {
    id: "detach.support_health",
    area: "WP Detach",
    label: "P3 · Support & health off WP",
    description: "Native support store; Health Centre without /site/health SoT",
    status: "planned",
    priority: "medium",
    href: "/apps/websites/health",
  },
  {
    id: "detach.cvh_bookings",
    area: "WP Detach",
    label: "P4 · CVH booking SoT",
    description:
      "StayBooking + AccommodationUnit soft SoT; HK Neon-first; Gen 2-first ops create behind flag; public book-now still WP",
    status: "in_progress",
    priority: "medium",
    appId: "accommodation",
    href: "/apps/accommodation/bookings",
  },
  {
    id: "detach.public_headless",
    area: "WP Detach",
    label: "P5 · Public / headless",
    description: "WP publish as connector mirror; Website Studio without WP SoT",
    status: "planned",
    priority: "low",
    appId: "websites",
    href: "/apps/websites/sites",
  },
];

export function getRoadmapItem(id: string): RoadmapItem | undefined {
  return PLATFORM_ROADMAP.find((item) => item.id === id);
}

/** Match a route path to the best roadmap entry (exact href, then prefix). */
export function getRoadmapItemByHref(href: string): RoadmapItem | undefined {
  const normalised = href.replace(/\/$/, "") || "/";
  const exact = PLATFORM_ROADMAP.find(
    (item) => item.href?.replace(/\/$/, "") === normalised,
  );
  if (exact) return exact;

  const prefixMatches = PLATFORM_ROADMAP.filter(
    (item) => item.href && normalised.startsWith(item.href.replace(/\/$/, "")),
  );
  prefixMatches.sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0));
  return prefixMatches[0];
}

export function getRoadmapStatusForPath(path: string): RoadmapStatus {
  const item = getRoadmapItemByHref(path);
  return item?.status ?? "planned";
}

export function getRoadmapByArea() {
  const areas = new Map<string, RoadmapItem[]>();
  for (const item of PLATFORM_ROADMAP) {
    const list = areas.get(item.area) ?? [];
    list.push(item);
    areas.set(item.area, list);
  }
  return [...areas.entries()].map(([area, items]) => ({ area, items }));
}

export function getRoadmapForApp(appId: string) {
  return PLATFORM_ROADMAP.filter((item) => item.appId === appId);
}

export interface RoadmapSummary {
  total: number;
  done: number;
  inProgress: number;
  scaffold: number;
  planned: number;
  percentComplete: number;
  label: string;
}

export function getRoadmapSummary(): RoadmapSummary {
  const total = PLATFORM_ROADMAP.length;
  const done = PLATFORM_ROADMAP.filter((i) => i.status === "done").length;
  const inProgress = PLATFORM_ROADMAP.filter((i) => i.status === "in_progress").length;
  const scaffold = PLATFORM_ROADMAP.filter((i) => i.status === "scaffold").length;
  const planned = PLATFORM_ROADMAP.filter((i) => i.status === "planned").length;

  const weighted = PLATFORM_ROADMAP.reduce((sum, item) => sum + STATUS_WEIGHT[item.status], 0);
  const percentComplete = total ? Math.round((weighted / total) * 100) : 0;

  return {
    total,
    done,
    inProgress,
    scaffold,
    planned,
    percentComplete,
    label: `Platform Gen 2 · ${percentComplete}% complete`,
  };
}

export function roadmapStatusLabel(status: RoadmapStatus): string {
  switch (status) {
    case "done":
      return "Done";
    case "in_progress":
      return "In progress";
    case "scaffold":
      return "Scaffold";
    case "planned":
      return "Coming soon";
  }
}
