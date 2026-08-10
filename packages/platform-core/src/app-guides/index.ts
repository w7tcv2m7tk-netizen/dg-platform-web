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
          "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in your deployment environment. Use sk_test_ keys while testing. For Refer & Earn cash payouts, also set STRIPE_CONNECT_ENABLED=true (Stripe Connect Express).",
        code: "STRIPE_SECRET_KEY=sk_test_...\nSTRIPE_WEBHOOK_SECRET=whsec_...\nSTRIPE_CONNECT_ENABLED=true",
      },
      {
        id: "commerce-2",
        title: "Register the webhook endpoint",
        description:
          "In Stripe Dashboard → Developers → Webhooks, add your app URL. Listen for checkout.session.completed, invoice.paid (Refer & Earn renewals), and Connect transfer/account events. Or run: STRIPE_SECRET_KEY=sk_… node scripts/setup-stripe-webhook.mjs",
        code: "https://app.digitalgate.com.au/api/webhooks/stripe\nEvents: checkout.session.completed, invoice.paid, account.updated, transfer.failed, …",
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
      {
        name: "STRIPE_CONNECT_ENABLED",
        description:
          "Opt-in Refer & Earn cash payouts via Stripe Connect Express (AU). Without this, UI keeps platform credit as default.",
        example: "true",
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
    headline: "Real Estate beta — agency setup",
    summary:
      "Enrol with re.beta, connect the agency WordPress site, then run vendor → appraisal → listing → offer → settlement in Gen 2. See docs/RE-BETA-LAUNCH.md.",
    estimatedMinutes: 30,
    prerequisites: [
      "re.beta enabled (Real Estate template or Command Centre → Enable RE beta)",
      "DG Platform plugin 10.66.0+ on the agency WordPress site",
      "CRM contacts",
      "Commerce (optional, for payments)",
    ],
    steps: [
      {
        id: "re-0",
        title: "Complete Business Profile",
        description:
          "Add ABN and logo so invoices, quotes, and the workspace look like the agency.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "re-1",
        title: "Deploy the WordPress plugin",
        description:
          "Upload the latest dg-platform-build zip to the agency site. Confirm Real Estate module is enabled.",
        detail: "Plugins → DG Platform → Modules → Real Estate ✓",
      },
      {
        id: "re-2",
        title: "Configure the WordPress connector",
        description:
          "In Settings → Connectors, set the site base URL and per-org Dev API key (preferred over shared Vercel env for multi-agency).",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Connectors",
        code: "https://{agency-site}/wp-json/digitalgate/v1",
      },
      {
        id: "re-3",
        title: "Invite the team",
        description: "Send Clerk invites so agents can work the pipeline.",
        href: "/dashboard/settings/team",
        hrefLabel: "Team",
      },
      {
        id: "re-4",
        title: "Open Real Estate & finish the checklist",
        description:
          "Use the Getting Started checklist on the RE overview, then add or sync the first vendor lead.",
        href: "/apps/re",
        hrefLabel: "Real Estate overview",
      },
      {
        id: "re-5",
        title: "Verify vendor lead sync",
        description:
          "Submit a property report on the agency site (or add a lead manually), then confirm it appears in Vendor leads.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Open vendor leads",
      },
      {
        id: "re-6",
        title: "Run appraisal → listing → offer",
        description:
          "Start an appraisal from a vendor lead, move to Listed, add an offer, and accept it.",
        href: "/apps/re/properties",
        hrefLabel: "Open properties",
      },
      {
        id: "re-7",
        title: "Sync buyer leads",
        description:
          "Property enquiry forms on WordPress create buyer pipeline records. Sync or add buyers manually.",
        href: "/apps/re/buyer-leads",
        hrefLabel: "Open buyer leads",
      },
      {
        id: "re-8",
        title: "Optional — commerce chain",
        description:
          "On a vendor lead: create quote → accept → send invoice → request payment.",
        href: "/apps/re/vendor-leads",
        hrefLabel: "Lead commerce panel",
      },
    ],
    envVars: [
      {
        name: "DG_WP_CONNECTOR_API_KEY",
        description: "Fallback env key — prefer per-org key in Connectors",
      },
      {
        name: "DG_WP_CONNECTOR_BASE_URL",
        description: "Fallback REST base URL if org connector unset",
        example: "https://agency.example/wp-json/digitalgate/v1",
      },
      {
        name: "GOOGLE_GEOCODING_API_KEY",
        description: "Optional — property address geocoding",
      },
    ],
  },
  {
    appId: "websites",
    headline: "Website Builder closed beta",
    summary:
      "Enrol with websites.builder, generate a Gen 2 site from Business Profile, edit in Studio, publish, then Domains go-live. Optional WP content import (plugin 10.70+). See docs/WEBSITES-BETA-LAUNCH.md.",
    estimatedMinutes: 20,
    prerequisites: [
      "websites.builder enabled (Command Centre → Enable Websites beta)",
      "Business Profile started",
      "Optional: DG Platform plugin 10.70+ for WP content export",
    ],
    steps: [
      {
        id: "web-0",
        title: "Complete Business Profile",
        description: "Trading name / ABN / services improve AI generate quality.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "web-1",
        title: "Open Websites checklist",
        description:
          "Create a site from profile (or import WordPress pages), then finish the closed-beta checklist.",
        href: "/apps/websites",
        hrefLabel: "Website Builder",
      },
      {
        id: "web-2",
        title: "Edit in Studio and publish",
        description:
          "Polish blocks/SEO, Preview, then Publish to /sites/[slug].",
        href: "/apps/websites",
        hrefLabel: "Sites",
      },
      {
        id: "web-3",
        title: "Make it live on a domain",
        description:
          "Infrastructure → Domains → connect/register → Apply DNS / Make it live.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
      {
        id: "web-4",
        title: "Health Centre (optional)",
        description:
          "Gen 2 publish/domain checklist; WordPress multi-site health via DG_WP_HEALTH_SITES if needed.",
        href: "/apps/websites/health",
        hrefLabel: "Health Centre",
      },
    ],
    envVars: [
      {
        name: "DG_WEBSITES_BUILDER",
        description: "1 force-on / 0 force-off Website Builder (overrides soft-on)",
      },
      {
        name: "DG_WP_HEALTH_SITES",
        description: "Optional JSON array of { id, label, baseUrl } for WP health",
      },
    ],
  },
  {
    appId: "infrastructure",
    headline: "Domains closed beta",
    summary:
      "Enrol with infra.domains_beta, search/connect domains over Dreamscape SOAP, Apply DNS and Make it live. Paid register stays behind infra.domain_register. See docs/INFRASTRUCTURE-BETA-LAUNCH.md.",
    estimatedMinutes: 15,
    prerequisites: [
      "Platform Dreamscape SOAP production env on Vercel",
      "infra.domains_beta (Command Centre → Enable Domains beta)",
      "Website to attach (Websites beta recommended)",
    ],
    steps: [
      {
        id: "infra-1",
        title: "Confirm Domains checklist",
        description:
          "Console should show production SOAP host (/API-1.3). Complete enrolment steps.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
      {
        id: "infra-2",
        title: "Search and connect",
        description:
          "Search availability, then Connect an existing domain (safest first smoke).",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
      {
        id: "infra-3",
        title: "Make it live",
        description: "Link a Website → Apply DNS → wait for SSL.",
        href: "/apps/infrastructure/domains",
        hrefLabel: "Domains",
      },
    ],
    envVars: [
      {
        name: "DREAMSCAPE_RESELLER_ID",
        description: "SOAP Reseller ID from Dreamscape API Setup",
      },
      {
        name: "DREAMSCAPE_API_KEY",
        description: "SOAP API key (never commit)",
      },
      {
        name: "DREAMSCAPE_SOAP_ENV",
        description: "production for live keys (uses /API-1.3)",
      },
    ],
  },
  {
    appId: "accommodation",
    headline: "Accommodation beta — property setup",
    summary:
      "Enrol with acc.beta, connect the property WordPress site (CVH), then run units → availability → stays → housekeeping in Gen 2. Public book-now stays on WordPress. See docs/ACC-BETA-LAUNCH.md.",
    estimatedMinutes: 25,
    prerequisites: [
      "acc.beta enabled (Accommodation template or Command Centre → Enable Acc beta)",
      "DG Platform plugin 10.63.0+ on the property WordPress site",
      "CRM contacts (guests)",
      "Commerce for booking payments (optional)",
    ],
    steps: [
      {
        id: "acc-0",
        title: "Complete Business Profile",
        description:
          "Add ABN and logo so invoices and the workspace look like the property.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "acc-1",
        title: "Configure the WordPress connector",
        description:
          "In Settings → Connectors, set the CVH site base URL and per-org Dev API key (never paste Roe/DG keys onto CVH).",
        href: "/dashboard/settings/connectors",
        hrefLabel: "Connectors",
        code: "https://currumbinvalleyhideaway.com.au/wp-json/digitalgate/v1",
      },
      {
        id: "acc-2",
        title: "Open the overview checklist",
        description:
          "Complete the in-app Acc beta checklist, then review occupancy and recent stays.",
        href: "/apps/accommodation",
        hrefLabel: "Accommodation overview",
      },
      {
        id: "acc-3",
        title: "Sync units and set OTA iCal",
        description:
          "Sync units from WordPress. Paste Airbnb/Booking.com import URLs; copy DigitalGate export into each OTA (never OTA↔OTA).",
        href: "/apps/accommodation/units",
        hrefLabel: "Units",
      },
      {
        id: "acc-3b",
        title: "Work availability and housekeeping",
        description:
          "Use calendar views and OTA sync; mark units clean / dirty after turnovers (Neon SoT when units synced).",
        href: "/apps/accommodation/calendar",
        hrefLabel: "Availability",
      },
      {
        id: "acc-3c",
        title: "Review guests and stays",
        description:
          "Guests are universal Contacts with Accommodation context (stays, LTV, VIP/repeat).",
        href: "/apps/accommodation/guests",
        hrefLabel: "Guests",
      },
      {
        id: "acc-4",
        title: "Connect Commerce checkout (optional)",
        description:
          "Ops payment requests can use Commerce — public book-now Stripe remains on WordPress for this beta.",
        href: "/dashboard/apps/commerce/setup",
        hrefLabel: "Commerce setup",
      },
    ],
    envVars: [
      {
        name: "DG_WP_ACCOMMODATION_SITES",
        description:
          "JSON array of { id, label, baseUrl, apiKey? } — CVH WordPress connector fallback",
      },
    ],
    resources: [
      {
        label: "Accommodation overview",
        href: "/apps/accommodation",
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
      "SEO Engine runs live HTML presence probes against your Business Profile URL and blends Studio on-page checks when you have a native site. Scores are shared with AI Visibility.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "seo-1",
        title: "Add your website URL",
        description: "Set the public site URL in Business Profile so audits have something to probe.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "seo-2",
        title: "Run an SEO audit",
        description: "Live probes for title, meta, OG, JSON-LD, HTTPS, and more — plus Studio checks.",
        href: "/apps/seo/audit",
        hrefLabel: "SEO audit",
      },
    ],
  },
  {
    appId: "ai-visibility",
    headline: "AI Visibility Score™",
    summary:
      "Website readiness for AI answer engines from observable HTML signals (schema, Open Graph, technical). This MVP does not monitor ChatGPT, Gemini, or Perplexity citations.",
    estimatedMinutes: 5,
    steps: [
      {
        id: "aiv-1",
        title: "Add website URL + run presence scan",
        description:
          "AI Visibility uses the same SEO presence audit — add a URL, then scan from the dashboard.",
        href: "/dashboard/business",
        hrefLabel: "Business Profile",
      },
      {
        id: "aiv-2",
        title: "Review evidence checklist",
        description: "See reachable, HTTPS, title, meta, OG, JSON-LD, and H1 from the last audit.",
        href: "/apps/ai-visibility",
        hrefLabel: "AI Visibility",
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
      "Monitor connected review feeds (Acc dg_reviews), queue requests after stays/settlements, and view Reputation Score™ + AI themes.",
    estimatedMinutes: 8,
    steps: [
      {
        id: "rev-1",
        title: "Open Reviews overview",
        description: "See score stub, theme summary, and links into inbox / sources / requests.",
        href: "/apps/reviews",
        hrefLabel: "Open Reviews",
      },
      {
        id: "rev-2",
        title: "Connect sources",
        description: "Acc WordPress feed is available today; GBP / Meta are planned Connectors.",
        href: "/apps/reviews/sources",
        hrefLabel: "Review sources",
      },
      {
        id: "rev-3",
        title: "Queue a review request",
        description: "After a completed stay or RE settlement, queue a request on the Contact timeline.",
        href: "/apps/reviews/requests",
        hrefLabel: "Review requests",
      },
    ],
  },
  {
    appId: "command-centre",
    headline: "DigitalGate Command Centre",
    summary:
      "Internal-only OS for DigitalGate — client success, platform ops, and the Growth Engine™ acquisition pipeline.",
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
        title: "Growth Engine™",
        description:
          "Acquisition pipeline: discover businesses → AI audit → interactive report → prospect pipeline → proposal → client transition. See docs/GROWTH-ENGINE.md.",
        href: "/command/growth-engine",
        hrefLabel: "Growth Engine",
      },
      {
        id: "cmd-4",
        title: "Twin & scoring dependency",
        description:
          "Full audits and client intelligence require Digital Twin snapshots and Scoring Engine v1 — shipping after Platform 1.0 stabilises.",
      },
    ],
    resources: [
      { label: "Growth Engine spec", href: "/dashboard/settings/roadmap", external: false },
    ],
  },
];

export function getAppSetupGuide(appId: string): AppSetupGuide | undefined {
  return APP_SETUP_GUIDES.find((g) => g.appId === appId);
}

export function getAppSetupHref(appId: string): string {
  return `/dashboard/apps/${appId}/setup`;
}
