/**
 * Per-app setup guides — linked from Dashboard → Apps.
 * Update steps here as each app ships production setup flows.
 */

export interface AppSetupStep {
  id: string;
  title: string;
  description: string;
  detail?: string;
  href?: string;
  hrefLabel?: string;
  code?: string;
}

export interface AppSetupResource {
  label: string;
  href: string;
  external?: boolean;
}

export interface AppSetupEnvVar {
  name: string;
  description: string;
  example?: string;
}

export interface AppSetupGuide {
  appId: string;
  headline: string;
  summary: string;
  estimatedMinutes?: number;
  prerequisites?: string[];
  steps: AppSetupStep[];
  resources?: AppSetupResource[];
  envVars?: AppSetupEnvVar[];
}

export const APP_SETUP_GUIDES: AppSetupGuide[] = [
  {
    appId: "crm",
    headline: "Get your CRM running",
    summary:
      "Contacts are the foundation of every DigitalGate App. Start here before enabling industry or growth modules.",
    estimatedMinutes: 10,
    prerequisites: ["Organisation provisioned in Postgres", "Clerk sign-in configured"],
    steps: [
      {
        id: "crm-1",
        title: "Confirm organisation is live",
        description:
          "Sign in and open Overview — you should see your organisation name and Platform 1.0 setup checklist.",
        href: "/dashboard",
        hrefLabel: "Open overview",
      },
      {
        id: "crm-2",
        title: "Create your first contact",
        description:
          "Add a contact manually or wait for WordPress connector sync. Contacts power timeline, Commerce, and Real Estate.",
        href: "/apps/crm/contacts",
        hrefLabel: "Open contacts",
      },
      {
        id: "crm-3",
        title: "Review contact detail & timeline",
        description:
          "Open a contact to see the unified activity timeline — every App writes here.",
        detail: "Add a note or check synced activities from WordPress.",
      },
      {
        id: "crm-4",
        title: "Invite team members",
        description:
          "Use Clerk organisation settings to invite agents or staff. Permissions roll out per App in later releases.",
        href: "/dashboard",
        hrefLabel: "Team settings (Clerk)",
      },
    ],
    resources: [
      { label: "Core object specification", href: "/dashboard", external: false },
    ],
  },
  {
    appId: "commerce",
    headline: "Connect Stripe & take payments",
    summary:
      "Commerce is the customer-facing commercial layer — payment requests, quotes, invoices, and checkout across every App.",
    estimatedMinutes: 20,
    prerequisites: ["CRM contacts available", "Stripe account (test mode to start)"],
    steps: [
      {
        id: "commerce-1",
        title: "Add Stripe keys to Vercel",
        description:
          "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your deployment environment. Use sk_test_ keys while testing.",
        code: "STRIPE_SECRET_KEY=sk_test_...\nSTRIPE_WEBHOOK_SECRET=whsec_...",
      },
      {
        id: "commerce-2",
        title: "Register the webhook endpoint",
        description:
          "In Stripe Dashboard → Developers → Webhooks, add your app URL and listen for checkout.session.completed.",
        code: "https://app.digitalgate.com.au/api/webhooks/stripe",
      },
      {
        id: "commerce-3",
        title: "Verify the setup checklist",
        description:
          "Open Commerce → Payments and confirm all checklist items are green before going live.",
        href: "/apps/commerce/payments",
        hrefLabel: "Commerce payments",
      },
      {
        id: "commerce-4",
        title: "Send a test payment request",
        description:
          "From a Real Estate vendor lead, use Request payment. Pay with test card 4242 4242 4242 4242 and confirm status becomes paid.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Vendor leads",
      },
    ],
    envVars: [
      {
        name: "STRIPE_SECRET_KEY",
        description: "Stripe secret key (test or live)",
        example: "sk_test_...",
      },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        description: "Signing secret from Stripe webhook destination",
        example: "whsec_...",
      },
      {
        name: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
        description: "Optional — for future embedded checkout",
        example: "pk_test_...",
      },
    ],
    resources: [
      {
        label: "Stripe Dashboard",
        href: "https://dashboard.stripe.com/test/webhooks",
        external: true,
      },
    ],
  },
  {
    appId: "real-estate",
    headline: "Connect Roe Realty to Gen 2",
    summary:
      "Sync vendor leads, properties, and appraisals from WordPress into Postgres — Roe agents work in the platform, not wp-admin.",
    estimatedMinutes: 25,
    prerequisites: ["DG Platform plugin on roerealty.com.au", "CRM contacts", "Commerce (optional, for payments)"],
    steps: [
      {
        id: "re-1",
        title: "Deploy the WordPress plugin",
        description:
          "Upload the latest dg-platform-build zip to roerealty.com.au. Confirm Real Estate module is enabled.",
        detail: "Plugins → DG Platform → Modules → Real Estate ✓",
      },
      {
        id: "re-2",
        title: "Configure the WordPress connector",
        description:
          "Set the connector API key and base URL in Vercel so Gen 2 can pull vendor leads.",
        code: "DG_WP_CONNECTOR_API_KEY=dgdev_...\nDG_WP_CONNECTOR_BASE_URL=https://roerealty.com.au/wp-json/digitalgate/v1",
      },
      {
        id: "re-3",
        title: "Enable geocoding (recommended)",
        description:
          "Add GOOGLE_GEOCODING_API_KEY for address autocomplete on properties. Falls back to OpenStreetMap if unset.",
      },
      {
        id: "re-4",
        title: "Verify vendor lead sync",
        description:
          "Submit a property report on roerealty.com.au, then confirm the lead appears in Vendor leads within a minute.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Open vendor leads",
      },
      {
        id: "re-5",
        title: "Test the commerce chain",
        description:
          "On a vendor lead: create quote → accept → send invoice → request payment. Confirm payment lands in Commerce.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Lead commerce panel",
      },
      {
        id: "re-6",
        title: "Sync buyer leads",
        description:
          "Property enquiry forms on roerealty.com.au create buyer pipeline records. Sync them into Postgres from Buyer leads.",
        href: "/apps/re/buyer-leads",
        hrefLabel: "Open buyer leads",
      },
      {
        id: "re-7",
        title: "Review appraisal bookings",
        description:
          "Appraisal and strategy call bookings appear live from WordPress — no Postgres sync required yet.",
        href: "/apps/re/bookings",
        hrefLabel: "Open bookings",
      },
    ],
    envVars: [
      {
        name: "DG_WP_CONNECTOR_API_KEY",
        description: "Dev API key from WP → DG Platform → API Settings",
      },
      {
        name: "DG_WP_CONNECTOR_BASE_URL",
        description: "Roe REST base URL",
        example: "https://roerealty.com.au/wp-json/digitalgate/v1",
      },
      {
        name: "GOOGLE_GEOCODING_API_KEY",
        description: "Optional — property address geocoding",
      },
    ],
  },
  {
    appId: "websites",
    headline: "Monitor website health",
    summary:
      "Website Health Centre connects to WordPress sites and surfaces scores, PageSpeed, SSL, and proactive fixes.",
    estimatedMinutes: 15,
    prerequisites: ["DG Platform plugin on target WordPress site(s)"],
    steps: [
      {
        id: "web-1",
        title: "Confirm plugin health endpoints",
        description:
          "The WordPress plugin exposes health data via the digitalgate/v1 REST API on each connected site.",
      },
      {
        id: "web-2",
        title: "Configure multi-site health",
        description:
          "Set DG_WP_HEALTH_SITES as a JSON array in Vercel — one entry per WordPress site.",
        code: '[{"id":"roe","label":"Roe Realty","baseUrl":"https://roerealty.com.au/wp-json/digitalgate/v1"}]',
      },
      {
        id: "web-3",
        title: "Open Health Centre",
        description:
          "Use the site picker to switch between connected properties and review health scores.",
        href: "/apps/websites/health",
        hrefLabel: "Health Centre",
      },
      {
        id: "web-4",
        title: "Add Currumbin Valley Hideaway",
        description:
          "When CVH WordPress is live, append a second site entry with its baseUrl to DG_WP_HEALTH_SITES.",
      },
    ],
    envVars: [
      {
        name: "DG_WP_HEALTH_SITES",
        description: "JSON array of { id, label, baseUrl } site configs",
      },
    ],
  },
  {
    appId: "accommodation",
    headline: "Connect CVH hospitality to Gen 2",
    summary:
      "Overview, units, and bookings pull live from the WordPress accommodation module — same connector pattern as Roe vendor leads.",
    estimatedMinutes: 10,
    prerequisites: ["DG Platform plugin on CVH WordPress", "Commerce for booking payments (optional)"],
    steps: [
      {
        id: "acc-1",
        title: "Configure accommodation sites",
        description:
          "Point Gen 2 at your CVH WordPress REST API. Falls back to DG_WP_HEALTH_SITES when unset.",
        code: 'DG_WP_ACCOMMODATION_SITES=[{"id":"cvh","label":"Currumbin Valley Hideaway","baseUrl":"https://YOUR-CVH-SITE/wp-json/digitalgate/v1","apiKey":"dgdev_..."}]',
      },
      {
        id: "acc-2",
        title: "Open the overview dashboard",
        description:
          "Occupancy, revenue MTD, and recent bookings load directly from WordPress.",
        href: "/apps/accommodation",
        hrefLabel: "Accommodation overview",
      },
      {
        id: "acc-3",
        title: "Review units and bookings",
        description:
          "Domes, rates, and reservations mirror wp-admin. Calendar and housekeeping ship next.",
        href: "/apps/accommodation/units",
        hrefLabel: "Units",
      },
      {
        id: "acc-4",
        title: "Connect Commerce checkout",
        description:
          "Booking deposits and full payments flow through Commerce payment requests — same Stripe setup as Real Estate.",
        href: "/dashboard/apps/commerce/setup",
        hrefLabel: "Commerce setup",
      },
    ],
    envVars: [
      {
        name: "DG_WP_ACCOMMODATION_SITES",
        description: "JSON array of { id, label, baseUrl, apiKey? } — CVH WordPress connector",
      },
    ],
  },
  {
    appId: "automation",
    headline: "Automation — standalone Growth App",
    summary:
      "Automation is its own App (builder UI). The engine lives in Platform Core and listens to triggers declared by every other App manifest.",
    estimatedMinutes: 10,
    steps: [
      {
        id: "auto-1",
        title: "Review default rules",
        description:
          "Open Automation to see seeded rules and all triggers/actions declared by each App manifest.",
        href: "/apps/automation",
        hrefLabel: "Automation builder",
      },
      {
        id: "auto-2",
        title: "Wire Commerce triggers",
        description:
          "Once Stripe is live, commerce.payment.completed rules can notify agents or update lead stages.",
        href: "/dashboard/apps/commerce/setup",
        hrefLabel: "Commerce setup",
      },
    ],
  },
  {
    appId: "seo",
    headline: "SEO audits & on-page scoring",
    summary:
      "SEO App delivers technical and on-page audits connected to your websites — part of the Growth tier.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "seo-1",
        title: "Connect a website first",
        description: "SEO audits run against sites registered in the Websites App.",
        href: "/dashboard/apps/websites/setup",
        hrefLabel: "Websites setup",
      },
      {
        id: "seo-2",
        title: "Preview audit route",
        description: "The audit UI is on the roadmap — route is wired for navigation preview.",
        href: "/apps/seo/audit",
        hrefLabel: "SEO audit (preview)",
      },
    ],
  },
  {
    appId: "ai-visibility",
    headline: "AI Visibility Score™",
    summary:
      "Track brand presence across ChatGPT, Gemini, Perplexity, and Copilot — a core DigitalGate differentiator.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "aiv-1",
        title: "Complete CRM & website setup",
        description:
          "AI Visibility pulls context from contacts, domains, and connected sites.",
        href: "/dashboard/apps/crm/setup",
        hrefLabel: "CRM setup",
      },
      {
        id: "aiv-2",
        title: "Preview dashboard",
        description: "Full scoring engine ships with Platform 1.5 — preview the route now.",
        href: "/apps/ai-visibility",
        hrefLabel: "AI Visibility (preview)",
      },
    ],
  },
  {
    appId: "ai-communications",
    headline: "Unified AI communications",
    summary:
      "Voice, chat, email, and SMS orchestrated through Platform Core — ElevenLabs and Twilio as connectors, not the product.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "comms-1",
        title: "Understand the architecture",
        description:
          "Calls and messages become Activities on CRM contacts and RE leads. AI agents declare tools via App manifests.",
      },
      {
        id: "comms-2",
        title: "Preview App routes",
        description: "Inbox, voice agents, and call centre routes are scaffolded for the product map.",
        href: "/apps/ai-communications/inbox",
        hrefLabel: "Preview inbox",
      },
    ],
  },
  {
    appId: "infrastructure",
    headline: "Domains, DNS & hosting",
    summary:
      "Infrastructure App manages domains, DNS, hosting plans, and deployments — for agencies managing client stacks.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "infra-1",
        title: "Coming in Platform 2.0",
        description:
          "Infrastructure routes are registered for navigation preview. Connectors will integrate with registrars and hosts.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Preview domains",
      },
    ],
  },
  {
    appId: "finance",
    headline: "Finance & broker workflow",
    summary: "Loan pipeline, client applications, and broker CRM — a Business App for finance verticals.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "fin-1",
        title: "Install when licensed",
        description:
          "Finance is scaffolded. Enable from your plan when onboarding a finance client.",
        href: "/apps/finance",
        hrefLabel: "Preview Finance App",
      },
    ],
  },
  {
    appId: "services",
    headline: "Field service & trades",
    summary: "Jobs, scheduling, and quotes for service businesses — linked to Commerce for invoicing.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "svc-1",
        title: "Preview App routes",
        description: "Jobs, scheduling, and quotes routes show the planned workflow.",
        href: "/apps/services",
        hrefLabel: "Preview Services App",
      },
    ],
  },
  {
    appId: "creator",
    headline: "Creator economy toolkit",
    summary: "Content, memberships, and digital storefront — powered by Commerce subscriptions.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "cre-1",
        title: "Set up Commerce first",
        description: "Memberships and storefront checkout use the shared Commerce layer.",
        href: "/dashboard/apps/commerce/setup",
        hrefLabel: "Commerce setup",
      },
      {
        id: "cre-2",
        title: "Preview Creator routes",
        description: "Content library, memberships, and storefront are on the roadmap.",
        href: "/apps/creator",
        hrefLabel: "Preview Creator App",
      },
    ],
  },
  {
    appId: "commercial",
    headline: "Commercial property management",
    summary: "Leases, tenants, and commercial portfolio — distinct from residential Real Estate.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "com-1",
        title: "Preview App routes",
        description: "Commercial properties, leases, and tenant management routes are scaffolded.",
        href: "/apps/commercial",
        hrefLabel: "Preview Commercial App",
      },
    ],
  },
  {
    appId: "automotive",
    headline: "Dealership pipeline on Gen 2",
    summary:
      "Automotive covers inventory, buyer leads, and test drive bookings — ported from the WordPress dealer module.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "auto-1",
        title: "Preview App routes",
        description:
          "Inventory, leads, and test drives are scaffolded. WordPress Gen 1 dealer dashboard remains live until migration.",
        href: "/apps/automotive",
        hrefLabel: "Preview Automotive App",
      },
    ],
  },
  {
    appId: "analytics",
    headline: "Analytics Pro on Gen 2",
    summary:
      "Cross-channel KPIs and trend reports — separate from per-site analytics in Websites Health Centre.",
    estimatedMinutes: 5,
    prerequisites: ["Websites or Google connectors (when live)"],
    steps: [
      {
        id: "an-1",
        title: "Understand the split",
        description:
          "Websites App = site health and PageSpeed. Analytics App = business KPIs across Google, Meta, CRM, and Commerce.",
      },
      {
        id: "an-2",
        title: "Preview routes",
        description: "Dashboard, reports, and connector setup are on the Gen 2 roadmap.",
        href: "/apps/analytics",
        hrefLabel: "Preview Analytics App",
      },
    ],
  },
  {
    appId: "social",
    headline: "Social Management (Social Pro)",
    summary:
      "Compose, schedule, and publish to five platforms from one place — matches Social Pro on WordPress Gen 1.",
    estimatedMinutes: 10,
    steps: [
      {
        id: "soc-1",
        title: "Connect accounts (Gen 1 today)",
        description:
          "Social Pro OAuth for LinkedIn, Facebook, Instagram, X, and Pinterest runs on digitalgate.com.au until Gen 2 connectors ship.",
      },
      {
        id: "soc-2",
        title: "Preview Gen 2 routes",
        description: "Compose, calendar, and connected accounts placeholders show the target workflow.",
        href: "/apps/social/compose",
        hrefLabel: "Preview compose",
      },
    ],
  },
  {
    appId: "marketing",
    headline: "Marketing campaigns & audits",
    summary:
      "Campaign management plus DigitalGate agency audit workflow — the internal marketing CRM on Gen 1.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "mkt-1",
        title: "Preview routes",
        description: "Campaigns, channels, and agency audits are scaffolded for the product map.",
        href: "/apps/marketing",
        hrefLabel: "Preview Marketing App",
      },
    ],
  },
  {
    appId: "reviews",
    headline: "Reviews & reputation",
    summary:
      "Review inbox, automated requests, and Reputation Score™ — feeds the Digital Twin and Command Centre.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "rev-1",
        title: "Preview routes",
        description: "Inbox, review requests, and reputation score routes are wired as placeholders.",
        href: "/apps/reviews",
        hrefLabel: "Preview Reviews App",
      },
    ],
  },
  {
    appId: "command-centre",
    headline: "DigitalGate Command Centre",
    summary:
      "Internal-only intelligence — client health, platform metrics, revenue, and opportunity engine for DG staff.",
    estimatedMinutes: 10,
    prerequisites: ["DigitalGate staff Clerk account", "Command Centre enabled in App registry"],
    steps: [
      {
        id: "cmd-1",
        title: "Access requirements",
        description:
          "Command Centre is visibility: internal. Only DigitalGate team members with the command.view permission see navigation.",
      },
      {
        id: "cmd-2",
        title: "Open platform overview",
        description: "Start at the overview, then drill into client intelligence and platform health.",
        href: "/command",
        hrefLabel: "Command Centre",
      },
      {
        id: "cmd-3",
        title: "Twin & scoring dependency",
        description:
          "Full intelligence requires Digital Twin snapshots and Scoring Engine v1 — shipping after Platform 1.0 stabilises.",
      },
    ],
  },
];

export function getAppSetupGuide(appId: string): AppSetupGuide | undefined {
  return APP_SETUP_GUIDES.find((g) => g.appId === appId);
}

export function getAppSetupHref(appId: string): string {
  return `/dashboard/apps/${appId}/setup`;
}
