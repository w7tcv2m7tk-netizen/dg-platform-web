/**
 * Staff-only Platform / Architecture docs library (Command Centre).
 * Curated allowlist under repo `docs/` — Phase 0/1 SSOT for later RAG; readable first.
 */

export type PlatformDocGroup =
  | "architecture"
  | "strategy"
  | "connectors"
  | "ai"
  | "apps"
  | "decisions";

export const PLATFORM_DOC_GROUP_LABELS: Record<PlatformDocGroup, string> = {
  architecture: "Architecture",
  strategy: "Strategy",
  connectors: "Connectors",
  ai: "AI",
  apps: "Apps",
  decisions: "Decisions",
};

/** Display order for grouped index */
export const PLATFORM_DOC_GROUP_ORDER: PlatformDocGroup[] = [
  "architecture",
  "strategy",
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
      "Canonical public order: Core → Infrastructure → Industry → Growth (platform capabilities across).",
    group: "architecture",
    relativePath: "foundations/APP-HIERARCHY.md",
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
    slug: "business-setup",
    title: "Business Setup",
    summary: "Foundations for identifying and configuring a business on the platform.",
    group: "architecture",
    relativePath: "foundations/BUSINESS-SETUP.md",
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
    slug: "founding-10-outreach",
    title: "Founding 10 outreach copy",
    summary:
      "Personal update, not a SaaS campaign — customer and Founding Reseller scripts, follow-ups, discovery questions.",
    group: "strategy",
    relativePath: "strategy/FOUNDING-10-OUTREACH.md",
  },
  {
    slug: "commercial-engine",
    title: "Commercial Engine",
    summary:
      "18 Aug lock — freeze website redesign; fill Founding 10 via network, RE prospecting, and qualified Founding Resellers.",
    group: "strategy",
    relativePath: "strategy/COMMERCIAL-ENGINE.md",
  },
  {
    slug: "founding-10-acquisition",
    title: "Founding 10 acquisition",
    summary: "Founding 10 sales machine — acquisition loop and developer P0/P1 order.",
    group: "strategy",
    relativePath: "strategy/FOUNDING-10-ACQUISITION.md",
  },
  {
    slug: "founding-cohorts",
    title: "Founding cohorts",
    summary:
      "Founding 10 / 100 / 1,000 commercial architecture — customer discount ≠ referral commission.",
    group: "strategy",
    relativePath: "strategy/FOUNDING-COHORTS.md",
  },
  {
    slug: "ceo-plan-2026-08-17",
    title: "CEO plan (17 Aug)",
    summary: "Gates — Email P0 → Stage 1 → P0/P1 → Founding 10 → Founding 100.",
    group: "strategy",
    relativePath: "strategy/CEO-PLAN-2026-08-17.md",
  },
  {
    slug: "discovery-scoring-spec",
    title: "Discovery scoring spec",
    summary: "Prospect Opportunity Score — Fit × Need × Reachability × Commercial × Weakness.",
    group: "strategy",
    relativePath: "strategy/DISCOVERY-SCORING-SPEC.md",
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
    slug: "commercially-ready-v1",
    title: "Commercially Ready v1",
    summary:
      "Prove → sell Founding 10 — dogfood journey, P0/P1 punch list, six reds as verification.",
    group: "strategy",
    relativePath: "foundations/COMMERCIALLY-READY-V1.md",
  },
  {
    slug: "gate-1-dogfood",
    title: "Gate 1 dogfood",
    summary:
      "Tickable Internal Alpha close list — Roe + CVH journey, ops smoke, P0/P1 before Founding 10.",
    group: "strategy",
    relativePath: "foundations/GATE-1-DOGFOOD.md",
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
      "Real Estate Sales · Property Management · Commercial Property · Accommodation · Property Development (future).",
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
