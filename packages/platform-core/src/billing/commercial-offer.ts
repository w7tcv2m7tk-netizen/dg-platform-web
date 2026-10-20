import type { Prisma } from "@dg/database";

import type { BillingCadence, Gen2PlatformTier } from "../onboarding/gen2-journey";

export type CustomCommercialOffer = {
  version: 1;
  id: string;
  label: string;
  status: "agreed";
  currency: "aud";
  amountCents: number;
  cadence: BillingCadence;
  platformTier: Gen2PlatformTier;
  industryApps: string[];
  industryTemplates: string[];
  premiumApps: string[];
  supportPlan?: "standard" | "priority" | "success_partner" | "enterprise_success";
  seats?: number;
  trialDays: number;
  oneOffAmountCents?: number;
  oneOffLabel?: string;
  agreedAt?: string;
  notes?: string;
};

type OrganisationSettings = {
  billing?: {
    commercialOffer?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function asString(value: unknown, max = 200): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 50);
}

export function parseCustomCommercialOffer(value: unknown): CustomCommercialOffer | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = asString(raw.id, 100);
  const label = asString(raw.label, 160);
  const amountCents =
    typeof raw.amountCents === "number" && Number.isInteger(raw.amountCents)
      ? raw.amountCents
      : Number.NaN;
  const cadence = raw.cadence === "annual" ? "annual" : raw.cadence === "monthly" ? "monthly" : null;
  const platformTier =
    raw.platformTier === "starter" ||
    raw.platformTier === "professional" ||
    raw.platformTier === "business"
      ? raw.platformTier
      : null;
  if (
    raw.version !== 1 ||
    raw.status !== "agreed" ||
    raw.currency !== "aud" ||
    !id ||
    !label ||
    !Number.isFinite(amountCents) ||
    amountCents <= 0 ||
    !cadence ||
    !platformTier
  ) {
    return null;
  }
  const supportPlan =
    raw.supportPlan === "priority" || raw.supportPlan === "success_partner" || raw.supportPlan === "enterprise_success" || raw.supportPlan === "standard"
      ? raw.supportPlan
      : undefined;
  const seats =
    typeof raw.seats === "number" && Number.isInteger(raw.seats) && raw.seats > 0
      ? Math.min(raw.seats, 10000)
      : undefined;
  const trialDays =
    typeof raw.trialDays === "number" && Number.isInteger(raw.trialDays) && raw.trialDays >= 0
      ? Math.min(raw.trialDays, 90)
      : 0;
  const oneOffAmountCents =
    typeof raw.oneOffAmountCents === "number" &&
    Number.isInteger(raw.oneOffAmountCents) &&
    raw.oneOffAmountCents > 0
      ? raw.oneOffAmountCents
      : undefined;
  return {
    version: 1,
    id,
    label,
    status: "agreed",
    currency: "aud",
    amountCents,
    cadence,
    platformTier,
    industryApps: asStringArray(raw.industryApps),
    industryTemplates: asStringArray(raw.industryTemplates),
    premiumApps: asStringArray(raw.premiumApps),
    supportPlan,
    seats,
    trialDays,
    oneOffAmountCents,
    oneOffLabel: oneOffAmountCents
      ? asString(raw.oneOffLabel, 160) ?? "Implementation & setup"
      : undefined,
    agreedAt: asString(raw.agreedAt, 64),
    notes: asString(raw.notes, 2000),
  };
}

export function commercialOfferFromSettings(settings: unknown): CustomCommercialOffer | null {
  if (!settings || typeof settings !== "object") return null;
  const billing = (settings as OrganisationSettings).billing;
  return parseCustomCommercialOffer(billing?.commercialOffer);
}

export async function getOrganisationCommercialOffer(
  organisationId: string,
): Promise<CustomCommercialOffer | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  return commercialOfferFromSettings(org?.settings);
}

export async function setOrganisationCommercialOffer(input: {
  organisationId: string;
  offer: CustomCommercialOffer;
}): Promise<CustomCommercialOffer> {
  const offer = parseCustomCommercialOffer(input.offer);
  if (!offer) throw new Error("Invalid custom commercial offer");
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organisation not found");
  const settings = ((org.settings as OrganisationSettings | null) ?? {}) as OrganisationSettings;
  await prisma.organisation.update({
    where: { id: input.organisationId },
    data: {
      settings: {
        ...settings,
        billing: {
          ...(settings.billing ?? {}),
          commercialOffer: offer,
        },
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return offer;
}

/** Alias for stored offers predating custom pricing separation. */
export type NegotiatedCommercialOffer = CustomCommercialOffer;
export const parseNegotiatedCommercialOffer = parseCustomCommercialOffer;

type OpportunityCustomOfferMeta = {
  commercial_offer?: unknown;
  custom_offer_token?: string;
  custom_offer_claimed_by_org_id?: string;
  custom_offer_claimed_at?: string;
  [key: string]: unknown;
};

function opportunityOfferMeta(value: unknown): OpportunityCustomOfferMeta {
  return value && typeof value === "object" ? (value as OpportunityCustomOfferMeta) : {};
}

export async function getOpportunityCustomOffer(input: {
  organisationId: string;
  opportunityId: string;
}): Promise<{
  offer: CustomCommercialOffer | null;
  token: string | null;
  claimedByOrganisationId: string | null;
  claimedAt: string | null;
} | null> {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
    select: { metadata: true },
  });
  if (!row) return null;
  const meta = opportunityOfferMeta(row.metadata);
  return {
    offer: parseCustomCommercialOffer(meta.commercial_offer),
    token: asString(meta.custom_offer_token, 100) ?? null,
    claimedByOrganisationId: asString(meta.custom_offer_claimed_by_org_id, 100) ?? null,
    claimedAt: asString(meta.custom_offer_claimed_at, 64) ?? null,
  };
}

export async function setOpportunityCustomOffer(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
  offer: CustomCommercialOffer;
}): Promise<{ offer: CustomCommercialOffer; token: string }> {
  const offer = parseCustomCommercialOffer(input.offer);
  if (!offer) throw new Error("Invalid custom commercial offer");
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
    select: { id: true, metadata: true },
  });
  if (!row) throw new Error("Opportunity not found");
  const meta = opportunityOfferMeta(row.metadata);
  if (asString(meta.custom_offer_claimed_by_org_id, 100)) {
    throw new Error("Accepted custom pricing offers are locked and cannot be changed.");
  }
  const token = asString(meta.custom_offer_token, 100) ?? crypto.randomUUID().replace(/-/g, "");
  await prisma.opportunity.update({
    where: { id: row.id },
    data: {
      metadata: {
        ...meta,
        commercial_offer: offer,
        custom_offer_token: token,
      } as Prisma.InputJsonValue,
    },
  });
  return { offer, token };
}

export async function findOpportunityCustomOfferByToken(token: string): Promise<{
  opportunityId: string;
  pipelineOrganisationId: string;
  offer: CustomCommercialOffer;
  claimedByOrganisationId: string | null;
  claimedAt: string | null;
} | null> {
  const clean = token.trim();
  if (!clean || !process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  let row = null;
  try {
    row = await prisma.opportunity.findFirst({
      where: { metadata: { path: ["custom_offer_token"], equals: clean } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, organisationId: true, metadata: true },
    });
  } catch {
    const rows = await prisma.opportunity.findMany({
      orderBy: { updatedAt: "desc" },
      take: 500,
      select: { id: true, organisationId: true, metadata: true },
    });
    row = rows.find((candidate) => opportunityOfferMeta(candidate.metadata).custom_offer_token === clean) ?? null;
  }
  if (!row) return null;
  const meta = opportunityOfferMeta(row.metadata);
  const offer = parseCustomCommercialOffer(meta.commercial_offer);
  if (!offer) return null;
  return {
    opportunityId: row.id,
    pipelineOrganisationId: row.organisationId,
    offer,
    claimedByOrganisationId: asString(meta.custom_offer_claimed_by_org_id, 100) ?? null,
    claimedAt: asString(meta.custom_offer_claimed_at, 64) ?? null,
  };
}

export async function claimOpportunityCustomOffer(input: {
  customerOrganisationId: string;
  token: string;
}): Promise<CustomCommercialOffer | null> {
  const found = await findOpportunityCustomOfferByToken(input.token);
  if (!found) return null;
  if (
    found.claimedByOrganisationId &&
    found.claimedByOrganisationId !== input.customerOrganisationId
  ) {
    throw new Error("This custom pricing offer has already been accepted.");
  }
  if (found.claimedByOrganisationId === input.customerOrganisationId) {
    await setOrganisationCommercialOffer({
      organisationId: input.customerOrganisationId,
      offer: found.offer,
    });
    return found.offer;
  }

  const { prisma } = await import("@dg/database");
  const now = new Date().toISOString();

  return prisma.$transaction(async (tx) => {
    const row = await tx.opportunity.findUnique({
      where: { id: found.opportunityId },
      select: { metadata: true, updatedAt: true },
    });
    if (!row) return null;

    const meta = opportunityOfferMeta(row.metadata);
    if (asString(meta.custom_offer_token, 100) !== input.token.trim()) return null;
    const claimedBy = asString(meta.custom_offer_claimed_by_org_id, 100);
    if (claimedBy && claimedBy !== input.customerOrganisationId) {
      throw new Error("This custom pricing offer has already been accepted.");
    }

    const offer = parseCustomCommercialOffer(meta.commercial_offer);
    if (!offer) return null;

    if (!claimedBy) {
      const claim = await tx.opportunity.updateMany({
        where: { id: found.opportunityId, updatedAt: row.updatedAt },
        data: {
          metadata: {
            ...meta,
            custom_offer_claimed_by_org_id: input.customerOrganisationId,
            custom_offer_claimed_at: now,
          } as Prisma.InputJsonValue,
        },
      });
      if (claim.count !== 1) {
        throw new Error("This custom pricing offer is being accepted elsewhere. Please refresh and try again.");
      }
    }

    const customer = await tx.organisation.findUnique({
      where: { id: input.customerOrganisationId },
      select: { settings: true },
    });
    if (!customer) throw new Error("Organisation not found");
    const settings = ((customer.settings as OrganisationSettings | null) ?? {}) as OrganisationSettings;
    await tx.organisation.update({
      where: { id: input.customerOrganisationId },
      data: {
        settings: {
          ...settings,
          billing: {
            ...(settings.billing ?? {}),
            commercialOffer: offer,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });
    return offer;
  });
}
