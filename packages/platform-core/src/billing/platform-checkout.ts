import "server-only";
import Stripe from "stripe";
import { coordinatePlatformCheckout } from "./checkout-coordinator";
import { parseCustomCommercialOffer, type CustomCommercialOffer } from "./commercial-offer";
import { annualPriceFromMonthlyCents, BILLING_COMMERCIAL_CONFIG } from "./subscription-types";
import { industryCheckoutLines } from "../industry/platform";
import { PLATFORM_COMMERCIAL_PLANS, SUPPORT_COMMERCIAL_PLANS } from "./commercial-catalogue";
import { normalisePaidAppKeys, paidAppCheckoutLines, GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS } from "./paid-apps";

const TIER_AMOUNTS_CENTS: Record<string, number> = Object.fromEntries(
  PLATFORM_COMMERCIAL_PLANS.map((plan) => [plan.id, plan.monthlyCents]),
);

export type PlatformBillingCadence = "monthly" | "annual";

const TIER_LABELS: Record<string, string> = {
  starter: "DigitalGate Starter",
  professional: "DigitalGate Growth",
  business: "DigitalGate Scale",
};

/** Prefer Dashboard Price IDs when set; otherwise inline price_data still works. */
function stripePriceIdForTier(tier: string): string | null {
  const envMap: Record<string, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional:
      process.env.STRIPE_PRICE_PROFESSIONAL ?? process.env.STRIPE_PRICE_GROWTH,
    business: process.env.STRIPE_PRICE_BUSINESS ?? process.env.STRIPE_PRICE_SCALE,
  };
  const id = envMap[tier]?.trim();
  return id || null;
}

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(secretKey);
}

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export interface PlatformCheckoutInput {
  organisationId: string;
  email: string;
  platformTier: string;
  industryApps?: string[];
  premiumApps?: string[];
  businessName?: string;
  supportPlan?: "standard" | "priority" | "success_partner" | "enterprise_success";
  /** monthly (default) or annual — annual uses BILLING_COMMERCIAL_CONFIG months-equivalent. */
  billingCadence?: PlatformBillingCadence;
  /** Where Stripe returns after success (defaults to apps catalog). */
  successPath?: string;
  cancelPath?: string;
}

export async function createPlatformCheckoutSession(input: PlatformCheckoutInput) {
  const stripe = getStripeClient();
  const tier = input.platformTier;
  const monthlyAmount = TIER_AMOUNTS_CENTS[tier];
  if (!monthlyAmount) {
    throw new Error(`Unsupported platform tier: ${tier}`);
  }

  const cadence: PlatformBillingCadence =
    input.billingCadence === "annual" ? "annual" : "monthly";
  const annual = cadence === "annual";
  const amount = annual
    ? annualPriceFromMonthlyCents(monthlyAmount)
    : monthlyAmount;
  const recurring: Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring =
    annual ? { interval: "year" } : { interval: "month" };

  const industryApps = Array.isArray(input.industryApps)
    ? input.industryApps.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
    : [];
  const premiumApps = normalisePaidAppKeys(input.premiumApps);

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { billingCustomerId: true, settings: true },
  });

  const priceId = annual ? null : stripePriceIdForTier(tier);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ quantity: 1, price: priceId }]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amount,
            recurring,
            product_data: {
              name: `${TIER_LABELS[tier] ?? `DigitalGate ${tier}`}${
                annual ? " (Annual)" : ""
              }`,
            },
          },
        },
      ];

  const growthSuiteSelected = premiumApps.includes("growth_suite");
  const industryLines = industryCheckoutLines(industryApps);
  const primaryIndustryLine = industryLines.find((line) => line.kind === "industry") ?? null;
  const bundledPrimaryIndustry = growthSuiteSelected && primaryIndustryLine
    ? primaryIndustryLine
    : null;

  if (bundledPrimaryIndustry) {
    const bundleAmount = annual
      ? annualPriceFromMonthlyCents(GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS)
      : GROWTH_SUITE_WITH_INDUSTRY_MONTHLY_CENTS;
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: bundleAmount,
        recurring,
        product_data: {
          name: annual
            ? `DigitalGate Growth Suite + ${bundledPrimaryIndustry.industryLabel} Industry App (Annual)`
            : `DigitalGate Growth Suite + ${bundledPrimaryIndustry.industryLabel} Industry App`,
        },
      },
    });
  }

  for (const line of industryLines) {
    if (bundledPrimaryIndustry === line) continue;
    const lineAmount = annual
      ? annualPriceFromMonthlyCents(line.amountCents)
      : line.amountCents;
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: lineAmount,
        recurring,
        product_data: {
          name: annual ? `${line.name} (Annual)` : line.name,
        },
      },
    });
  }

  for (const line of paidAppCheckoutLines(premiumApps)) {
    if (bundledPrimaryIndustry && line.key === "growth_suite") continue;
    const lineAmount = annual
      ? annualPriceFromMonthlyCents(line.amountCents)
      : line.amountCents;
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: lineAmount,
        recurring,
        product_data: {
          name: annual ? `${line.name} (Annual)` : line.name,
        },
      },
    });
  }

  const supportPlan = input.supportPlan ?? "standard";
  const canonicalSupportPlan = SUPPORT_COMMERCIAL_PLANS.find((plan) => plan.id === supportPlan);
  const supportOption = canonicalSupportPlan?.monthlyCents
    ? { monthlyCents: canonicalSupportPlan.monthlyCents, label: `DigitalGate ${canonicalSupportPlan.name}` }
    : null;
  if (supportOption) {
    const supportAmount = annual ? annualPriceFromMonthlyCents(supportOption.monthlyCents) : supportOption.monthlyCents;
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "aud",
        unit_amount: supportAmount,
        recurring,
        product_data: { name: annual ? `${supportOption.label} (Annual)` : supportOption.label },
      },
    });
  }

  const base = appBaseUrl();
  const successPath = input.successPath ?? "/dashboard/apps?sync=1&checkout=success";
  const cancelPath =
    input.cancelPath ?? "/dashboard/settings/billing?checkout=cancelled";
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: lineItems,
    success_url: `${base}${successPath.startsWith("/") ? successPath : `/${successPath}`}`,
    cancel_url: `${base}${cancelPath.startsWith("/") ? cancelPath : `/${cancelPath}`}`,
    payment_method_collection: "always",
    metadata: {
      dg_platform_checkout: "true",
      dg_platform_tier: tier,
      dg_billing_cadence: cadence,
      dg_industry_apps: industryApps.join(","),
      dg_premium_apps: premiumApps.join(","),
      organisation_id: input.organisationId,
      contact_email: input.email,
      business_name: input.businessName ?? "",
      dg_support_plan: supportPlan,
    },
    subscription_data: {
      metadata: {
        dg_platform_tier: tier,
        dg_billing_cadence: cadence,
        dg_industry_apps: industryApps.join(","),
        dg_premium_apps: premiumApps.join(","),
        dg_support_plan: supportPlan,
        organisation_id: input.organisationId,
        dg_platform_subscription: "true",
      },
    },
  };

  if (org?.billingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(org.billingCustomerId);
      if (!customer.deleted) sessionParams.customer = customer.id;
      else sessionParams.customer_email = input.email;
    } catch {
      throw new Error("The existing billing customer could not be verified. Please try again shortly.");
    }
  } else {
    sessionParams.customer_email = input.email;
  }

  const { getPlatformSubscription } = await import("./subscription-store");
  const existingSub = await getPlatformSubscription(input.organisationId);
  const settingsBilling =
    ((org?.settings as {
      billing?: {
        foundingCustomer?: boolean;
        platformExempt?: boolean;
        programme?: string;
      };
    } | null)?.billing) ?? {};
  const exempt =
    existingSub?.platformExempt === true || settingsBilling.platformExempt === true;

  if (!exempt) {
    sessionParams.subscription_data = {
      ...sessionParams.subscription_data,
      trial_period_days: BILLING_COMMERCIAL_CONFIG.trialDays,
    };
  }

  return coordinatePlatformCheckout({ organisationId: input.organisationId, stripe, parameters: sessionParams });
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
      throw new Error("The existing billing customer could not be verified. Please try again shortly.");
    }
  } else {
    sessionParams.customer_email = input.email;
  }

  const checkout = await coordinatePlatformCheckout({ organisationId: input.organisationId, stripe, parameters: sessionParams });
  return { ...checkout, offer };
}


export const createNegotiatedCommercialCheckoutSession = createCustomCommercialCheckoutSession;
