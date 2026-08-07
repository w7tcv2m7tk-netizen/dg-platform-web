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
}

export async function createPlatformCheckoutSession(input: PlatformCheckoutInput) {
  const stripe = getStripeClient();
  const tier = input.platformTier;
  const amount = TIER_AMOUNTS_CENTS[tier];
  if (!amount) {
    throw new Error(`Unsupported platform tier: ${tier}`);
  }

  const base = appBaseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: input.email,
    line_items: [
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
    ],
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
  });

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
    throw new Error("No Stripe customer on file — complete checkout first");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: org.billingCustomerId,
    return_url: returnUrl ?? `${appBaseUrl()}/dashboard/settings/billing`,
  });

  return { url: session.url };
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

  if (!email) {
    return { handled: true as const, ok: false, reason: "no_email" };
  }

  const platformTier = metadata.dg_platform_tier ?? "professional";
  const industryApps = metadata.dg_industry_apps
    ? metadata.dg_industry_apps.split(",").filter(Boolean)
    : [];
  const premiumApps = metadata.dg_premium_apps
    ? metadata.dg_premium_apps.split(",").filter(Boolean)
    : [];

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const membership = await prisma.membership.findFirst({
    where: { email },
    include: { organisation: true },
    orderBy: { createdAt: "desc" },
  });

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;

  const selection: PlanSelectionInput = {
    platformTier,
    industryApps,
    premiumApps,
  };
  const enabled = appIdsFromPlanSelection(selection);

  if (membership) {
    const org = membership.organisation;
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

    await prisma.organisation.update({
      where: { id: org.id },
      data: {
        status: "active",
        billingCustomerId: customerId ?? org.billingCustomerId,
        settings: {
          ...settings,
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

    return { handled: true as const, ok: true, organisationId: org.id, email };
  }

  return {
    handled: true as const,
    ok: false,
    reason: "no_membership",
    email,
    platformTier,
  };
}

export function isPlatformCheckoutSession(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.dg_platform_checkout === "true";
}
