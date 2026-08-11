/**
 * Business Services — Core capability types.
 * Customer surface: Business Setup / Start Your Business.
 *
 * Launch roadmap: Identify → Register → Establish → Build → Connect → Grow
 *
 * @see docs/foundations/BUSINESS-SETUP.md
 */

export type BusinessSetupPillarId =
  | "identify"
  | "register"
  | "establish"
  | "build"
  | "connect"
  | "grow";

export type BusinessSetupStepStatus =
  | "available"
  | "partial"
  | "deferred"
  | "blocked_provider"
  | "roadmap";

export type BusinessSetupChecklistItem = {
  id: string;
  pillar: BusinessSetupPillarId;
  label: string;
  description: string;
  status: BusinessSetupStepStatus;
  /** In-app route when the step is usable; omit when blocked/roadmap-only */
  href?: string;
  /** Honest note — never invent ASIC success or fake availability */
  note?: string;
};

export type BusinessSetupPhase = 0 | 1 | 2 | 3 | 4 | 5;

export const BUSINESS_SERVICES_CAPABILITY_ID = "business_services" as const;

export const BUSINESS_SETUP_POSITIONING =
  "Start your business. Build your digital presence. Connect your systems. Run your business. Grow it — all through DigitalGate.";

/** Launch stages — customer-facing Business Setup checklist groups. */
export const BUSINESS_SETUP_PILLARS: {
  id: BusinessSetupPillarId;
  title: string;
  summary: string;
}[] = [
  {
    id: "identify",
    title: "Identify",
    summary:
      "Verify who you are — ABN / entity via ABR, shortlist a name, seed Business Profile.",
  },
  {
    id: "register",
    title: "Register",
    summary:
      "Register a business name via the authorised AU pathway when available (ASIC DSP).",
  },
  {
    id: "establish",
    title: "Establish",
    summary:
      "Lock Digital Business Identity on Business Profile — legal name, trading name, contacts, GST.",
  },
  {
    id: "build",
    title: "Build",
    summary:
      "Website, hosting, forms, CRM, and digital business card. Brand Studio remains roadmap.",
  },
  {
    id: "connect",
    title: "Connect",
    summary:
      "Domain, DNS, SSL, business email, social, and Google Business Profile.",
  },
  {
    id: "grow",
    title: "Grow",
    summary:
      "SEO, AI Visibility, Reputation (Core), Social, Ads, Automation, and Analytics.",
  },
];

/** Launchpad checklist — honest statuses only. */
export const BUSINESS_SETUP_CHECKLIST: BusinessSetupChecklistItem[] = [
  {
    id: "identify.name",
    pillar: "identify",
    label: "Choose a business name",
    description:
      "Search existing ABR entities by name, or shortlist a new name. Availability for registration is never invented.",
    status: "partial",
    href: "/dashboard/business-setup#identify",
    note: "ABR name search lists existing entities. New-name availability waits on ASIC DSP.",
  },
  {
    id: "identify.abn",
    pillar: "identify",
    label: "Verify ABN / entity",
    description:
      "ABN or ACN lookup via ABR → Business Identity → apply to Business Profile.",
    status: "available",
    href: "/dashboard/business-setup#identify",
    note: "Live when ABN_LOOKUP_GUID / ABR_GUID is set server-side.",
  },
  {
    id: "register.name",
    pillar: "register",
    label: "Register business name",
    description:
      "Submit via official digital pathway when approved; otherwise hand off with prepared details.",
    status: "blocked_provider",
    note: "ASIC connector pending_provider_approval — no production submit.",
  },
  {
    id: "establish.profile",
    pillar: "establish",
    label: "Business Profile",
    description: "Canonical Digital Business Identity every App reads.",
    status: "available",
    href: "/dashboard/business",
  },
  {
    id: "build.website",
    pillar: "build",
    label: "Website",
    description: "AI Website Studio / site assets.",
    status: "partial",
    href: "/apps/websites",
  },
  {
    id: "build.brand",
    pillar: "build",
    label: "Brand & logo",
    description: "AI Brand Studio — roadmap only.",
    status: "roadmap",
    href: "/dashboard/business",
    note: "See docs/foundations/BRAND-STUDIO.md — do not invent a studio UI.",
  },
  {
    id: "build.crm",
    pillar: "build",
    label: "CRM",
    description: "Contacts, leads, and pipeline on Core CRM.",
    status: "available",
    href: "/apps/crm",
  },
  {
    id: "connect.domain",
    pillar: "connect",
    label: "Domain",
    description: "Search and connect a domain (Infrastructure).",
    status: "partial",
    href: "/apps/infrastructure/domains",
  },
  {
    id: "connect.email",
    pillar: "connect",
    label: "Business email",
    description: "Mailbox seats via Infrastructure Email.",
    status: "partial",
    href: "/apps/infrastructure/email",
  },
  {
    id: "connect.gbp",
    pillar: "connect",
    label: "Google Business Profile",
    description: "Connect GBP when Google connector is configured.",
    status: "partial",
    href: "/dashboard/settings/connectors",
  },
  {
    id: "connect.social",
    pillar: "connect",
    label: "Social profiles",
    description:
      "Link social presence on Business Profile; publishing connectors mature later.",
    status: "partial",
    href: "/dashboard/business",
  },
  {
    id: "grow.seo",
    pillar: "grow",
    label: "SEO",
    description: "Presence and SEO Engine.",
    status: "available",
    href: "/apps/seo",
  },
  {
    id: "grow.ai_visibility",
    pillar: "grow",
    label: "AI Visibility",
    description: "AI Visibility Engine.",
    status: "available",
    href: "/apps/ai-visibility",
  },
  {
    id: "grow.reputation",
    pillar: "grow",
    label: "Reviews & Reputation",
    description: "Core Reputation — universal reviews (not a Growth SKU).",
    status: "partial",
    href: "/apps/reviews",
  },
  {
    id: "grow.automation",
    pillar: "grow",
    label: "Automation",
    description: "Automation App.",
    status: "partial",
    href: "/apps/automation",
  },
  {
    id: "grow.analytics",
    pillar: "grow",
    label: "Analytics",
    description: "Analytics App.",
    status: "partial",
    href: "/apps/analytics",
  },
];

export function checklistForPillar(
  pillar: BusinessSetupPillarId,
): BusinessSetupChecklistItem[] {
  return BUSINESS_SETUP_CHECKLIST.filter((item) => item.pillar === pillar);
}

/** Phase 1 = Identify live-ish (ABR verify) with registration still blocked. */
export function currentBusinessSetupPhase(): BusinessSetupPhase {
  return 1;
}
