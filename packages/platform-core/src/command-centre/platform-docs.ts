/**
 * Staff-only Platform docs library (Command Centre).
 * Curated allowlist under repo `docs/` — SSOT for Platform Intelligence RAG.
 * Product UI and CRM are not substitutes for this corpus.
 */

export type PlatformDocGroup =
  | "architecture"
  | "strategy"
  | "commercial"
  | "partners"
  | "operations"
  | "connectors"
  | "ai"
  | "apps"
  | "decisions";

export const PLATFORM_DOC_GROUP_LABELS: Record<PlatformDocGroup, string> = {
  architecture: "Architecture",
  strategy: "Strategy",
  commercial: "Commercial",
  partners: "Partners",
  operations: "Operations",
  connectors: "Connectors",
  ai: "AI",
  apps: "Apps",
  decisions: "Decisions",
};

/** Display order for grouped index */
export const PLATFORM_DOC_GROUP_ORDER: PlatformDocGroup[] = [
  "architecture",
  "strategy",
  "commercial",
  "partners",
  "operations",
  "connectors",
  "ai",
  "apps",
  "decisions",
];

export interface PlatformDocEntry {
  /** URL slug under /command/docs/[slug] */
  slug: string;
  title: string;
  summary: string;
  group: PlatformDocGroup;
  /**
   * Relative path under repo `docs/` (forward slashes).
   * Must match allowlist exactly — never user-controlled.
   */
  relativePath: string;
}

/**
 * Curated critical docs only — not a dump of every file in /docs.
 * Paths are the security allowlist for server-side reads.
 */
export const PLATFORM_DOCS_CATALOG: readonly PlatformDocEntry[] = [
  {
    slug: "gen-2-architecture-brief",
    title: "Gen 2 Architecture Brief",
    summary: "North-star architecture & product constraints for Generation 2.",
    group: "architecture",
    relativePath: "architecture/GEN-2-ARCHITECTURE-BRIEF.md",
  },
  {
    slug: "capability-model",
    title: "Capability Model",
    summary: "How Core, Apps, and platform capabilities fit together.",
    group: "architecture",
    relativePath: "CAPABILITY-MODEL.md",
  },
  {
    slug: "app-hierarchy",
    title: "App Hierarchy",
    summary:
      "Canonical order: Core → Infrastructure → Industry → Specialisation → Template → Growth → Intelligence.",
    group: "architecture",
    relativePath: "foundations/APP-HIERARCHY.md",
  },
  {
    slug: "industry-platform",
    title: "Industry Platform",
    summary:
      "Twelve Industry Apps → Templates. Accommodation under Hospitality & Accommodation. Public lanes: Available / Early Access / Coming / Reserved.",
    group: "architecture",
    relativePath: "foundations/INDUSTRY-PLATFORM.md",
  },
  {
    slug: "roles-permissions-sidebar",
    title: "Roles, Permissions & Side Panel",
    summary:
      "Locked access model — DigitalGate Owner/Admin/Member, Organisation Owner/Admin/Member, partners, granular permissions, dynamic side panel, pricing.",
    group: "architecture",
    relativePath: "foundations/ROLES-PERMISSIONS-SIDEBAR.md",
  },
  {
    slug: "intelligent-layer",
    title: "Intelligent Layer",
    summary:
      "North-star — Digital Twin centrepiece; BI scores; Advisor; AI Actions; Connect→Grow. Does not expand founding ship list.",
    group: "architecture",
    relativePath: "foundations/INTELLIGENT-LAYER.md",
  },
  {
    slug: "operator-experience",
    title: "Operator Experience (DigitalGate Principle)",
    summary:
      "Locked — Simple for the operator. Powerful for the business. Intelligent underneath. Operator vs Admin, Simple→Advanced, five operator centres.",
    group: "architecture",
    relativePath: "foundations/OPERATOR-EXPERIENCE.md",
  },
  {
    slug: "sidebar-navigation",
    title: "Sidebar / Navigation",
    summary:
      "Locked final UX + access model — capability-aware CORE→PLATFORM ADMIN, dynamic Industry, role defaults, progressive disclosure.",
    group: "architecture",
    relativePath: "foundations/SIDEBAR-NAVIGATION.md",
  },
  {
    slug: "business-brain",
    title: "Business Brain",
    summary:
      "Intelligence layer on connected business context — seven dimensions, knowledge layers, readiness. Feeds Command Centre, Advisor, Communications. Distinct from Digital Twin.",
    group: "architecture",
    relativePath: "foundations/BUSINESS-BRAIN.md",
  },
  {
    slug: "connected-business-implementation",
    title: "Connected Business Implementation",
    summary:
      "P0–P2 ship brief for Connected Business / Business Brain positioning, marketing surfaces and knowledge architecture.",
    group: "architecture",
    relativePath: "foundations/CONNECTED-BUSINESS-IMPLEMENTATION.md",
  },
  {
    slug: "business-body",
    title: "Business Body™",
    summary:
      "Locked mental model — living organisation (Brain, Eyes, Ears, Heart, Nervous System…) for onboarding/education/AI copy. Not organ sidebar UI.",
    group: "architecture",
    relativePath: "foundations/BUSINESS-BODY.md",
  },
  {
    slug: "connected-business",
    title: "Connected Business",
    summary:
      "Locked philosophy — Connect your business. Give it a brain. Coherence vs silos; Disconnected→Connected→Intelligent→Autonomous; Business Health meaning.",
    group: "architecture",
    relativePath: "foundations/CONNECTED-BUSINESS.md",
  },
  {
    slug: "product-vision",
    title: "Product Vision",
    summary: "What DigitalGate is building and why.",
    group: "strategy",
    relativePath: "PRODUCT-VISION.md",
  },
  {
    slug: "digitalgate-rollout",
    title: "DigitalGate Rollout",
    summary: "GTM rollout — pre-launch / founding marketing mode, Phases 1–12.",
    group: "strategy",
    relativePath: "strategy/DIGITALGATE-ROLLOUT.md",
  },
  {
    slug: "roadmap",
    title: "Roadmap",
    summary: "Near-term delivery priorities and sequencing.",
    group: "strategy",
    relativePath: "ROADMAP.md",
  },
  {
    slug: "industry-strategy",
    title: "Industry Strategy",
    summary: "Country packs and industry expansion constraints — AU first; do not internationalise GTM early.",
    group: "strategy",
    relativePath: "foundations/GLOBAL-READINESS.md",
  },
  {
    slug: "ceo-plan-2026-08-17",
    title: "CEO plan (17 Aug)",
    summary: "Gates — Email P0 → Stage 1 → P0/P1 → Founding 10 → Founding 100.",
    group: "strategy",
    relativePath: "strategy/CEO-PLAN-2026-08-17.md",
  },
  {
    slug: "advisor-evidence-stage-1",
    title: "Advisor evidence — Stage 1",
    summary: "Stage 1 product reality — live URLs, homepage/pricing audit, RE journey truth.",
    group: "strategy",
    relativePath: "strategy/ADVISOR-EVIDENCE-STAGE-1.md",
  },
  {
    slug: "business-advisor-briefing",
    title: "Business advisor briefing",
    summary: "External advisor pack + adopted response lock (Intelligent Layer / Founding discipline).",
    group: "strategy",
    relativePath: "strategy/BUSINESS-ADVISOR-BRIEFING.md",
  },
  {
    slug: "business-advisor-update-2026-08-19",
    title: "Business advisor update (19 Aug)",
    summary:
      "Commercial lock, conversion path live, outreach starts — Twin/Goals shipped; website frozen.",
    group: "strategy",
    relativePath: "strategy/BUSINESS-ADVISOR-UPDATE-2026-08-19.md",
  },
  {
    slug: "commercial-engine",
    title: "Commercial Engine",
    summary:
      "18 Aug lock — freeze website redesign; fill Founding 10 via network, RE prospecting, and qualified Founding Resellers.",
    group: "commercial",
    relativePath: "strategy/COMMERCIAL-ENGINE.md",
  },
  {
    slug: "founding-10-acquisition",
    title: "Founding 10 Acquisition",
    summary: "Founding 10 sales machine — acquisition loop and developer P0/P1 order.",
    group: "commercial",
    relativePath: "strategy/FOUNDING-10-ACQUISITION.md",
  },
  {
    slug: "founding-10-outreach",
    title: "Founding 10 Outreach",
    summary:
      "Personal update, not a SaaS campaign — customer and Founding Reseller scripts, follow-ups, discovery questions.",
    group: "commercial",
    relativePath: "strategy/FOUNDING-10-OUTREACH.md",
  },
  {
    slug: "founding-cohorts",
    title: "Founding Cohorts",
    summary:
      "Founding 10 / 100 / 1,000 commercial architecture — customer discount ≠ referral commission.",
    group: "commercial",
    relativePath: "strategy/FOUNDING-COHORTS.md",
  },
  {
    slug: "founding-customer-onboarding",
    title: "Founding Customer Onboarding",
    summary:
      "Accepted → Agreement → signed-in onboarding → implementation plan → go-live. Do not use the retired public 12-section form.",
    group: "commercial",
    relativePath: "strategy/FOUNDING-CUSTOMER-ONBOARDING.md",
  },
  {
    slug: "discovery-scoring-spec",
    title: "Discovery Scoring",
    summary: "Prospect Opportunity Score — Fit × Need × Reachability × Commercial × Weakness.",
    group: "commercial",
    relativePath: "strategy/DISCOVERY-SCORING-SPEC.md",
  },
  {
    slug: "pricing-and-packaging",
    title: "Pricing & Packaging",
    summary: "Platform tiers, Apps, founding discount vs reseller commission, public pricing lock.",
    group: "commercial",
    relativePath: "commercial/PRICING-AND-PACKAGING.md",
  },
  {
    slug: "sales-process",
    title: "Sales Process",
    summary: "How DigitalGate sells Founding 10 — intro, discovery, consult, accept, agreement.",
    group: "commercial",
    relativePath: "commercial/SALES-PROCESS.md",
  },
  {
    slug: "commercially-ready-v1",
    title: "Customer Acceptance Criteria",
    summary:
      "Commercially Ready v1 — prove → sell Founding 10; punch list and verification before a seat is live.",
    group: "commercial",
    relativePath: "foundations/COMMERCIALLY-READY-V1.md",
  },
  {
    slug: "partner-ecosystem",
    title: "Partner Ecosystem",
    summary:
      "Reseller vs Implementation vs Technology vs Strategic — DigitalGate owns the platform; certified partners extend delivery. Resellers do not onboard.",
    group: "partners",
    relativePath: "partners/PARTNER-ECOSYSTEM.md",
  },
  {
    slug: "delivery-operating-model",
    title: "Delivery Operating Model",
    summary:
      "Hub-and-spoke delivery — resellers introduce, DigitalGate closes, Head of Implementation owns the SOP, Delivery Team scales capacity. Powered by DigitalGate.",
    group: "partners",
    relativePath: "partners/DELIVERY-OPERATING-MODEL.md",
  },
  {
    slug: "reseller-programme",
    title: "Reseller Programme",
    summary:
      "Invitation-only Founding Reseller Programme — introducer model, not an affiliate programme.",
    group: "partners",
    relativePath: "partners/RESELLER-PROGRAMME.md",
  },
  {
    slug: "reseller-terms",
    title: "Reseller Terms",
    summary: "Where partners accept programme rules; solicitor review required before binding legal terms.",
    group: "partners",
    relativePath: "partners/RESELLER-TERMS.md",
  },
  {
    slug: "partner-qualification",
    title: "Partner Qualification",
    summary: "Who may be invited; first-wave cap; what resellers must not claim.",
    group: "partners",
    relativePath: "partners/PARTNER-QUALIFICATION.md",
  },
  {
    slug: "partner-onboarding",
    title: "Partner Onboarding",
    summary: "Invite → terms → demo org → referral workflow. DigitalGate still sells and implements.",
    group: "partners",
    relativePath: "partners/PARTNER-ONBOARDING.md",
  },
  {
    slug: "referral-and-commission-rules",
    title: "Referral & Commission Rules",
    summary:
      "30% of qualifying collected Platform + App fees for 12 months — not list price, not perpetual.",
    group: "partners",
    relativePath: "partners/REFERRAL-AND-COMMISSION-RULES.md",
  },
  {
    slug: "founding-reseller-meeting",
    title: "Founding Reseller Meeting",
    summary:
      "Monday partner briefing run-sheet — agenda, discussion prompts, outcomes checklist for first-wave Founding Resellers.",
    group: "partners",
    relativePath: "partners/FOUNDING-RESELLER-MEETING.md",
  },
  {
    slug: "founding-reseller-playbook",
    title: "Founding Reseller Playbook",
    summary:
      "Introducer model — role, one-liner, journey, partner levels, good prospects, and briefing outline for first-wave resellers.",
    group: "partners",
    relativePath: "partners/FOUNDING-RESELLER-PLAYBOOK.md",
  },
  {
    slug: "partner-resources",
    title: "Partner Resources",
    summary: "Approved messaging, demo account, and where partners work in product vs CRM.",
    group: "partners",
    relativePath: "partners/PARTNER-RESOURCES.md",
  },
  {
    slug: "business-setup",
    title: "Business Setup",
    summary: "Identify and configure a business on the platform (Core Business Services, not a Growth App).",
    group: "operations",
    relativePath: "foundations/BUSINESS-SETUP.md",
  },
  {
    slug: "customer-onboarding-ops",
    title: "Customer Onboarding",
    summary: "Operational path after commercial acceptance — agreement, guided setup, implementation.",
    group: "operations",
    relativePath: "operations/CUSTOMER-ONBOARDING.md",
  },
  {
    slug: "implementation",
    title: "Implementation",
    summary: "Staff implementation plan after onboarding — configure Apps, connectors, go-live readiness.",
    group: "operations",
    relativePath: "operations/IMPLEMENTATION.md",
  },
  {
    slug: "go-live",
    title: "Go-Live",
    summary: "Checklist before a Founding customer is treated as live on DigitalGate.",
    group: "operations",
    relativePath: "operations/GO-LIVE.md",
  },
  {
    slug: "customer-success",
    title: "Customer Success",
    summary: "Success Score, adoption, and in-product success — not a separate support App.",
    group: "operations",
    relativePath: "foundations/CUSTOMER-SUCCESS.md",
  },
  {
    slug: "support",
    title: "Support",
    summary: "How staff support customers vs Platform Intelligence and in-product chat.",
    group: "operations",
    relativePath: "operations/SUPPORT.md",
  },
  {
    slug: "internal-sops",
    title: "Internal SOPs",
    summary: "Where operating procedures live; do not dump every runbook into Platform Docs.",
    group: "operations",
    relativePath: "operations/INTERNAL-SOPS.md",
  },
  {
    slug: "connector-priority",
    title: "Connector Priority",
    summary: "Which connectors matter first and why.",
    group: "connectors",
    relativePath: "foundations/CONNECTOR-PRIORITY.md",
  },
  {
    slug: "platform-intelligence",
    title: "Platform Intelligence",
    summary: "Docs SSOT → live truth → tools; Phase 0/1 knowledge layer (not full AI yet).",
    group: "ai",
    relativePath: "ai/PLATFORM-INTELLIGENCE.md",
  },
  {
    slug: "industry-intelligence",
    title: "Industry Intelligence",
    summary: "External industry feeds → attributed briefings.",
    group: "ai",
    relativePath: "foundations/INDUSTRY-INTELLIGENCE.md",
  },
  {
    slug: "services-app",
    title: "Services App",
    summary:
      "DG OS for service businesses — ServiceM8-class coverage on Universal Objects; not a FSM clone.",
    group: "apps",
    relativePath: "foundations/SERVICES-APP.md",
  },
  {
    slug: "services-beta-launch",
    title: "Services Beta Launch",
    summary: "Closed-beta checklist for founding agencies (smoke path, redirects, OUT list).",
    group: "apps",
    relativePath: "foundations/SERVICES-BETA-LAUNCH.md",
  },
  {
    slug: "property-ecosystem",
    title: "Property Ecosystem",
    summary:
      "Property Industry App — specialisations: Real Estate · PM · Accommodation · Commercial · Development. Commercial packaging $99 + $29 expansion.",
    group: "apps",
    relativePath: "foundations/PROPERTY-ECOSYSTEM.md",
  },
  {
    slug: "business-apps-scaffold",
    title: "Business Apps Scaffold",
    summary:
      "Finance · Creator · Commercial · Automotive — honest product-map floor (not closed beta).",
    group: "apps",
    relativePath: "foundations/BUSINESS-APPS-SCAFFOLD.md",
  },
  {
    slug: "wantd",
    title: "Wantd",
    summary: "Wantd as a Business/Organisation on DigitalGate — not a dedicated App.",
    group: "apps",
    relativePath: "WANTD.md",
  },
  {
    slug: "adr-0010-opportunity-engine",
    title: "ADR 0010 — Opportunity Engine remains Core",
    summary: "One detection / scoring engine; Command Centre orchestrates.",
    group: "decisions",
    relativePath: "adr/0010-opportunity-engine-remains-core.md",
  },
  {
    slug: "adr-0011-reputation",
    title: "ADR 0011 — Reputation Core + Growth App",
    summary: "Core plumbing vs Reputation (Growth) product surface.",
    group: "decisions",
    relativePath: "adr/0011-reputation-core-plumbing-growth-app.md",
  },
  {
    slug: "adr-0012-architecture-brief",
    title: "ADR 0012 — Architecture Brief adopted",
    summary: "Gen 2 Architecture Brief locked as north-star constraints.",
    group: "decisions",
    relativePath: "adr/0012-gen-2-architecture-brief-adopted.md",
  },
  {
    slug: "adr-0013-gtm-rollout",
    title: "ADR 0013 — GTM rollout strategy adopted",
    summary: "Rollout / GTM doc locked as product–marketing SSOT.",
    group: "decisions",
    relativePath: "adr/0013-gtm-rollout-strategy-adopted.md",
  },
] as const;

const RELATIVE_PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9_./-]*\.md$/;

export function getPlatformDocBySlug(slug: string): PlatformDocEntry | undefined {
  if (!slug || slug.includes("/") || slug.includes("..") || slug.includes("\\")) {
    return undefined;
  }
  return PLATFORM_DOCS_CATALOG.find((d) => d.slug === slug);
}

export function isAllowlistedPlatformDocPath(relativePath: string): boolean {
  if (!relativePath || relativePath.includes("\0")) return false;
  if (relativePath.includes("..") || relativePath.startsWith("/") || relativePath.includes("\\")) {
    return false;
  }
  if (relativePath.toLowerCase().includes(".env")) return false;
  if (!RELATIVE_PATH_RE.test(relativePath)) return false;
  return PLATFORM_DOCS_CATALOG.some((d) => d.relativePath === relativePath);
}

export function groupPlatformDocs(
  entries: readonly PlatformDocEntry[] = PLATFORM_DOCS_CATALOG,
): Array<{ group: PlatformDocGroup; label: string; docs: PlatformDocEntry[] }> {
  return PLATFORM_DOC_GROUP_ORDER.map((group) => ({
    group,
    label: PLATFORM_DOC_GROUP_LABELS[group],
    docs: entries.filter((d) => d.group === group),
  })).filter((g) => g.docs.length > 0);
}
