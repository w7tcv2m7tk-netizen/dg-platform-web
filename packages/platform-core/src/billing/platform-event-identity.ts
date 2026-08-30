/**
 * Platform billing identity for Stripe events (H-8).
 *
 * DigitalGate runs two unrelated billing domains through one Stripe account and
 * one webhook endpoint:
 *
 *   - the **platform subscription**: an organisation paying DigitalGate for the
 *     platform, tracked in `PlatformSubscription`;
 *   - **commerce subscriptions**: a tenant's own customers paying the tenant,
 *     tracked in `CommerceSubscription`.
 *
 * Commerce subscriptions carry `organisation_id` metadata naming the *tenant*,
 * because that is how the commerce ledger attributes them. The dunning path
 * previously resolved an organisation from that metadata and then mutated that
 * organisation's `PlatformSubscription` — so a tenant's customer failing to pay
 * their invoice could push the tenant's own DigitalGate subscription down the
 * dunning ladder toward suspension.
 *
 * Organisation metadata therefore cannot decide this. Classification uses
 * durable server-side identifiers written by our own checkout and sync code:
 * `PlatformSubscription.stripeSubscriptionId` / `.stripeCustomerId`,
 * `CommerceSubscription.providerSubscriptionId`, and the `dg_platform_*`
 * metadata markers set by `createPlatformCheckoutSession`.
 *
 * Anything that cannot be positively identified is `unknown` and must not
 * mutate platform billing state.
 */

export type StripeBillingDomain = "platform" | "commerce" | "unknown";

export type StripeBillingIdentity = {
  domain: StripeBillingDomain;
  /** Only set for `platform`; resolved from the platform subscription row. */
  organisationId?: string;
  /** Why the event was classified this way — logged, and asserted in tests. */
  reason: string;
};

/**
 * Data access seam. Defaults to Prisma; tests supply fakes so classification
 * rules can be asserted without a database.
 */
export type BillingIdentityLookups = {
  commerceSubscriptionExists(providerSubscriptionId: string): Promise<boolean>;
  platformSubscriptionBySubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<{ organisationId: string } | null>;
  platformSubscriptionByCustomerId(
    stripeCustomerId: string,
  ): Promise<{ organisationId: string; stripeSubscriptionId: string | null } | null>;
  organisationExists(organisationId: string): Promise<boolean>;
};

export type ClassifyStripeBillingEventInput = {
  /** Organisation id from event metadata. Attribution only — never proof. */
  organisationId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  /** `dg_platform_tier` from metadata, when present. */
  platformTier?: string | null;
  /** `dg_platform_subscription === "true"` marker, when present. */
  platformSubscriptionMarker?: boolean;
};

function clean(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

/**
 * Classify a Stripe billing event as platform, commerce, or unknown.
 *
 * Ordering matters: a positive commerce match wins over metadata markers,
 * because commerce rows are written from Stripe's own subscription id and are
 * the strongest evidence that an event belongs to a tenant's customer.
 */
export async function classifyStripeBillingEvent(
  input: ClassifyStripeBillingEventInput,
  lookups?: BillingIdentityLookups,
): Promise<StripeBillingIdentity> {
  const subscriptionId = clean(input.stripeSubscriptionId);
  const customerId = clean(input.stripeCustomerId);

  const db = lookups ?? (await prismaLookups());
  if (!db) {
    return { domain: "unknown", reason: "database_not_configured" };
  }

  // 1. Known commerce subscription — a tenant's customer. Never platform.
  if (subscriptionId) {
    const commerce = await db.commerceSubscriptionExists(subscriptionId);
    if (commerce) {
      return { domain: "commerce", reason: "matched_commerce_subscription_id" };
    }
  }

  // 2. Known platform subscription id — strongest platform evidence.
  if (subscriptionId) {
    const platform = await db.platformSubscriptionBySubscriptionId(subscriptionId);
    if (platform) {
      return {
        domain: "platform",
        organisationId: platform.organisationId,
        reason: "matched_platform_subscription_id",
      };
    }
  }

  // 3. Platform customer id. Only trusted when the event carries no
  //    subscription id, or that subscription is already known to be ours —
  //    a tenant may transact commerce under the same Stripe customer.
  if (customerId) {
    const byCustomer = await db.platformSubscriptionByCustomerId(customerId);
    if (byCustomer) {
      if (!subscriptionId) {
        return {
          domain: "platform",
          organisationId: byCustomer.organisationId,
          reason: "matched_platform_customer_no_subscription",
        };
      }
      if (clean(byCustomer.stripeSubscriptionId) === subscriptionId) {
        return {
          domain: "platform",
          organisationId: byCustomer.organisationId,
          reason: "matched_platform_customer_and_subscription",
        };
      }
      // Platform customer, but a different subscription: this is the tenant
      // selling something, not paying us.
      return {
        domain: "commerce",
        reason: "platform_customer_with_foreign_subscription",
      };
    }
  }

  // 4. Explicit platform markers set by our own checkout. Accepted only when
  //    an organisation is nameable and has no conflicting commerce match.
  const hasPlatformMarker =
    Boolean(input.platformSubscriptionMarker) || Boolean(clean(input.platformTier));
  if (hasPlatformMarker) {
    const organisationId = clean(input.organisationId);
    if (organisationId) {
      const exists = await db.organisationExists(organisationId);
      if (exists) {
        return {
          domain: "platform",
          organisationId,
          reason: "platform_metadata_marker",
        };
      }
    }
    return { domain: "unknown", reason: "platform_marker_without_known_org" };
  }

  // 5. Organisation metadata alone proves nothing — commerce subscriptions
  //    carry the tenant's organisation id too.
  return { domain: "unknown", reason: "no_durable_platform_identifier" };
}

/** Default Prisma-backed lookups. Returns null when no database is configured. */
async function prismaLookups(): Promise<BillingIdentityLookups | null> {
  if (!process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");

  return {
    async commerceSubscriptionExists(providerSubscriptionId) {
      const row = await prisma.commerceSubscription.findFirst({
        where: { providerSubscriptionId },
        select: { id: true },
      });
      return Boolean(row);
    },
    async platformSubscriptionBySubscriptionId(stripeSubscriptionId) {
      return prisma.platformSubscription.findFirst({
        where: { stripeSubscriptionId },
        select: { organisationId: true },
      });
    },
    async platformSubscriptionByCustomerId(stripeCustomerId) {
      return prisma.platformSubscription.findFirst({
        where: { stripeCustomerId },
        select: { organisationId: true, stripeSubscriptionId: true },
      });
    },
    async organisationExists(organisationId) {
      const row = await prisma.organisation.findUnique({
        where: { id: organisationId },
        select: { id: true },
      });
      return Boolean(row);
    },
  };
}
