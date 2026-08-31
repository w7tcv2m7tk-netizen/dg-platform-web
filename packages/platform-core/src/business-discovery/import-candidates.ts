import { createGrowthProspect, listGrowthProspects } from "../command-centre/growth-engine/prospects";
import { runGrowthProspectAudit } from "../command-centre/growth-engine/audits";
import { organisationGrowthScope } from "../command-centre/growth-engine/scope";
import { resolveIndustryPack } from "./industry-packs";
import type { DiscoveryCandidate } from "./types";

export type ImportDiscoveryCandidateInput = {
  candidates: DiscoveryCandidate[];
  /** Required — import into this organisation's prospect book only. */
  organisationId: string;
  industry?: string;
  location?: string;
  businessType?: string;
  ownerClerkUserId?: string;
  actorId?: string;
  operatorOrganisationId?: string;
  /** Run presence audit immediately after create. */
  runAudit?: boolean;
};

export type ImportDiscoveryResult = {
  imported: Array<{
    prospectId: string;
    businessName: string;
    key: string;
    auditId?: string;
  }>;
  skipped: Array<{ key: string; businessName: string; reason: string }>;
};

function normalizeWebsite(url?: string): string | null {
  if (!url?.trim()) return null;
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    return new URL(withScheme).toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Selective import — creates GrowthProspect rows with providerRefs.
 * Does not create CRM Company records.
 */
export async function importDiscoveryCandidates(
  input: ImportDiscoveryCandidateInput,
): Promise<ImportDiscoveryResult> {
  const organisationId = input.organisationId || input.operatorOrganisationId;
  if (!organisationId) {
    throw new Error("organisationId is required to import discovery candidates");
  }

  const pack = resolveIndustryPack(input.industry, input.businessType);
  const existing = await listGrowthProspects({
    organisationId,
    limit: 200,
    includeArchived: true,
  });
  const byPlace = new Set<string>();
  const byAbn = new Set<string>();
  const byWebsite = new Set<string>();
  const byName = new Set<string>();

  for (const p of existing) {
    byName.add(p.businessName.trim().toLowerCase());
    const site = normalizeWebsite(p.websiteUrl ?? undefined);
    if (site) byWebsite.add(site);
    const refs = (p.metadata as { providerRefs?: { googlePlaceId?: string; abn?: string } } | null)
      ?.providerRefs;
    if (refs?.googlePlaceId) byPlace.add(String(refs.googlePlaceId));
    if (refs?.abn) byAbn.add(String(refs.abn));
  }

  const imported: ImportDiscoveryResult["imported"] = [];
  const skipped: ImportDiscoveryResult["skipped"] = [];

  for (const candidate of input.candidates) {
    const name = candidate.businessName?.trim();
    if (!name) {
      skipped.push({
        key: candidate.key,
        businessName: "",
        reason: "missing_business_name",
      });
      continue;
    }

    const placeId = candidate.providerRefs?.googlePlaceId;
    const abn = candidate.providerRefs?.abn;
    const site = normalizeWebsite(candidate.websiteUrl);

    if (placeId && byPlace.has(placeId)) {
      skipped.push({ key: candidate.key, businessName: name, reason: "duplicate_place_id" });
      continue;
    }
    if (abn && byAbn.has(abn)) {
      skipped.push({ key: candidate.key, businessName: name, reason: "duplicate_abn" });
      continue;
    }
    if (site && byWebsite.has(site)) {
      skipped.push({ key: candidate.key, businessName: name, reason: "duplicate_website" });
      continue;
    }
    if (byName.has(name.toLowerCase()) && !site && !placeId) {
      skipped.push({ key: candidate.key, businessName: name, reason: "duplicate_name" });
      continue;
    }

    const prospect = await createGrowthProspect({
      organisationId,
      businessName: name,
      contactPhone: candidate.phone,
      industry: input.industry?.trim() || pack.label,
      location: candidate.location || input.location,
      websiteUrl: candidate.websiteUrl,
      ownerClerkUserId: input.ownerClerkUserId,
      actorId: input.actorId,
      operatorOrganisationId: organisationId,
      metadata: {
        discoverySource: "business-discovery",
        industryPackId: pack.id,
        businessType: input.businessType || candidate.businessType || null,
        rating: candidate.rating ?? null,
        ratingCount: candidate.ratingCount ?? null,
        provider: candidate.provider,
        providerRefs: {
          googlePlaceId: placeId || null,
          abn: abn || null,
          mapsUri: candidate.providerRefs?.mapsUri || null,
        },
      },
    });

    byName.add(name.toLowerCase());
    if (site) byWebsite.add(site);
    if (placeId) byPlace.add(placeId);
    if (abn) byAbn.add(abn);

    let auditId: string | undefined;
    if (input.runAudit) {
      try {
        const audit = await runGrowthProspectAudit({
          prospectId: prospect.id,
          // Prospect was just created under this tenant above.
          scope: organisationGrowthScope(organisationId),
          actorId: input.actorId,
          operatorOrganisationId: input.operatorOrganisationId,
        });
        auditId = audit?.id;
      } catch {
        // Import still succeeds if audit fails
      }
    }

    imported.push({
      prospectId: prospect.id,
      businessName: prospect.businessName,
      key: candidate.key,
      auditId,
    });
  }

  return { imported, skipped };
}
