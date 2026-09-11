import type { Prisma } from "@dg/database";

import type { BillingCadence, Gen2PlatformTier } from "../onboarding/gen2-journey";

export type NegotiatedCommercialOffer = {
  version: 1;
  id: string;
  label: string;
  status: "agreed";
  currency: "aud";
  amountCents: number;
  cadence: BillingCadence;
  platformTier: Gen2PlatformTier;
  industryApps: string[];
  premiumApps: string[];
  seats?: number;
  trialDays: number;
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

export function parseNegotiatedCommercialOffer(value: unknown): NegotiatedCommercialOffer | null {
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
  const seats =
    typeof raw.seats === "number" && Number.isInteger(raw.seats) && raw.seats > 0
      ? Math.min(raw.seats, 10000)
      : undefined;
  const trialDays =
    typeof raw.trialDays === "number" && Number.isInteger(raw.trialDays) && raw.trialDays >= 0
      ? Math.min(raw.trialDays, 90)
      : 0;
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
    premiumApps: asStringArray(raw.premiumApps),
    seats,
    trialDays,
    agreedAt: asString(raw.agreedAt, 64),
    notes: asString(raw.notes, 2000),
  };
}

export function commercialOfferFromSettings(settings: unknown): NegotiatedCommercialOffer | null {
  if (!settings || typeof settings !== "object") return null;
  const billing = (settings as OrganisationSettings).billing;
  return parseNegotiatedCommercialOffer(billing?.commercialOffer);
}

export async function getOrganisationCommercialOffer(
  organisationId: string,
): Promise<NegotiatedCommercialOffer | null> {
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
  offer: NegotiatedCommercialOffer;
}): Promise<NegotiatedCommercialOffer> {
  const offer = parseNegotiatedCommercialOffer(input.offer);
  if (!offer) throw new Error("Invalid negotiated commercial offer");
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
