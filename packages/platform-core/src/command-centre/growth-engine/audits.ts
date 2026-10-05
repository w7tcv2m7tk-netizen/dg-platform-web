import { randomBytes } from "node:crypto";

import type { ProspectAuditFinding, ProspectAuditScores } from "./types";
import { runPresenceAudit } from "./presence-audit";
import { updateGrowthProspect } from "./prospects";
import { abnLookupProvider } from "../../business-discovery/providers/abn-lookup";
import { coreLogicCredentialsConfigured, matchCoreLogicAddress, isCoreLogicPropertyMatch } from "../../connectors/corelogic";
import { fetchDomainProspectAgencyEvidence } from "../../connectors/domain";
import { reaCredentialsConfigured } from "../../connectors/rea";
import { googlePlacesProvider } from "../../business-discovery/providers/google-places";
import type { DiscoveryCandidate } from "../../business-discovery/types";

export interface CreateGrowthProspectAuditInput {
  prospectId: string;
  scores: ProspectAuditScores;
  findings?: Record<string, unknown> | ProspectAuditFinding[];
  auditVersion?: string;
  actorId?: string;
  operatorOrganisationId?: string;
}

function serializeAudit(row: {
  id: string;
  prospectId: string;
  businessHealth: number | null;
  aiVisibility: number | null;
  seoScore: number | null;
  websiteHealth: number | null;
  findings: unknown;
  auditVersion: string;
  auditedAt: Date;
}) {
  return {
    id: row.id,
    prospectId: row.prospectId,
    businessHealth: row.businessHealth,
    aiVisibility: row.aiVisibility,
    seoScore: row.seoScore,
    websiteHealth: row.websiteHealth,
    findings: row.findings,
    auditVersion: row.auditVersion,
    auditedAt: row.auditedAt.toISOString(),
  };
}

import {
  growthScopeProspectWhere,
  growthScopeWhere,
  type GrowthScope,
} from "./scope";

export async function createGrowthProspectAudit(input: CreateGrowthProspectAuditInput) {
  const { prisma } = await import("@dg/database");

  const prospect = await prisma.growthProspect.findUnique({
    where: { id: input.prospectId },
    select: { id: true, organisationId: true, archivedAt: true, stage: true },
  });
  if (!prospect || prospect.archivedAt) return null;

  const organisationId =
    prospect.organisationId ?? input.operatorOrganisationId ?? undefined;
  if (!organisationId) {
    throw new Error("organisationId is required to audit a growth prospect");
  }

  const audit = await prisma.growthProspectAudit.create({
    data: {
      prospectId: input.prospectId,
      businessHealth: input.scores.businessHealth ?? null,
      aiVisibility: input.scores.aiVisibility ?? null,
      seoScore: input.scores.seo ?? null,
      websiteHealth: input.scores.websiteHealth ?? null,
      findings: (input.findings ?? {}) as object,
      auditVersion: input.auditVersion ?? "1.0",
    },
  });

  // Research enrichment must not move an existing prospect backwards.
  if (prospect.stage === "prospect") {
    await updateGrowthProspect({
      prospectId: input.prospectId,
      organisationId,
      stage: "audit_created",
      actorId: input.actorId,
      operatorOrganisationId: organisationId,
    });
  }

  await prisma.growthProspectEngagement.create({
    data: {
      prospectId: input.prospectId,
      type: "audit_created",
      metadata: {
        auditId: audit.id,
        businessHealth: input.scores.businessHealth,
      },
    },
  });

  return serializeAudit(audit);
}

type DigitalGateSolutionMatch = {
  capability: string;
  opportunity: string;
  evidence: string;
  benefit: string;
  relevance: "high" | "medium";
};

function buildDigitalGateSolutionMatches(
  presence: Awaited<ReturnType<typeof runPresenceAudit>>,
  findings: ProspectAuditFinding[] = presence.findings || [],
): DigitalGateSolutionMatch[] {
  const matches: DigitalGateSolutionMatch[] = [];
  const has = (re: RegExp) => findings.some((f) => re.test(`${f.title} ${f.category || ""} ${f.domain}`));

  if ((presence.scores.aiVisibility ?? 100) < 60 || has(/structured|ai.visibility/i)) matches.push({
    capability: "AI Visibility Framework™",
    opportunity: "Improve how search engines and AI systems understand and surface the business.",
    evidence: `AI Visibility ${presence.scores.aiVisibility ?? "—"}/100`,
    benefit: "Stronger machine-readable entity signals and a clearer foundation for AI/search discovery.",
    relevance: "high",
  });
  if ((presence.scores.seo ?? 100) < 65 || has(/h1|meta|search|seo/i)) matches.push({
    capability: "SEO & Growth",
    opportunity: "Strengthen organic visibility and search-result foundations.",
    evidence: `Search Visibility ${presence.scores.seo ?? "—"}/100`,
    benefit: "Improve the business's ability to be discovered for commercially relevant searches.",
    relevance: "high",
  });
  if ((presence.scores.conversionReadiness ?? 100) < 70 || has(/conversion|form|call.to.action|contact pathway/i)) matches.push({
    capability: "Websites & Lead Generation",
    opportunity: "Turn more existing website attention into identifiable enquiries and next actions.",
    evidence: `Conversion Readiness ${presence.scores.conversionReadiness ?? "—"}/100`,
    benefit: "Clearer conversion journeys and more measurable lead capture.",
    relevance: "high",
  });
  if ((presence.scores.reputation ?? 100) < 70 || has(/review|reputation|local/i)) matches.push({
    capability: "Reputation & Local Visibility",
    opportunity: "Strengthen trust and local/entity authority around the business.",
    evidence: `Reputation & Presence ${presence.scores.reputation ?? "—"}/100`,
    benefit: "Stronger trust signals for prospects and better local business context for search systems.",
    relevance: "medium",
  });
  if ((presence.scores.growthSignals ?? 100) < 70 || has(/analytics|tracking|measurement/i)) matches.push({
    capability: "Analytics & Business Intelligence",
    opportunity: "Make lead-generation and marketing performance measurable.",
    evidence: `Growth Signals ${presence.scores.growthSignals ?? "—"}/100`,
    benefit: "Connect activity to enquiries, pipeline and commercial outcomes rather than isolated marketing metrics.",
    relevance: "medium",
  });
  if (presence.industryPack === "real_estate") {
    matches.push({
      capability: "Real Estate Industry App",
      opportunity: "Connect appraisal generation, prospecting, CRM follow-up and local market authority into one operating workflow.",
      evidence: "Real Estate industry profile identified",
      benefit: "Create a more systematic vendor-acquisition and relationship pipeline around the agency's existing digital presence.",
      relevance: "high",
    });
    matches.push({
      capability: "Prospecting + CRM + Automation",
      opportunity: "Capture and progress buyer, seller and appraisal intent with consistent next actions.",
      evidence: "Real Estate customer journey requires ongoing relationship follow-up",
      benefit: "Reduce lead leakage and turn digital intent into an organised prospect-to-customer workflow.",
      relevance: "high",
    });
  }
  return matches.slice(0, 8);
}


type ProspectBusinessIntelligence = {
  identity: { abn?: string; registeredName?: string; registeredLocation?: string };
  google: { placeId?: string; rating?: number; reviewCount?: number; category?: string; address?: string; phone?: string; website?: string; mapsUri?: string };
  propertyMarket: { provider?: string; verifiedLocality?: string; state?: string; postcode?: string; retrievedAt?: string };
  marketplace: { domain?: unknown };
  sourceStatus: Record<string, { status: string; note?: string }>;
};

function normaliseBusinessName(value: string) {
  return value.toLowerCase().replace(/\b(pty|ltd|limited|proprietary|the)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function bestCandidate(name: string, rows: DiscoveryCandidate[]) {
  const wanted = normaliseBusinessName(name);
  return rows.find((row) => normaliseBusinessName(row.businessName) === wanted)
    ?? rows.find((row) => {
      const candidate = normaliseBusinessName(row.businessName);
      return candidate.includes(wanted) || wanted.includes(candidate);
    })
    ?? null;
}

function normaliseHost(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function googleCandidateMatchesProspect(prospect: { location: string | null; websiteUrl: string | null }, candidate: DiscoveryCandidate | null) {
  if (!candidate) return false;
  const prospectHost = normaliseHost(prospect.websiteUrl);
  const candidateHost = normaliseHost(candidate.websiteUrl);
  if (prospectHost && candidateHost && prospectHost === candidateHost) return true;

  // Without a website-domain match, require the known prospect locality to agree
  // with the Places address. A name-only match is never sufficient for verified GBP.
  const location = (prospect.location || "").toLowerCase();
  const address = (candidate.location || "").toLowerCase();
  if (!location || !address) return false;
  const tokens = location.split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !/^(street|road|avenue|drive|court|unit|suite|qld|nsw|vic|sa|wa|tas|nt|act|australia)$/.test(token));
  return tokens.length > 0 && tokens.some((token) => address.includes(token));
}

async function enrichProspectBusinessIntelligence(prospect: {
  businessName: string; industry: string | null; location: string | null; websiteUrl: string | null;
}): Promise<ProspectBusinessIntelligence> {
  const sourceStatus: ProspectBusinessIntelligence["sourceStatus"] = {
    website: { status: "analysed" },
    businessIdentity: { status: abnLookupProvider.isConfigured() ? "searched" : "unavailable", note: abnLookupProvider.unavailableReason() },
    googleBusinessProfile: { status: googlePlacesProvider.isConfigured() ? "searched" : "unavailable", note: googlePlacesProvider.unavailableReason() },
    socialProfiles: { status: "website_verified", note: "Public social profiles linked by the business website are captured as first-party public evidence." },
    linkedin: { status: "planned", note: "Public LinkedIn evidence requires a compliant public-profile discovery path; customer OAuth data is not used for prospects." },
    industryCredentials: { status: "planned", note: "Licence or registration data will only be shown when verified against an authoritative public register." },
    propertyMarketIntelligence: { status: coreLogicCredentialsConfigured() ? "available" : "unavailable", note: coreLogicCredentialsConfigured() ? "Cotality connector available; locality evidence is verified before market intelligence is attached." : "Cotality connector is not configured." },
    reaMarketplace: { status: reaCredentialsConfigured() ? "connected_scope_limited" : "unavailable", note: reaCredentialsConfigured() ? "REA Partner Platform is connected for agency activation and listing upload. The current granted/implemented surface does not provide a general unaffiliated-agency search, so no competitor marketplace metrics are inferred." : "REA Partner Platform credentials are not configured." },
  };
  const ctx = { textQuery: prospect.businessName, location: prospect.location ?? undefined, industry: prospect.industry ?? undefined, businessType: prospect.industry ?? undefined, limit: 8 };
  const [abrRows, placeRows] = await Promise.all([
    abnLookupProvider.isConfigured() ? abnLookupProvider.search(ctx).catch(() => []) : Promise.resolve([]),
    googlePlacesProvider.isConfigured() ? googlePlacesProvider.search(ctx).catch(() => []) : Promise.resolve([]),
  ]);
  const abr = bestCandidate(prospect.businessName, abrRows);
  const placeCandidate = bestCandidate(prospect.businessName, placeRows);
  const place = googleCandidateMatchesProspect(prospect, placeCandidate) ? placeCandidate : null;
  if (abr) sourceStatus.businessIdentity = { status: "verified_match" };
  else if (abnLookupProvider.isConfigured()) sourceStatus.businessIdentity = { status: "no_confident_match", note: "No sufficiently confident ABR name match was found automatically." };

  // Licence-source availability follows verified Australian identity evidence as well
  // as the prospect record. A missing operator-entered location must not downgrade a
  // Queensland real-estate prospect to PLANNED when ABR has independently verified QLD.
  const verifiedAustralianLocation = [prospect.location, abr?.location].filter(Boolean).join(" ");
  if (/real\\s*estate/i.test(prospect.industry || "") && /\\bqld\\b|queensland/i.test(verifiedAustralianLocation)) {
    sourceStatus.industryCredentials = {
      status: "manual_verification_available",
      note: "Queensland OFT maintains the authoritative public property licence register. Verification is deliberately individual/manual because OFT conditions prohibit bulk requests for marketing purposes; store licence holder, class, number/status and verification date only after a specific check.",
    };
  }

  let propertyMarket: ProspectBusinessIntelligence["propertyMarket"] = {};
  if (coreLogicCredentialsConfigured() && /real\s*estate/i.test(prospect.industry || "") && prospect.location) {
    const matched = await matchCoreLogicAddress(prospect.location).catch(() => null);
    if (matched?.ok && isCoreLogicPropertyMatch(matched.match)) {
      propertyMarket = {
        provider: "Cotality",
        verifiedLocality: matched.match.address?.locality,
        state: matched.match.address?.state,
        postcode: matched.match.address?.postcode,
        retrievedAt: new Date().toISOString(),
      };
      sourceStatus.propertyMarketIntelligence = { status: "locality_verified", note: "Cotality Address Match verified the agency location. Market statistics remain fail-closed until the entitled Statistics endpoint contract is implemented." };
    } else {
      sourceStatus.propertyMarketIntelligence = { status: "connected_locality_unresolved", note: "Cotality is connected, but the agency office address did not resolve within the configured Address Match dataset. This does not imply the agency or locality is absent from Cotality. Prospect market metrics remain fail-closed until an entitled locality/Statistics adapter is implemented." };
    }
  }
  let marketplace: ProspectBusinessIntelligence["marketplace"] = {};
  if (/real\s*estate/i.test(prospect.industry || "")) {
    if (reaCredentialsConfigured()) {
      sourceStatus.reaMarketplace = {
        status: "connected_scope_limited",
        note: "REA Partner Platform credentials are configured for DigitalGate agency activation and listing upload. Prospect research remains fail-closed because the granted/implemented Partner surface is not a general unaffiliated-agency search source. Activation/integrations health is checked separately and does not determine competitor-research availability.",
      };
    }
    const domain = await fetchDomainProspectAgencyEvidence({ businessName: prospect.businessName, location: prospect.location }).catch((error) => ({ ok: false as const, status: "provider_error" as const, message: error instanceof Error ? error.message : "Domain research failed" }));
    sourceStatus.domainMarketplace = { status: domain.status, note: domain.ok ? "Verified against Domain Agents & Listings using platform credentials; no customer OAuth data was used." : domain.message };
    if (domain.ok) marketplace = { domain };
  }
  if (place) sourceStatus.googleBusinessProfile = { status: "verified_match" };
  else if (googlePlacesProvider.isConfigured()) sourceStatus.googleBusinessProfile = {
    status: "no_confident_match",
    note: placeCandidate
      ? "A name match was found in Google Places, but its website/location evidence did not match the prospect strongly enough. Google evidence was excluded."
      : "No sufficiently confident Google Places match was found automatically.",
  };
  return {
    identity: abr ? { abn: abr.providerRefs.abn, registeredName: abr.businessName, registeredLocation: abr.location } : {},
    propertyMarket,
    marketplace,
    google: place ? {
      placeId: place.providerRefs.googlePlaceId, rating: place.rating, reviewCount: place.ratingCount,
      category: place.businessType, address: place.location, phone: place.phone, website: place.websiteUrl,
      mapsUri: place.providerRefs.mapsUri,
    } : {},
    sourceStatus,
  };
}

function canonicaliseProspectResearchFindings(
  findings: ProspectAuditFinding[],
): ProspectAuditFinding[] {
  return findings.map((finding) => {
    if (finding.title === "Low DigitalGate Business Health Score™") {
      return {
        ...finding,
        detail: finding.detail?.replace(
          /\s*[—-]\s*strong opening for a DigitalGate conversation\.?/i,
          ".",
        ),
        recommendedAction:
          "Prioritise the weakest verified foundations first, then re-measure the Business Health Score.",
      };
    }

    if (
      finding.title === "Location information could not be fully established" &&
      /no location was recorded on the prospect record/i.test(
        `${finding.observed ?? ""} ${finding.detail ?? ""}`,
      )
    ) {
      return {
        ...finding,
        title: "Prospect location has not been verified",
      };
    }

    return finding;
  });
}

/** Live presence audit for a prospect — fetches website signals when a URL exists. */
export async function runGrowthProspectAudit(input: {
  prospectId: string;
  scope: GrowthScope;
  actorId?: string;
  operatorOrganisationId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const prospect = await prisma.growthProspect.findFirst({
    where: { id: input.prospectId, ...growthScopeWhere(input.scope) },
  });
  if (!prospect || prospect.archivedAt) return null;

  const presence = await runPresenceAudit({
    businessName: prospect.businessName,
    websiteUrl: prospect.websiteUrl,
    industry: prospect.industry,
    location: prospect.location,
    contactEmail: prospect.contactEmail,
    contactPhone: prospect.contactPhone,
  });

  // Canonicalise at the prospect-audit boundary so persisted Research evidence,
  // the operator UI and customer report all consume the same finding copy.
  // This also cleans legacy wording if a stale platform-core build ever reaches
  // this route; the public report remains a final defensive boundary.
  const businessIntelligence = await enrichProspectBusinessIntelligence({
    businessName: prospect.businessName,
    industry: prospect.industry,
    location: prospect.location,
    websiteUrl: prospect.websiteUrl,
  });

  // Keep one location issue, not two. If ABR has independently established an
  // Australian registered location, the CRM-only "prospect location" warning adds
  // no useful evidence and duplicates the website/local-presence finding.
  const researchFindings = canonicaliseProspectResearchFindings(presence.findings).filter((finding) => {
    if (finding.title !== "Prospect location has not been verified") return true;
    return !businessIntelligence.identity.registeredLocation;
  });

  const socialProfiles = presence.probes.socialProfiles || {};
  const socialChannelCount = Object.values(socialProfiles).filter(Boolean).length;
  // Evidence-safe social score: coverage + website integration only. We do not infer audience,
  // engagement or posting activity without a compliant observable source.
  const socialPresenceScore = Math.min(100, socialChannelCount * 20 + (socialChannelCount > 0 ? 20 : 0));
  const appraisal = presence.probes.appraisalSignals || {};
  const reputationScore = presence.scores.reputation ?? 0;
  const localAuthorityScore = Math.min(100, (appraisal.suburbMentions ?? 0) * 20);
  const appraisalPathScore = (appraisal.hasAppraisalCta ? 50 : 0) + (appraisal.hasAppraisalForm ? 50 : 0);
  const discoverabilityScore = Math.round(((presence.scores.seo ?? 0) + (presence.scores.aiVisibility ?? 0)) / 2);
  const acquisitionReadinessScore = Math.round(
    appraisalPathScore * 0.35 +
    localAuthorityScore * 0.15 +
    reputationScore * 0.2 +
    socialPresenceScore * 0.15 +
    discoverabilityScore * 0.15,
  );

  const audit = await createGrowthProspectAudit({
    prospectId: prospect.id,
    scores: presence.scores,
    findings: {
      items: researchFindings,
      probes: presence.probes,
      strengths: presence.strengths,
      industryInsights: presence.industryInsights,
      industryPack: presence.industryPack,
      scorecard: {
        reputation: presence.scores.reputation ?? null,
        conversionReadiness: presence.scores.conversionReadiness ?? null,
        growthSignals: presence.scores.growthSignals ?? null,
        searchVisibility: presence.scores.seo ?? null,
      },
      digitalGateSolutionMatches: buildDigitalGateSolutionMatches(presence, researchFindings),
      businessIntelligence: {
        ...businessIntelligence,
        publicProfiles: socialProfiles,
        socialAssessment: {
          score: socialPresenceScore,
          channelCount: socialChannelCount,
          basis: "Verified channel coverage and website integration only",
          activityStatus: "not_assessed",
          audienceStatus: "not_assessed",
          engagementStatus: "not_assessed",
        },
        realEstateJourney: {
          ...appraisal,
          acquisitionReadiness: {
            score: acquisitionReadinessScore,
            appraisalPath: appraisalPathScore,
            localAuthority: localAuthorityScore,
            reputation: reputationScore,
            socialPresence: socialPresenceScore,
            discoverability: discoverabilityScore,
          },
        },
      },
      intelligenceSources: businessIntelligence.sourceStatus,
    },
    auditVersion: "presence-3.7",
    actorId: input.actorId,
    operatorOrganisationId:
      input.operatorOrganisationId ?? prospect.organisationId ?? undefined,
  });
  if (!audit) return null;

  return {
    ...audit,
    prospect: {
      id: prospect.id,
      businessName: prospect.businessName,
      websiteUrl: prospect.websiteUrl,
      industry: prospect.industry,
      location: prospect.location,
    },
    findingsList: researchFindings,
    probes: presence.probes,
  };
}

export async function listGrowthProspectAudits(
  scope: GrowthScope,
  options?: { limit?: number },
) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 50, 100);

  const scoped = growthScopeProspectWhere(scope).prospect;
  const rows = await prisma.growthProspectAudit.findMany({
    where: {
      prospect: {
        ...scoped,
        archivedAt: null,
      },
    },
    orderBy: { auditedAt: "desc" },
    take: limit,
    include: {
      prospect: {
        select: {
          id: true,
          businessName: true,
          websiteUrl: true,
          industry: true,
          location: true,
          stage: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    ...serializeAudit(row),
    prospect: row.prospect,
  }));
}

export async function listProspectsNeedingAudit(options?: {
  organisationId?: string;
  limit?: number;
}) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 40, 100);

  const rows = await prisma.growthProspect.findMany({
    where: {
      archivedAt: null,
      ...(options?.organisationId
        ? { organisationId: options.organisationId }
        : {}),
      stage: { in: ["prospect", "audit_created"] },
      audits: { none: {} },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      businessName: true,
      websiteUrl: true,
      industry: true,
      location: true,
      stage: true,
      updatedAt: true,
    },
  });

  return rows.map((r) => ({
    ...r,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export function newShareToken() {
  return randomBytes(18).toString("base64url");
}
