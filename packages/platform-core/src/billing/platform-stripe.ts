import type { Prisma } from "@dg/database";
import Stripe from "stripe";

import { appIdsFromPlanSelection } from "../apps/org-apps";
import type { PlanSelectionInput } from "../apps/org-apps";
import {
  annualPriceFromMonthlyCents,
  BILLING_COMMERCIAL_CONFIG,
} from "./subscription-types";
import { industryCheckoutLines } from "../industry/platform";
import { applyBrandPresetToProfile } from "../org/brand-presets";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";

const TIER_AMOUNTS_CENTS: Record<string, number> = {
  starter: 9900,
  professional: 24900,
  business: 49900,
};

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

function stripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined,
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export interface PlatformCheckoutInput {
  organisationId: string;
  email: string;
  platformTier: string;
  industryApps?: string[];
  premiumApps?: string[];
  businessName?: string;
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

  for (const line of industryCheckoutLines(input.industryApps ?? [])) {
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
      dg_industry_apps: (input.industryApps ?? []).join(","),
      dg_premium_apps: (input.premiumApps ?? []).join(","),
      organisation_id: input.organisationId,
      contact_email: input.email,
      business_name: input.businessName ?? "",
    },
    subscription_data: {
      metadata: {
        dg_platform_tier: tier,
        dg_billing_cadence: cadence,
        organisation_id: input.organisationId,
        dg_platform_subscription: "true",
      },
    },
  };

  if (org?.billingCustomerId) {
    sessionParams.customer = org.billingCustomerId;
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

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url, sessionId: session.id };
}

export async function createBillingPortalSession(
  organisationId: string,
  returnUrl?: string,
) {
  const stripe = getStripeClient();
  const { prisma } = await import("@dg/database");

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { billingCustomerId: true },
  });

  if (!org?.billingCustomerId) {
    throw new Error(
      "No Stripe customer on file yet. Complete checkout (or sync a purchase) before opening the Customer Portal — plan previews do not create a customer.",
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.billingCustomerId,
    return_url: returnUrl ?? `${appBaseUrl()}/dashboard/settings/billing`,
  });

  return { url: session.url };
}

type InputJsonValue = Prisma.InputJsonValue;

async function resolveOrganisationForCheckout(input: {
  organisationId?: string | null;
  email?: string | null;
}) {
  const { prisma } = await import("@dg/database");
  const orgId = input.organisationId?.trim() || null;

  if (orgId) {
    const byId = await prisma.organisation.findUnique({ where: { id: orgId } });
    if (byId) return { org: byId, via: "organisation_id" as const };
  }

  const email = (input.email ?? "").trim().toLowerCase();
  if (!email) return null;

  const membership = await prisma.membership.findFirst({
    where: { email },
    include: { organisation: true },
    orderBy: { createdAt: "desc" },
  });

  if (!membership) return null;
  return { org: membership.organisation, via: "email" as const, email };
}

export async function provisionFromPlatformCheckout(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  if (metadata.dg_platform_checkout !== "true") {
    return { handled: false as const };
  }

  const email = (
    session.customer_details?.email ??
    session.customer_email ??
    metadata.contact_email ??
    ""
  )
    .trim()
    .toLowerCase();

  const customerId = stripeCustomerId(session.customer);
  if (!customerId) {
    return { handled: true as const, ok: false, reason: "no_customer" as const, email };
  }

  const platformTier = metadata.dg_platform_tier ?? "professional";
  const industryApps = metadata.dg_industry_apps
    ? metadata.dg_industry_apps.split(",").filter(Boolean)
    : [];
  const premiumApps = metadata.dg_premium_apps
    ? metadata.dg_premium_apps.split(",").filter(Boolean)
    : [];

  const resolved = await resolveOrganisationForCheckout({
    organisationId: metadata.organisation_id,
    email,
  });

  if (!resolved) {
    return {
      handled: true as const,
      ok: false,
      reason: email ? ("no_membership" as const) : ("no_email" as const),
      email: email || undefined,
      platformTier,
    };
  }

  const { prisma } = await import("@dg/database");
  const org = resolved.org;
  const settings = (org.settings as Record<string, unknown> | null) ?? {};
  const profile = applyBrandPresetToProfile(
    {
      id: org.id,
      name: org.name,
      slug: org.slug,
      industry: org.industry,
      settings,
    },
    (settings.profile as OrganisationBusinessProfile | null) ?? {},
  );

  const selection: PlanSelectionInput = {
    platformTier,
    industryApps,
    premiumApps,
  };
  const enabled = appIdsFromPlanSelection(selection);
  const billing = (settings.billing as Record<string, unknown> | undefined) ?? {};
  const founding =
    billing.foundingCustomer === true ||
    ["founding", "founding_customer"].includes(
      String(billing.programme ?? "").toLowerCase(),
    );
  const exempt = billing.platformExempt === true;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  // H-6: PlatformSubscription is the authoritative billing record. If this
  // write fails the webhook must fail and remain retryable; derived organisation
  // JSON must never be allowed to advertise a subscription that does not exist.
  const { syncPlatformSubscriptionFromCheckout } = await import("./billing-service");
  await syncPlatformSubscriptionFromCheckout({
    organisationId: org.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId,
    planTier: platformTier,
    foundingCustomer: founding,
    platformExempt: exempt,
    stripeEventId: session.id,
  });

  // Derived projection for UI and legacy consumers. PlatformSubscription above
  // remains authoritative for commercial state and entitlement.
  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      status: founding || exempt ? "active" : "trial",
      billingCustomerId: customerId,
      settings: {
        ...settings,
        billing: {
          ...billing,
          subscriptionStatus: founding || exempt ? "active" : "trialing",
          entitlementsSuspended: false,
          lastCheckoutSessionId: session.id,
          lastCheckoutAt: new Date().toISOString(),
          stripeSubscriptionId:
            stripeSubscriptionId ?? billing.stripeSubscriptionId,
        },
        profile: {
          ...profile,
          platformTier,
          purchasedApps: industryApps,
          purchasedPremium: premiumApps,
          purchaseLabel: TIER_LABELS[platformTier] ?? platformTier,
          syncedAt: new Date().toISOString(),
        },
        apps: {
          ...(settings.apps as object | undefined),
          enabled,
          entitlementsSuspended: false,
          planPreview: {
            platformTier,
            industryApps,
            premiumApps,
            appliedAt: new Date().toISOString(),
            source: "stripe_checkout",
          },
        },
      } as unknown as InputJsonValue,
    },
  });

  let referralReward: unknown = null;
  try {
    const { markReferralPaidAndAccrue } = await import("../referrals");
    referralReward = await markReferralPaidAndAccrue({
      referredOrganisationId: org.id,
      platformTier,
      stripeSessionId: session.id,
      subscriptionAmountCents: TIER_AMOUNTS_CENTS[platformTier],
    });
  } catch (err) {
    console.warn("[billing] referral reward accrual failed", err);
  }

  return {
    handled: true as const,
    ok: true,
    organisationId: org.id,
    email: email || undefined,
    resolvedVia: resolved.via,
    billingCustomerId: customerId,
    referralReward,
  };
}

export async function handlePlatformSubscriptionLifecycle(
  subscription: Stripe.Subscription,
  eventKind: "deleted" | "updated" | "created",
  stripeEventId?: string | null,
) {
  const metadata = subscription.metadata ?? {};
  const customerId = stripeCustomerId(subscription.customer);
  const { prisma } = await import("@dg/database");

  let org =
    metadata.organisation_id?.trim()
      ? await prisma.organisation.findUnique({
          where: { id: metadata.organisation_id.trim() },
        })
      : null;

  if (!org && customerId) {
    const orgs = await prisma.organisation.findMany({
      where: { billingCustomerId: customerId },
      take: 2,
    });
    org = orgs.length === 1 ? orgs[0] : null;
  }

  if (!org) {
    return {
      handled: true as const,
      ok: false,
      reason: "no_organisation" as const,
      subscriptionId: subscription.id,
      customerId: customerId ?? undefined,
    };
  }

  const billing =
    ((org.settings as { billing?: {
      foundingCustomer?: boolean;
      platformExempt?: boolean;
      programme?: string;
    } } | null)?.billing) ?? {};
  const founding =
    billing.foundingCustomer === true ||
    ["founding", "founding_customer"].includes((billing.programme ?? "").toLowerCase());
  const exempt = billing.platformExempt === true;

  const { applyStripeSubscriptionProjection } = await import("./billing-service");
  const row = await applyStripeSubscriptionProjection({
    organisationId: org.id,
    subscription,
    eventKind,
    stripeEventId,
    foundingCustomer: founding,
    platformExempt: exempt,
    planTier: metadata.dg_platform_tier ?? null,
  });

  return {
    handled: true as const,
    ok: true,
    organisationId: org.id,
    action: row.status.toLowerCase() as string,
    stripeStatus: row.stripeStatus,
    commercialStatus: row.status,
    entitlement: row.entitlement,
    billingCustomerId: customerId ?? org.billingCustomerId ?? undefined,
  };
}

export function isPlatformCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.dg_platform_checkout === "true";
}

export function isPlatformSubscription(subscription: Stripe.Subscription): boolean {
  const meta = subscription.metadata ?? {};
  return Boolean(meta.dg_platform_tier || meta.dg_platform_subscription === "true");
}
