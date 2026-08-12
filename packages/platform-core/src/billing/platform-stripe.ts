import type { Prisma } from "@dg/database";
import Stripe from "stripe";

import { appIdsFromPlanSelection } from "../apps/org-apps";
import type { PlanSelectionInput } from "../apps/org-apps";
import { applyBrandPresetToProfile } from "../org/brand-presets";
import type { OrganisationBusinessProfile } from "../org/business-profile-types";

const TIER_AMOUNTS_CENTS: Record<string, number> = {
  starter: 9900,
  professional: 24900,
  business: 49900,
};

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
}

export async function createPlatformCheckoutSession(input: PlatformCheckoutInput) {
  const stripe = getStripeClient();
  const tier = input.platformTier;
  const amount = TIER_AMOUNTS_CENTS[tier];
  if (!amount) {
    throw new Error(`Unsupported platform tier: ${tier}`);
  }

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { billingCustomerId: true },
  });

  const priceId = stripePriceIdForTier(tier);
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
    ? [{ quantity: 1, price: priceId }]
    : [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: amount,
            recurring: { interval: "month" },
            product_data: {
              name: TIER_LABELS[tier] ?? `DigitalGate ${tier}`,
            },
          },
        },
      ];

  const base = appBaseUrl();
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: lineItems,
    success_url: `${base}/dashboard/apps?sync=1&checkout=success`,
    cancel_url: `${base}/dashboard/settings/billing?checkout=cancelled`,
    metadata: {
      dg_platform_checkout: "true",
      dg_platform_tier: tier,
      dg_industry_apps: (input.industryApps ?? []).join(","),
      dg_premium_apps: (input.premiumApps ?? []).join(","),
      organisation_id: input.organisationId,
      contact_email: input.email,
      business_name: input.businessName ?? "",
    },
    subscription_data: {
      metadata: {
        dg_platform_tier: tier,
        organisation_id: input.organisationId,
      },
    },
  };

  // Prefer existing Stripe customer so portal / renewals stay on one cus_ id.
  // Do not pass both customer and customer_email.
  if (org?.billingCustomerId) {
    sessionParams.customer = org.billingCustomerId;
  } else {
    sessionParams.customer_email = input.email;
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

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      status: "active",
      // Always persist the Stripe customer from checkout — never invent one.
      billingCustomerId: customerId,
      settings: {
        ...settings,
        billing: {
          ...billing,
          subscriptionStatus: "active",
          entitlementsSuspended: false,
          lastCheckoutSessionId: session.id,
          lastCheckoutAt: new Date().toISOString(),
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

  // Platform Refer & Earn — first-paid credit (months 2–12 via invoice.paid)
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

/**
 * Honest subscription lifecycle for platform SaaS seats.
 * Does not invent MRR or customers — only updates org status / entitlement flags.
 */
export async function handlePlatformSubscriptionLifecycle(
  subscription: Stripe.Subscription,
  eventKind: "deleted" | "updated",
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
    org = await prisma.organisation.findFirst({
      where: { billingCustomerId: customerId },
    });
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

  const settings = (org.settings as Record<string, unknown> | null) ?? {};
  const billing = (settings.billing as Record<string, unknown> | undefined) ?? {};
  const apps = (settings.apps as Record<string, unknown> | undefined) ?? {};
  const stripeStatus = subscription.status;
  const nowIso = new Date().toISOString();

  const cancelled =
    eventKind === "deleted" ||
    stripeStatus === "canceled" ||
    stripeStatus === "unpaid" ||
    stripeStatus === "incomplete_expired";
  const pastDue = !cancelled && stripeStatus === "past_due";
  const entitlementsSuspended = cancelled || pastDue;

  const reactivate =
    !entitlementsSuspended &&
    (stripeStatus === "active" || stripeStatus === "trialing") &&
    (org.status === "suspended" || billing.entitlementsSuspended === true);

  if (!cancelled && !pastDue && !reactivate && eventKind === "updated") {
    // No org-status change needed (e.g. incomplete → still collecting payment).
    await prisma.organisation.update({
      where: { id: org.id },
      data: {
        billingCustomerId: customerId ?? org.billingCustomerId,
        settings: {
          ...settings,
          billing: {
            ...billing,
            subscriptionStatus: stripeStatus,
            stripeSubscriptionId: subscription.id,
            lastSubscriptionEventAt: nowIso,
          },
        } as unknown as InputJsonValue,
      },
    });
    return {
      handled: true as const,
      ok: true,
      organisationId: org.id,
      action: "status_recorded" as const,
      stripeStatus,
    };
  }

  // past_due: keep org active but mark entitlements suspended (portal can fix payment).
  // cancelled/unpaid/deleted: org status suspended. Never clear billingCustomerId.
  const nextOrgStatus = cancelled ? "suspended" : "active";
  const subscriptionStatus = eventKind === "deleted" ? "cancelled" : stripeStatus;

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      status: nextOrgStatus,
      billingCustomerId: customerId ?? org.billingCustomerId,
      settings: {
        ...settings,
        billing: {
          ...billing,
          subscriptionStatus,
          entitlementsSuspended,
          stripeSubscriptionId: subscription.id,
          lastSubscriptionEventAt: nowIso,
          ...(entitlementsSuspended
            ? { suspendedAt: nowIso, suspendReason: subscriptionStatus }
            : { suspendedAt: null, suspendReason: null }),
        },
        apps: {
          ...apps,
          // Mark suspended; do not invent a new enabled list or wipe preview data.
          entitlementsSuspended,
          ...(entitlementsSuspended ? { suspendedAt: nowIso } : { suspendedAt: null }),
        },
      } as unknown as InputJsonValue,
    },
  });

  return {
    handled: true as const,
    ok: true,
    organisationId: org.id,
    action: cancelled
      ? ("suspended" as const)
      : pastDue
        ? ("past_due" as const)
        : ("reactivated" as const),
    stripeStatus: subscriptionStatus,
    billingCustomerId: customerId ?? org.billingCustomerId ?? undefined,
  };
}

export function isPlatformCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.dg_platform_checkout === "true";
}

/** True when subscription metadata marks a DigitalGate platform seat. */
export function isPlatformSubscription(subscription: Stripe.Subscription): boolean {
  const meta = subscription.metadata ?? {};
  return Boolean(meta.organisation_id || meta.dg_platform_tier);
}
