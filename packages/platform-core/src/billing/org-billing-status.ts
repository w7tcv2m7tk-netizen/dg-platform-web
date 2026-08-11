import { organisationExpectsPlatformBilling } from "../command-centre/success-score";

export type OrgBillingSettings = {
  platformExempt?: boolean;
  /** Founding Customer programme seat — preferential pricing / access, not “beta”. */
  foundingCustomer?: boolean;
  programme?: string;
};

export type OrganisationBillingStatus = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  /** Organisation.status — typically trial | active | archived */
  status: string;
  hasStripeCustomer: boolean;
  /** False for marketplace / Wantd / platformExempt orgs — do not invent Stripe customers. */
  expectsPlatformBilling: boolean;
  platformExempt: boolean;
  foundingCustomer: boolean;
  platformTier: string | null;
  purchaseLabel: string | null;
  /**
   * Honest UI state — never treat a plan preview / WP portal link alone as a Stripe customer.
   */
  kind:
    | "platform_exempt"
    | "founding_trial"
    | "trial"
    | "active"
    | "subscribed"
    | "needs_checkout";
};

function readBillingSettings(settings: unknown): OrgBillingSettings {
  const root = (settings ?? null) as { billing?: OrgBillingSettings } | null;
  return root?.billing ?? {};
}

function readProfileBits(settings: unknown): {
  platformTier: string | null;
  purchaseLabel: string | null;
} {
  const root = (settings ?? null) as {
    profile?: { platformTier?: string; purchaseLabel?: string };
  } | null;
  const profile = root?.profile;
  return {
    platformTier: profile?.platformTier?.trim() || null,
    purchaseLabel: profile?.purchaseLabel?.trim() || null,
  };
}

function isFoundingCustomer(billing: OrgBillingSettings): boolean {
  if (billing.foundingCustomer === true) return true;
  const programme = (billing.programme ?? "").trim().toLowerCase();
  return programme === "founding" || programme === "founding_customer";
}

function resolveKind(input: {
  expectsPlatformBilling: boolean;
  hasStripeCustomer: boolean;
  foundingCustomer: boolean;
  status: string;
}): OrganisationBillingStatus["kind"] {
  if (!input.expectsPlatformBilling) return "platform_exempt";
  if (input.hasStripeCustomer) {
    return input.status === "trial" ? "trial" : "subscribed";
  }
  if (input.foundingCustomer) return "founding_trial";
  if (input.status === "trial") return "trial";
  if (input.status === "active") return "active";
  return "needs_checkout";
}

/**
 * Tenant-facing billing snapshot for Apps & Billing / settings.
 * Does not invent MRR or create Stripe customers.
 */
export async function getOrganisationBillingStatus(
  organisationId: string,
): Promise<OrganisationBillingStatus | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      industry: true,
      settings: true,
      billingCustomerId: true,
    },
  });

  if (!org) return null;

  const billing = readBillingSettings(org.settings);
  const profile = readProfileBits(org.settings);
  const expectsPlatformBilling = organisationExpectsPlatformBilling({
    slug: org.slug,
    industry: org.industry,
    settings: org.settings,
  });
  const hasStripeCustomer = Boolean(org.billingCustomerId);
  const foundingCustomer = isFoundingCustomer(billing);

  return {
    organisationId: org.id,
    organisationName: org.name,
    organisationSlug: org.slug,
    status: org.status,
    hasStripeCustomer,
    expectsPlatformBilling,
    platformExempt: !expectsPlatformBilling,
    foundingCustomer,
    platformTier: profile.platformTier,
    purchaseLabel: profile.purchaseLabel,
    kind: resolveKind({
      expectsPlatformBilling,
      hasStripeCustomer,
      foundingCustomer,
      status: org.status,
    }),
  };
}

export function billingStatusHeadline(status: OrganisationBillingStatus): string {
  switch (status.kind) {
    case "platform_exempt":
      return "Platform billing does not apply";
    case "founding_trial":
      return "Founding Customer — trial";
    case "trial":
      return status.hasStripeCustomer ? "Trial (Stripe linked)" : "Trial";
    case "subscribed":
      return "Active subscription";
    case "active":
      return "Active — Stripe checkout needed";
    case "needs_checkout":
      return "No Stripe customer yet";
  }
}

export function billingStatusDetail(status: OrganisationBillingStatus): string {
  switch (status.kind) {
    case "platform_exempt":
      return "This organisation is marked platform-exempt (for example marketplace / Wantd). Missing a Stripe customer is expected — we do not create a fake one.";
    case "founding_trial":
      return "You’re on the Founding Customer programme (preferential pricing toward Starter / Pro / Business — not a beta seat). Subscribe when ready, or open the Customer Portal once Stripe is linked.";
    case "trial":
      return status.hasStripeCustomer
        ? "Your organisation is on trial with a Stripe customer on file. Manage invoices and payment method in the Customer Portal."
        : "Your organisation is on trial. Sidebar plan previews do not create a Stripe customer — subscribe when you are ready to bill.";
    case "subscribed":
      return "Stripe customer on file. Use the Customer Portal for invoices, payment method, and subscription changes.";
    case "active":
      return "Organisation is active but no Stripe customer is linked yet. Complete in-app checkout or sync a purchase so invoices and the portal work.";
    case "needs_checkout":
      return "No Stripe customer on file for this organisation. Completing checkout creates one — we never invent MRR or fake customers.";
  }
}
