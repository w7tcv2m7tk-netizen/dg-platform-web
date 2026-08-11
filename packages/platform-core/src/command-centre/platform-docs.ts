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
    summary: "Canonical GTM / product–marketing rollout strategy.",
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
    summary: "Business Services app foundations and boundaries.",
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
