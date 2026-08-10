/**
 * Customer SEO Engine — presence probe + native site SEO coverage.
 * Reuses Growth Engine HTML signals; persists audits as Activities.
 */

import { createActivity, listOrganisationActivities } from "../activities";
import { runPresenceAudit, type PresenceAuditResult } from "../command-centre/growth-engine/presence-audit";
import type { ProspectAuditFinding } from "../command-centre/growth-engine/types";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { buildNativeWebsiteHealth } from "../websites/native-health";
import { listWebsitesWithPages } from "../websites/crud";
import type { SiteHealthSnapshot } from "../websites/types";

export type OrgSeoAuditResult = {
  auditedAt: string;
  websiteUrl: string | null;
  scores: {
    seo: number;
    websiteHealth: number;
    aiVisibility: number;
    nativeSeo: number | null;
  };
  presence: PresenceAuditResult;
  nativeHealth: SiteHealthSnapshot | null;
  findings: ProspectAuditFinding[];
  activityId?: string;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
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
        websiteUrl: result.websiteUrl,
        probes: {
          reachable: presence.probes.reachable,
          https: presence.probes.https,
          title: presence.probes.title,
          hasMetaDescription: presence.probes.hasMetaDescription,
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
