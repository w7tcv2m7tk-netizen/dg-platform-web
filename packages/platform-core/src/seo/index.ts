/**
 * Customer SEO Engine — presence probe + native site SEO coverage.
 * Reuses Growth Engine HTML signals; persists audits as Activities.
 * Shared source of truth for SEO App + AI Visibility (no invented citations).
 */

import { createActivity, listOrganisationActivities } from "../activities";
import { runPresenceAudit, type PresenceAuditResult } from "../command-centre/growth-engine/presence-audit";
import type { ProspectAuditFinding } from "../command-centre/growth-engine/types";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { buildNativeWebsiteHealth } from "../websites/native-health";
import { listWebsitesWithPages } from "../websites/crud";
import type { SiteHealthSnapshot } from "../websites/types";

export type OrgSeoAuditScores = {
  seo: number;
  websiteHealth: number;
  aiVisibility: number;
  nativeSeo: number | null;
};

export type OrgSeoAuditProbes = {
  reachable: boolean | null;
  https: boolean | null;
  title: string | null;
  hasMetaDescription: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasJsonLd: boolean;
  hasH1: boolean;
};

export type OrgSeoAuditResult = {
  auditedAt: string;
  websiteUrl: string | null;
  scores: OrgSeoAuditScores;
  presence: PresenceAuditResult;
  nativeHealth: SiteHealthSnapshot | null;
  findings: ProspectAuditFinding[];
  activityId?: string;
};

/** Snapshot derived from the latest persisted SEO audit Activity. */
export type LatestSeoAuditSnapshot = {
  auditedAt: string;
  websiteUrl: string | null;
  scores: OrgSeoAuditScores;
  probes: OrgSeoAuditProbes | null;
  findings: ProspectAuditFinding[];
  activityId: string;
  /** True when auditedAt is within the freshness window (default 30 days). */
  fresh: boolean;
};

const AUDIT_FRESH_MS = 30 * 24 * 60 * 60 * 1000;

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function parseScores(raw: unknown): OrgSeoAuditScores | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.seo !== "number") return null;
  return {
    seo: clamp(s.seo),
    websiteHealth: typeof s.websiteHealth === "number" ? clamp(s.websiteHealth) : 0,
    aiVisibility: typeof s.aiVisibility === "number" ? clamp(s.aiVisibility) : 0,
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

function parseFindings(raw: unknown): ProspectAuditFinding[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is ProspectAuditFinding =>
      Boolean(f) &&
      typeof f === "object" &&
      typeof (f as ProspectAuditFinding).title === "string" &&
      typeof (f as ProspectAuditFinding).domain === "string",
  );
}

/** Run SEO audit for an organisation (public URL + optional native Studio site). */
export async function runOrgSeoAudit(input: {
  organisationId: string;
  websiteUrl?: string | null;
  actorId?: string;
  persist?: boolean;
}): Promise<OrgSeoAuditResult> {
  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const websiteUrl =
    input.websiteUrl?.trim() ||
    profile?.websiteUrl?.trim() ||
    null;

  const businessName =
    profile?.tradingName?.trim() ||
    profile?.businessName?.trim() ||
    "Business";

  const locationLabel = profile?.address
    ? [profile.address.city, profile.address.state].filter(Boolean).join(", ")
    : profile?.locations?.[0]
      ? [profile.locations[0].city, profile.locations[0].state]
          .filter(Boolean)
          .join(", ")
      : null;

  const presence = await runPresenceAudit({
    businessName,
    websiteUrl,
    industry: profile?.industryVertical ?? null,
    location: locationLabel,
    contactEmail:
      profile?.businessEmail ?? profile?.contactEmail ?? profile?.supportEmail ?? null,
    contactPhone:
      profile?.businessPhone ?? profile?.contactPhone ?? profile?.supportPhone ?? null,
  });

  let nativeHealth: SiteHealthSnapshot | null = null;
  try {
    const sites = await listWebsitesWithPages(input.organisationId);
    const primary = sites[0];
    if (primary) {
      nativeHealth = buildNativeWebsiteHealth({ website: primary });
    }
  } catch {
    nativeHealth = null;
  }

  const seoBase = presence.scores.seo ?? 0;
  const nativeSeo = nativeHealth?.score ?? null;
  const blendedSeo =
    nativeSeo == null ? seoBase : clamp(seoBase * 0.65 + nativeSeo * 0.35);

  const findings = [...presence.findings];
  if (nativeHealth) {
    for (const check of nativeHealth.checks) {
      if (check.status === "fail" || check.status === "warn") {
        findings.push({
          domain: "seo",
          severity: check.status === "fail" ? "warning" : "opportunity",
          title: `Studio: ${check.label}`,
          detail: check.detail,
          recommendedAction: "Fix in Website Studio → SEO / Publish",
        });
      }
    }
  }

  const result: OrgSeoAuditResult = {
    auditedAt: new Date().toISOString(),
    websiteUrl: presence.probes.websiteUrl,
    scores: {
      seo: blendedSeo,
      websiteHealth: presence.scores.websiteHealth ?? nativeHealth?.score ?? 0,
      aiVisibility: presence.scores.aiVisibility ?? 0,
      nativeSeo,
    },
    presence,
    nativeHealth,
    findings,
  };

  if (input.persist !== false) {
    const activity = await createActivity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "Organisation",
      entityId: input.organisationId,
      activityType: "seo.audit_completed",
      title: `SEO audit · score ${blendedSeo}/100`,
      body: websiteUrl
        ? `Audited ${websiteUrl}`
        : "No website URL — add one in Business Profile",
      sourceApp: "seo",
      metadata: {
        scores: result.scores,
        findingCount: findings.length,
        findings: findings.slice(0, 40),
        websiteUrl: result.websiteUrl,
        probes: {
          reachable: presence.probes.reachable,
          https: presence.probes.https,
          title: presence.probes.title,
          hasMetaDescription: presence.probes.hasMetaDescription,
          hasViewport: presence.probes.hasViewport,
          hasOpenGraph: presence.probes.hasOpenGraph,
          hasJsonLd: presence.probes.hasJsonLd,
          hasH1: presence.probes.hasH1,
        },
      },
    });
    result.activityId = activity.id;
  }

  return result;
}

/** Recent SEO audit activities for an org. */
export async function listOrgSeoAudits(organisationId: string, limit = 10) {
  const { items } = await listOrganisationActivities({
    organisationId,
    sourceApp: "seo",
    limit,
  });
  return items.filter((a) => a.activityType === "seo.audit_completed");
}

export async function getLatestOrgSeoAudit(organisationId: string) {
  const audits = await listOrgSeoAudits(organisationId, 1);
  return audits[0] ?? null;
}

export function getAuditPresenceProbes(
  audit: { metadata?: Record<string, unknown> | null } | null | undefined,
): OrgSeoAuditProbes | null {
  return parseProbes(audit?.metadata?.probes);
}

/**
 * Scores + probes from the latest persisted SEO/presence audit.
 * Shared by SEO Engine and AI Visibility — never invents citation metrics.
 */
export async function scoresFromLatestSeoAudit(
  organisationId: string,
  options?: { maxAgeMs?: number },
): Promise<LatestSeoAuditSnapshot | null> {
  const audit = await getLatestOrgSeoAudit(organisationId);
  if (!audit) return null;

  const scores = parseScores(audit.metadata?.scores);
  if (!scores) return null;

  const auditedAt = audit.createdAt;
  const ageMs = Date.now() - Date.parse(auditedAt);
  const maxAge = options?.maxAgeMs ?? AUDIT_FRESH_MS;
  const fresh = Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAge;

  return {
    auditedAt,
    websiteUrl:
      typeof audit.metadata?.websiteUrl === "string" ? audit.metadata.websiteUrl : null,
    scores,
    probes: getAuditPresenceProbes(audit),
    findings: parseFindings(audit.metadata?.findings),
    activityId: audit.id,
    fresh,
  };
}
