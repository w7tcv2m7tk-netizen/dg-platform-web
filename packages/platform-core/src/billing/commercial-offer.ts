import type { Prisma } from "@dg/database";
import Stripe from "stripe";

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

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
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

export async function createCustomCommercialCheckoutSession(input: {
  organisationId: string;
  email: string;
  businessName?: string;
  offer: CustomCommercialOffer;
  successPath?: string;
  cancelPath?: string;
}) {
  const offer = parseCustomCommercialOffer(input.offer);
  if (!offer) throw new Error("Invalid custom commercial offer");
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("Stripe billing is not available");
  const stripe = new Stripe(secretKey);
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { billingCustomerId: true },
  });
  if (!org) throw new Error("Organisation not found");

  const base = appBaseUrl();
  const successPath = input.successPath ?? "/dashboard/apps?sync=1&checkout=success";
  const cancelPath = input.cancelPath ?? "/dashboard/settings/billing?checkout=cancelled";
  const recurring: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring =
    offer.cadence === "annual" ? { interval: "year" } : { interval: "month" };
  const sharedMetadata = {
    dg_platform_tier: offer.platformTier,
    dg_billing_cadence: offer.cadence,
    dg_industry_apps: offer.industryApps.join(","),
    dg_industry_templates: offer.industryTemplates.join(","),
    dg_premium_apps: offer.premiumApps.join(","),
    dg_support_plan: offer.supportPlan ?? "standard",
    dg_commercial_offer_id: offer.id,
    dg_commercial_offer_label: offer.label,
    dg_subscription_amount_cents: String(offer.amountCents),
    dg_one_off_amount_cents: String(offer.oneOffAmountCents ?? 0),
    organisation_id: input.organisationId,
  };
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: offer.currency,
        unit_amount: offer.amountCents,
        recurring,
        product_data: {
          name: offer.label,
          metadata: {
            dg_commercial_offer_id: offer.id,
          },
        },
      },
    },
  ];
  if (offer.oneOffAmountCents) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: offer.currency,
        unit_amount: offer.oneOffAmountCents,
        product_data: {
          name: offer.oneOffLabel ?? "Implementation & setup",
          metadata: {
            dg_commercial_offer_id: offer.id,
            dg_charge_type: "one_off_implementation",
          },
        },
      },
    });
  }
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: lineItems,
    success_url: `${base}${successPath.startsWith("/") ? successPath : `/${successPath}`}`,
    cancel_url: `${base}${cancelPath.startsWith("/") ? cancelPath : `/${cancelPath}`}`,
    payment_method_collection: "always",
    metadata: {
      dg_platform_checkout: "true",
      ...sharedMetadata,
      contact_email: input.email,
      business_name: input.businessName ?? "",
    },
    subscription_data: {
      metadata: {
        ...sharedMetadata,
        dg_platform_subscription: "true",
      },
      ...(offer.trialDays > 0 ? { trial_period_days: offer.trialDays } : {}),
    },
  };
  if (org.billingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(org.billingCustomerId);
      if (!customer.deleted) sessionParams.customer = customer.id;
      else sessionParams.customer_email = input.email;
    } catch {
      sessionParams.customer_email = input.email;
    }
  } else {
    sessionParams.customer_email = input.email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return { url: session.url, sessionId: session.id, offer };
}


/** Backwards-compatible aliases for records created before custom pricing was separated from Founding 10. */
export type NegotiatedCommercialOffer = CustomCommercialOffer;
export const parseNegotiatedCommercialOffer = parseCustomCommercialOffer;
export const createNegotiatedCommercialCheckoutSession = createCustomCommercialCheckoutSession;

type OpportunityCustomOfferMeta = {
  commercial_offer?: unknown;
  custom_offer_token?: string;
  [key: string]: unknown;
};

function opportunityOfferMeta(value: unknown): OpportunityCustomOfferMeta {
  return value && typeof value === "object" ? (value as OpportunityCustomOfferMeta) : {};
}

export async function getOpportunityCustomOffer(input: {
  organisationId: string;
  opportunityId: string;
}): Promise<{ offer: CustomCommercialOffer | null; token: string | null } | null> {
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
  const offer = parseCustomCommercialOffer(opportunityOfferMeta(row.metadata).commercial_offer);
  if (!offer) return null;
  return { opportunityId: row.id, pipelineOrganisationId: row.organisationId, offer };
}

export async function claimOpportunityCustomOffer(input: {
  customerOrganisationId: string;
  token: string;
}): Promise<CustomCommercialOffer | null> {
  const found = await findOpportunityCustomOfferByToken(input.token);
  if (!found) return null;
  return setOrganisationCommercialOffer({
    organisationId: input.customerOrganisationId,
    offer: found.offer,
  });
}
