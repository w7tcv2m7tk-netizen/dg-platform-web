import {
  listOrgSeoAudits,
  type OrgSeoAuditProbes,
  type OrgSeoAuditScores,
} from "@dg/platform-core";

export type AiVisibilityAuditSnapshot = {
  auditedAt: string;
  websiteUrl: string;
  scores: OrgSeoAuditScores;
  probes: OrgSeoAuditProbes | null;
  findings: Array<{
    domain: string;
    severity: string;
    title: string;
    detail: string;
    recommendedAction?: string;
  }>;
  fresh: boolean;
};

export type AiVisibilityHistoryPoint = {
  auditedAt: string;
  value: number;
};

const AUDIT_FRESH_MS = 30 * 24 * 60 * 60 * 1000;

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function normalisedWebsiteHost(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function parseScores(raw: unknown): OrgSeoAuditScores | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.aiVisibility !== "number" || typeof s.seo !== "number") return null;
  return {
    aiVisibility: clamp(s.aiVisibility),
    seo: clamp(s.seo),
    websiteHealth: typeof s.websiteHealth === "number" ? clamp(s.websiteHealth) : 0,
    nativeSeo: typeof s.nativeSeo === "number" ? clamp(s.nativeSeo) : null,
  };
}

function parseProbes(raw: unknown): OrgSeoAuditProbes | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  return {
    reachable: typeof p.reachable === "boolean" ? p.reachable : null,
    https: typeof p.https === "boolean" ? p.https : null,
    title: typeof p.title === "string" ? p.title : null,
    hasMetaDescription: Boolean(p.hasMetaDescription),
    hasViewport: Boolean(p.hasViewport),
    hasOpenGraph: Boolean(p.hasOpenGraph),
    hasJsonLd: Boolean(p.hasJsonLd),
    hasH1: Boolean(p.hasH1),
  };
}

function parseFindings(raw: unknown): AiVisibilityAuditSnapshot["findings"] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.title !== "string" || typeof row.domain !== "string") return [];
    return [{
      domain: row.domain,
      severity: typeof row.severity === "string" ? row.severity : "opportunity",
      title: row.title,
      detail: typeof row.detail === "string" ? row.detail : "",
      ...(typeof row.recommendedAction === "string"
        ? { recommendedAction: row.recommendedAction }
        : {}),
    }];
  });
}

/**
 * AI Visibility must never inherit an audit from another brand/domain in the same organisation.
 * This loader only accepts persisted SEO/presence audits whose recorded hostname matches the
 * Business Profile website hostname.
 */
export async function loadDomainMatchedAiVisibilityData(
  organisationId: string,
  businessWebsiteUrl: string | null | undefined,
) {
  const expectedHost = normalisedWebsiteHost(businessWebsiteUrl);
  if (!expectedHost) {
    return {
      expectedHost: null,
      latest: null as AiVisibilityAuditSnapshot | null,
      history: [] as AiVisibilityHistoryPoint[],
    };
  }

  const audits = await listOrgSeoAudits(organisationId, 50);
  const snapshots = audits.flatMap((audit) => {
    const metadata = audit.metadata ?? {};
    const websiteUrl =
      typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null;
    if (!websiteUrl || normalisedWebsiteHost(websiteUrl) !== expectedHost) return [];
    const scores = parseScores(metadata.scores);
    if (!scores) return [];
    const ageMs = Date.now() - Date.parse(audit.createdAt);
    return [{
      auditedAt: audit.createdAt,
      websiteUrl,
      scores,
      probes: parseProbes(metadata.probes),
      findings: parseFindings(metadata.findings),
      fresh: Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= AUDIT_FRESH_MS,
    } satisfies AiVisibilityAuditSnapshot];
  });

  return {
    expectedHost,
    latest: snapshots[0] ?? null,
    history: snapshots
      .slice(0, 12)
      .reverse()
      .map((snapshot) => ({
        auditedAt: snapshot.auditedAt,
        value: snapshot.scores.aiVisibility,
      })),
  };
}

export type AiReadinessDimension = {
  id: string;
  label: string;
  value: number | null;
  evidence: string;
};

export function buildAiReadinessDimensions(
  probes: OrgSeoAuditProbes | null,
): AiReadinessDimension[] {
  if (!probes) {
    return [
      { id: "technical", label: "Technical access", value: null, evidence: "Run a presence scan" },
      { id: "entity", label: "Entity clarity", value: null, evidence: "Run a presence scan" },
      { id: "content", label: "Content semantics", value: null, evidence: "Run a presence scan" },
      { id: "distribution", label: "Distribution readiness", value: null, evidence: "Run a presence scan" },
    ];
  }

  const technical =
    (probes.reachable === true ? 50 : 0) +
    (probes.https === true ? 30 : 0) +
    (probes.hasViewport ? 20 : 0);
  const entity = (probes.hasJsonLd ? 70 : 0) + (probes.title ? 30 : 0);
  const content =
    (probes.title ? 35 : 0) +
    (probes.hasMetaDescription ? 30 : 0) +
    (probes.hasH1 ? 35 : 0);
  const distribution = probes.hasOpenGraph ? 100 : 0;

  return [
    {
      id: "technical",
      label: "Technical access",
      value: technical,
      evidence: `${probes.reachable === true ? "reachable" : "reachability gap"} · ${probes.https === true ? "HTTPS" : "HTTPS gap"} · ${probes.hasViewport ? "mobile viewport" : "viewport gap"}`,
    },
    {
      id: "entity",
      label: "Entity clarity",
      value: entity,
      evidence: `${probes.hasJsonLd ? "structured data detected" : "structured data missing"} · ${probes.title ? "page title detected" : "page title missing"}`,
    },
    {
      id: "content",
      label: "Content semantics",
      value: content,
      evidence: `${probes.hasH1 ? "H1" : "H1 gap"} · ${probes.hasMetaDescription ? "meta description" : "meta description gap"} · ${probes.title ? "title" : "title gap"}`,
    },
    {
      id: "distribution",
      label: "Distribution readiness",
      value: distribution,
      evidence: probes.hasOpenGraph ? "Open Graph detected" : "Open Graph not detected",
    },
  ];
}
