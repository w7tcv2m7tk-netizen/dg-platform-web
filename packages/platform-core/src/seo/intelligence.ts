import { listOrganisationActivities } from "../activities";

export type SeoEvidenceScore = {
  seo: number | null;
  websiteHealth: number | null;
  nativeSeo: number | null;
};

export type SeoAuditEvidence = {
  id: string;
  auditedAt: string;
  websiteUrl: string | null;
  hostname: string | null;
  scores: SeoEvidenceScore;
  findingCount: number;
  findings: Array<{
    domain: string;
    severity: string;
    title: string;
    detail: string;
    recommendedAction?: string;
  }>;
};

export type SeoCurrentSnapshot = {
  methodology: "latest_matching_audit";
  latest: SeoAuditEvidence | null;
  fresh: boolean;
  ageDays: number | null;
  auditCount: number;
};

export type SeoTrendSnapshot = {
  methodology: "latest_vs_previous_matching_audit";
  current: SeoAuditEvidence | null;
  previous: SeoAuditEvidence | null;
  seoDelta: number | null;
  websiteHealthDelta: number | null;
  nativeSeoDelta: number | null;
};

const FRESH_MS = 30 * 24 * 60 * 60 * 1000;

function score(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : null;
}

function hostname(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function parseFindings(value: unknown): SeoAuditEvidence["findings"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.title !== "string") return [];
    return [{
      domain: typeof item.domain === "string" ? item.domain : "seo",
      severity: typeof item.severity === "string" ? item.severity : "opportunity",
      title: item.title,
      detail: typeof item.detail === "string" ? item.detail : "",
      ...(typeof item.recommendedAction === "string"
        ? { recommendedAction: item.recommendedAction }
        : {}),
    }];
  });
}

export async function listSeoAuditEvidence(
  organisationId: string,
  limit = 100,
): Promise<SeoAuditEvidence[]> {
  const { items } = await listOrganisationActivities({
    organisationId,
    sourceApp: "seo",
    limit,
  });

  return items
    .filter((item) => item.activityType === "seo.audit_completed")
    .map((item) => {
      const metadata = item.metadata ?? {};
      const rawScores =
        metadata.scores && typeof metadata.scores === "object"
          ? (metadata.scores as Record<string, unknown>)
          : {};
      const websiteUrl =
        typeof metadata.websiteUrl === "string" ? metadata.websiteUrl : null;
      const findings = parseFindings(metadata.findings);
      return {
        id: item.id,
        auditedAt: item.createdAt,
        websiteUrl,
        hostname: hostname(websiteUrl),
        scores: {
          seo: score(rawScores.seo),
          websiteHealth: score(rawScores.websiteHealth),
          nativeSeo: score(rawScores.nativeSeo),
        },
        findingCount:
          typeof metadata.findingCount === "number"
            ? Math.max(0, Math.round(metadata.findingCount))
            : findings.length,
        findings,
      };
    })
    .sort((a, b) => Date.parse(b.auditedAt) - Date.parse(a.auditedAt));
}

export async function getCurrentSeoSnapshot(
  organisationId: string,
): Promise<SeoCurrentSnapshot> {
  const evidence = await listSeoAuditEvidence(organisationId);
  const latest = evidence[0] ?? null;
  const auditedAt = latest ? Date.parse(latest.auditedAt) : Number.NaN;
  const ageMs = Number.isFinite(auditedAt) ? Date.now() - auditedAt : Number.NaN;
  return {
    methodology: "latest_matching_audit",
    latest,
    fresh: Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= FRESH_MS,
    ageDays: Number.isFinite(ageMs) && ageMs >= 0
      ? Math.floor(ageMs / (24 * 60 * 60 * 1000))
      : null,
    auditCount: evidence.length,
  };
}

function delta(current: number | null, previous: number | null): number | null {
  return current == null || previous == null ? null : current - previous;
}

export async function getSeoTrendSnapshot(
  organisationId: string,
): Promise<SeoTrendSnapshot> {
  const evidence = await listSeoAuditEvidence(organisationId);
  const current = evidence[0] ?? null;
  const previous = current
    ? evidence.find((item, index) => index > 0 && item.hostname === current.hostname) ?? null
    : null;

  return {
    methodology: "latest_vs_previous_matching_audit",
    current,
    previous,
    seoDelta: delta(current?.scores.seo ?? null, previous?.scores.seo ?? null),
    websiteHealthDelta: delta(
      current?.scores.websiteHealth ?? null,
      previous?.scores.websiteHealth ?? null,
    ),
    nativeSeoDelta: delta(
      current?.scores.nativeSeo ?? null,
      previous?.scores.nativeSeo ?? null,
    ),
  };
}
