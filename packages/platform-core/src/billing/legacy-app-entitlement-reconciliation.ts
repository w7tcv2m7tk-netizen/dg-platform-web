import { createHash } from "node:crypto";
import { industryIdForAppOrTemplate } from "../industry/platform";
import { SUPPORT_COMMERCIAL_PLANS } from "./commercial-catalogue";
import { PAID_APP_PRICES_CENTS, normalisePaidAppKeys } from "./paid-apps";
import { stripeItemsMatchPurchasedSelections, type PurchasedLineExpectationInput, type StripePurchasedSubscriptionItem } from "./purchased-line-items";

export type LegacyEntitlementCandidate = {
  id: string;
  organisationId: string;
  status: string;
  entitlement: string;
  planTier: string | null;
  industryApps: string[];
  premiumApps: string[];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeStatus: string | null;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  platformExempt: boolean;
  updatedAt: Date;
  organisation: { billingCustomerId: string | null };
};

export type LegacyStripeSubscription = {
  id: string;
  customer: string | { id: string } | null;
  livemode: boolean;
  status: string;
  cancel_at_period_end: boolean;
  trial_end: number | null;
  current_period_end?: number | null;
  updated: number;
  metadata: Record<string, string>;
  items: { data: StripePurchasedSubscriptionItem[] };
};

export type LegacyEntitlementDecision = {
  organisationId: string;
  subscriptionRef: string;
  outcome: "reconcile" | "already_reconciled" | "skip" | "blocked";
  reason: string;
  industryApps?: string[];
  premiumApps?: string[];
  auditKey?: string;
  itemFingerprint?: string;
  expectedUpdatedAt?: Date;
};

export type LegacyEntitlementRepository = {
  listCandidates(): Promise<LegacyEntitlementCandidate[]>;
  apply(input: {
    candidate: LegacyEntitlementCandidate;
    industryApps: string[];
    premiumApps: string[];
    auditKey: string;
    approvalReference: string;
    itemFingerprint: string;
  }): Promise<"applied" | "already_applied" | "changed_concurrently">;
};

export type LegacyStripeReader = {
  accounts: { retrieve(): Promise<{ id: string }> };
  balance: { retrieve(): Promise<{ livemode: boolean }> };
  subscriptions: { retrieve(id: string, params: { expand: string[] }): Promise<LegacyStripeSubscription> };
};

const customerId = (value: LegacyStripeSubscription["customer"]) => typeof value === "string" ? value : value?.id ?? null;
const csv = (value: string | undefined) => value == null ? null : value.split(",").map((part) => part.trim()).filter(Boolean);
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const ref = (value: string) => hash(value).slice(0, 16);
const nearDate = (actual: Date | null, expectedSeconds: number | null | undefined) => {
  if (!actual || !expectedSeconds) return false;
  return Math.abs(actual.getTime() - expectedSeconds * 1000) <= 5000;
};

function block(candidate: LegacyEntitlementCandidate, reason: string): LegacyEntitlementDecision {
  return { organisationId: candidate.organisationId, subscriptionRef: ref(candidate.stripeSubscriptionId ?? candidate.id), outcome: "blocked", reason };
}

function statusIsEligible(candidate: LegacyEntitlementCandidate, subscription: LegacyStripeSubscription, now: Date): boolean {
  if (candidate.stripeStatus !== subscription.status || candidate.cancelAtPeriodEnd !== subscription.cancel_at_period_end) return false;
  if (!["FULL", "FULL_WITH_WARNING", "MOSTLY_FULL"].includes(candidate.entitlement)) return false;
  if (subscription.status === "trialing") {
    return ["TRIALING", "CANCEL_AT_PERIOD_END"].includes(candidate.status) &&
      nearDate(candidate.trialEnd, subscription.trial_end) && candidate.trialEnd! > now;
  }
  if (subscription.status === "active") {
    return ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(candidate.status) &&
      nearDate(candidate.currentPeriodEnd, subscription.current_period_end) && candidate.currentPeriodEnd! > now;
  }
  if (subscription.status === "past_due") {
    return ["PAYMENT_FAILED", "PAST_DUE"].includes(candidate.status) &&
      Boolean(candidate.gracePeriodEndsAt && candidate.gracePeriodEndsAt > now);
  }
  return false;
}

export async function planLegacyEntitlementReconciliation(input: {
  candidate: LegacyEntitlementCandidate;
  subscription: LegacyStripeSubscription;
  now?: Date;
  platformPriceId?: string | null;
}): Promise<LegacyEntitlementDecision> {
  const { candidate, subscription } = input;
  const now = input.now ?? new Date();
  if (candidate.platformExempt) return { ...block(candidate, "authorised_exemption_preserved"), outcome: "skip" };
  if (!candidate.stripeSubscriptionId || !candidate.stripeCustomerId || !candidate.organisation.billingCustomerId) return block(candidate, "canonical_subscription_ownership_missing");
  if (candidate.organisation.billingCustomerId !== candidate.stripeCustomerId) return block(candidate, "organisation_customer_mismatch");
  if (subscription.id !== candidate.stripeSubscriptionId || customerId(subscription.customer) !== candidate.stripeCustomerId) return block(candidate, "stripe_subscription_or_customer_mismatch");
  if (subscription.livemode !== false) return block(candidate, "stripe_mode_mismatch");
  if (subscription.metadata.organisation_id && subscription.metadata.organisation_id !== candidate.organisationId) return block(candidate, "stripe_organisation_mismatch");
  if (subscription.metadata.dg_platform_subscription && subscription.metadata.dg_platform_subscription !== "true") return block(candidate, "stripe_subscription_class_mismatch");
  if (!statusIsEligible(candidate, subscription, now)) return block(candidate, "subscription_status_or_period_ineligible");

  const tier = subscription.metadata.dg_platform_tier;
  const cadence = subscription.metadata.dg_billing_cadence;
  const rawIndustry = csv(subscription.metadata.dg_industry_apps);
  const rawTemplates = csv(subscription.metadata.dg_industry_templates);
  const rawPremium = csv(subscription.metadata.dg_premium_apps);
  const supportPlan = subscription.metadata.dg_support_plan ?? "standard";
  if (!tier || !cadence || rawIndustry === null || rawTemplates === null || rawPremium === null) return block(candidate, "purchase_metadata_incomplete_for_reconciliation");
  if (cadence !== "monthly" && cadence !== "annual") return block(candidate, "billing_interval_unknown");
  if (!SUPPORT_COMMERCIAL_PLANS.some((plan) => plan.id === supportPlan)) return block(candidate, "support_plan_unknown");
  if (candidate.planTier && candidate.planTier !== tier) return block(candidate, "canonical_plan_mismatch");
  if ([...rawIndustry, ...rawTemplates].some((id) => !industryIdForAppOrTemplate(id))) return block(candidate, "industry_selection_unknown");
  if (new Set([...rawIndustry, ...rawTemplates]).size !== rawIndustry.length + rawTemplates.length) return block(candidate, "industry_selection_duplicated");
  const premiumApps = normalisePaidAppKeys(rawPremium);
  if (premiumApps.length !== rawPremium.length || new Set(rawPremium).size !== rawPremium.length) return block(candidate, "premium_selection_unknown_or_duplicated");
  if (premiumApps.some((app) => !(app in PAID_APP_PRICES_CENTS))) return block(candidate, "premium_selection_unknown");

  const industryApps = [...new Set([...rawIndustry, ...rawTemplates])];
  if (industryApps.length === 0 && premiumApps.length === 0) return { ...block(candidate, "no_paid_app_entitlements_to_reconcile"), outcome: "skip" };
  const expectation: PurchasedLineExpectationInput = {
    platformTier: tier,
    platformPriceId: input.platformPriceId,
    industryApps,
    premiumApps,
    supportPlan,
    cadence,
  };
  if (!stripeItemsMatchPurchasedSelections(subscription.items.data, expectation)) return block(candidate, "stripe_line_items_do_not_match_catalogue");

  const currentIndustry = [...new Set(candidate.industryApps)].sort();
  const currentPremium = [...new Set(candidate.premiumApps)].sort();
  const nextIndustry = [...new Set(industryApps)].sort();
  const nextPremium = [...new Set(premiumApps)].sort();
  if (JSON.stringify(currentIndustry) === JSON.stringify(nextIndustry) && JSON.stringify(currentPremium) === JSON.stringify(nextPremium)) {
    return { organisationId: candidate.organisationId, subscriptionRef: ref(candidate.stripeSubscriptionId), outcome: "already_reconciled", reason: "canonical_purchase_projection_matches" };
  }
  if (currentIndustry.length || currentPremium.length) return block(candidate, "existing_entitlement_projection_conflicts_with_stripe");

  const itemFingerprint = hash(subscription.items.data.map((item) => ({ id: item.price.id, amount: item.price.unit_amount, currency: item.price.currency, interval: item.price.recurring?.interval, product: typeof item.price.product === "string" ? item.price.product : item.price.product?.name })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
  const auditKey = `legacy-app-entitlements:${hash({ subscriptionId: subscription.id, updated: subscription.updated, itemFingerprint, industryApps: nextIndustry, premiumApps: nextPremium })}`;
  return {
    organisationId: candidate.organisationId,
    subscriptionRef: ref(candidate.stripeSubscriptionId),
    outcome: "reconcile",
    reason: "verified_stripe_line_items_match_catalogue",
    industryApps: nextIndustry,
    premiumApps: nextPremium,
    auditKey,
    itemFingerprint,
    expectedUpdatedAt: candidate.updatedAt,
  };
}

/** Dry-run is the default. Apply requires explicit test-mode authorisation. */
export async function reconcileLegacyAppEntitlements(input: {
  stripe: LegacyStripeReader;
  repository: LegacyEntitlementRepository;
  expectedStripeAccountId: string;
  apply?: boolean;
  approvalReference?: string;
  now?: Date;
  platformPriceIds?: Partial<Record<string, string>>;
}) {
  if (input.apply && (!input.approvalReference?.trim() || !/^test:/i.test(input.approvalReference))) {
    throw new Error("Applying reconciliation requires an explicit test: approval reference");
  }
  const [account, balance] = await Promise.all([input.stripe.accounts.retrieve(), input.stripe.balance.retrieve()]);
  if (account.id !== input.expectedStripeAccountId || balance.livemode !== false) throw new Error("Stripe account or mode verification failed");
  const candidates = await input.repository.listCandidates();
  const results: LegacyEntitlementDecision[] = [];
  for (const candidate of candidates) {
    if (!candidate.stripeSubscriptionId) {
      results.push(block(candidate, "stripe_subscription_missing"));
      continue;
    }
    try {
      const subscription = await input.stripe.subscriptions.retrieve(candidate.stripeSubscriptionId, { expand: ["items.data.price.product"] });
      const decision = await planLegacyEntitlementReconciliation({
        candidate,
        subscription,
        now: input.now,
        platformPriceId: candidate.planTier ? input.platformPriceIds?.[candidate.planTier] : undefined,
      });
      if (input.apply && decision.outcome === "reconcile") {
        const result = await input.repository.apply({
          candidate,
          industryApps: decision.industryApps!,
          premiumApps: decision.premiumApps!,
          auditKey: decision.auditKey!,
          approvalReference: input.approvalReference!.trim(),
          itemFingerprint: decision.itemFingerprint!,
        });
        results.push({ ...decision, outcome: result === "applied" ? "reconcile" : result === "already_applied" ? "already_reconciled" : "blocked", reason: result === "applied" ? "applied_with_audit_event" : result === "already_applied" ? "idempotent_audit_event_exists" : "canonical_row_changed_concurrently" });
      } else {
        results.push(decision);
      }
    } catch {
      results.push(block(candidate, "stripe_read_or_reconciliation_failed"));
    }
  }
  return { mode: "test" as const, applied: Boolean(input.apply), scanned: candidates.length, results };
}

/** Prisma adapter uses optimistic concurrency and writes projection + audit atomically. */
export function prismaLegacyEntitlementRepository(prisma: any): LegacyEntitlementRepository {
  return {
    async listCandidates() {
      return prisma.platformSubscription.findMany({
        where: { stripeSubscriptionId: { not: null } },
        include: { organisation: { select: { billingCustomerId: true } } },
        orderBy: { id: "asc" },
      });
    },
    async apply(input) {
      return prisma.$transaction(async (tx: any) => {
        const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
        if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname) ||
          databaseUrl.pathname !== "/dg_checkout_test" || !databaseUrl.port || databaseUrl.port === "5432") {
          throw new Error("Reconciliation writes are restricted to a disposable local PostgreSQL fixture");
        }
        const [marker] = await tx.$queryRaw`SELECT current_setting('dg.checkout_test_cluster', true) AS marker`;
        if (!process.env.DG_CHECKOUT_DB_MARKER || marker?.marker !== process.env.DG_CHECKOUT_DB_MARKER) {
          throw new Error("Disposable PostgreSQL marker verification failed");
        }
        const audit = await tx.platformSubscriptionEvent.findUnique({ where: { stripeEventId: input.auditKey }, select: { id: true } });
        if (audit) return "already_applied" as const;
        const updated = await tx.platformSubscription.updateMany({
          where: {
            id: input.candidate.id,
            organisationId: input.candidate.organisationId,
            stripeSubscriptionId: input.candidate.stripeSubscriptionId,
            stripeCustomerId: input.candidate.stripeCustomerId,
            platformExempt: false,
            updatedAt: input.candidate.updatedAt,
            industryApps: { equals: input.candidate.industryApps },
            premiumApps: { equals: input.candidate.premiumApps },
          },
          data: { industryApps: input.industryApps, premiumApps: input.premiumApps },
        });
        if (updated.count !== 1) return "changed_concurrently" as const;
        await tx.platformSubscriptionEvent.create({
          data: {
            organisationId: input.candidate.organisationId,
            subscriptionId: input.candidate.id,
            type: "legacy_app_entitlements_reconciled",
            source: "staff",
            stripeEventId: input.auditKey,
            payload: {
              version: 1,
              approvalReference: input.approvalReference,
              itemFingerprint: input.itemFingerprint,
              industryApps: input.industryApps,
              premiumApps: input.premiumApps,
              billingExemptionChanged: false,
            },
          },
        });
        return "applied" as const;
      });
    },
  };
}
