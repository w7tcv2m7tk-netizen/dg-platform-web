import { createHash } from "node:crypto";
import { industryIdForAppOrTemplate } from "../industry/platform";
import { SUPPORT_COMMERCIAL_PLANS } from "./commercial-catalogue";
import { PAID_APP_PRICES_CENTS, normalisePaidAppKeys } from "./paid-apps";
import { expectedPurchasedLineItems, stripeItemsMatchPurchasedSelections, type PurchasedLineExpectationInput, type StripePurchasedSubscriptionItem } from "./purchased-line-items";

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
  evidence?: LegacyStripeEvidence;
  expectedUpdatedAt?: Date;
};

export type LegacyStripeEvidence = {
  stripeSubscriptionId: string;
  stripeCustomerRef: string | null;
  livemode: boolean;
  status: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  stripeUpdatedAt: number;
  purchaseMetadata: {
    organisationRef: string | null;
    platformSubscriptionMarker: string | null;
    platformTier: string | null;
    billingCadence: string | null;
    supportPlan: string | null;
    industryApps: string | null;
    industryTemplates: string | null;
    premiumApps: string | null;
  };
  lineItems: Array<{
    priceId: string;
    productId: string | null;
    productName: string | null;
    quantity: number;
    unitAmountCents: number | null;
    currency: string;
    billingInterval: string | null;
    billingIntervalCount: number | null;
    catalogueMapping: string;
  }>;
  proposedIndustryApps: string[];
  proposedPremiumApps: string[];
  evidenceFingerprint: string;
};

export type LegacyEntitlementRepository = {
  listCandidates(): Promise<LegacyEntitlementCandidate[]>;
  authorizeProductionApply?(input: {
    planSha256: string;
    approval: ProductionReconciliationApproval;
    stripeAccountId: string;
    databaseHost: string;
    databaseName: string;
    proposedChanges: Array<{
      candidateId: string;
      organisationId: string;
      stripeSubscriptionId: string;
      stripeCustomerId: string;
      updatedAt: string;
      industryApps: string[];
      premiumApps: string[];
      auditKey: string;
      itemFingerprint: string;
    }>;
  }): Promise<boolean>;
  apply(input: {
    candidate: LegacyEntitlementCandidate;
    industryApps: string[];
    premiumApps: string[];
    auditKey: string;
    approvalReference: string;
    itemFingerprint: string;
    planSha256?: string;
  }): Promise<"applied" | "already_applied" | "changed_concurrently">;
};

export type ProductionReconciliationApproval = {
  version: 1;
  mode: "production";
  planSha256: string;
  stripeAccountId: string;
  databaseHost: string;
  databaseName: string;
  approvedBy: string;
  changeTicket: string;
  approvedAt: string;
  expiresAt: string;
  signature: string;
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

function stripeEvidence(subscription: LegacyStripeSubscription, input: {
  platformPriceId?: string | null;
  industryApps?: string[];
  premiumApps?: string[];
} = {}): LegacyStripeEvidence {
  const tier = subscription.metadata.dg_platform_tier;
  const cadence = subscription.metadata.dg_billing_cadence;
  let expected: ReturnType<typeof expectedPurchasedLineItems> = [];
  try {
    if (tier && (cadence === "monthly" || cadence === "annual")) {
      expected = expectedPurchasedLineItems({
        platformTier: tier,
        platformPriceId: input.platformPriceId,
        industryApps: [...(csv(subscription.metadata.dg_industry_apps) ?? []), ...(csv(subscription.metadata.dg_industry_templates) ?? [])],
        premiumApps: csv(subscription.metadata.dg_premium_apps) ?? [],
        supportPlan: subscription.metadata.dg_support_plan ?? "standard",
        cadence,
      });
    }
  } catch { /* Invalid or unknown metadata remains visible as unmatched evidence. */ }
  const interval = cadence === "annual" ? "year" : cadence === "monthly" ? "month" : null;
  const lineItems = subscription.items.data.map((item) => {
    const price = item.price;
    const productValue = price.product;
    const productName = typeof productValue === "string" ? null : productValue.name ?? null;
    const productId = typeof productValue === "string" ? productValue : productValue.id ?? null;
    const quantity = item.quantity ?? 1;
    const mappingMatches = expected.filter((line) =>
      (line.priceId ? price.id === line.priceId : Boolean(line.name && productName === line.name)) &&
      price.unit_amount === line.amountCents && price.currency.toLowerCase() === "aud" &&
      price.recurring?.interval === interval && (price.recurring?.interval_count ?? 1) === 1 && quantity === 1);
    const mapping = mappingMatches.length === 1
      ? (mappingMatches[0]!.name ?? `platform_price:${mappingMatches[0]!.priceId}`)
      : "unmatched";
    return {
      priceId: price.id ?? "missing",
      productId,
      productName,
      quantity,
      unitAmountCents: price.unit_amount,
      currency: price.currency.toLowerCase(),
      billingInterval: price.recurring?.interval ?? null,
      billingIntervalCount: price.recurring ? price.recurring.interval_count ?? 1 : null,
      catalogueMapping: mapping,
    };
  }).sort((a, b) => a.priceId.localeCompare(b.priceId));
  const unsigned = {
    stripeSubscriptionId: subscription.id,
    stripeCustomerRef: subscription.customer ? ref(customerId(subscription)!) : null,
    livemode: subscription.livemode,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    stripeUpdatedAt: subscription.updated,
    purchaseMetadata: {
      organisationRef: subscription.metadata.organisation_id ? ref(subscription.metadata.organisation_id) : null,
      platformSubscriptionMarker: subscription.metadata.dg_platform_subscription ?? null,
      platformTier: subscription.metadata.dg_platform_tier ?? null,
      billingCadence: subscription.metadata.dg_billing_cadence ?? null,
      supportPlan: subscription.metadata.dg_support_plan ?? null,
      industryApps: subscription.metadata.dg_industry_apps ?? null,
      industryTemplates: subscription.metadata.dg_industry_templates ?? null,
      premiumApps: subscription.metadata.dg_premium_apps ?? null,
    },
    lineItems,
    proposedIndustryApps: [...(input.industryApps ?? [])].sort(),
    proposedPremiumApps: [...(input.premiumApps ?? [])].sort(),
  };
  return { ...unsigned, evidenceFingerprint: hash(unsigned) };
}

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
  expectedLivemode?: boolean;
}): Promise<LegacyEntitlementDecision> {
  const { candidate, subscription } = input;
  const now = input.now ?? new Date();
  if (candidate.platformExempt) return { ...block(candidate, "authorised_exemption_preserved"), outcome: "skip" };
  if (!candidate.stripeSubscriptionId || !candidate.stripeCustomerId || !candidate.organisation.billingCustomerId) return block(candidate, "canonical_subscription_ownership_missing");
  if (candidate.organisation.billingCustomerId !== candidate.stripeCustomerId) return block(candidate, "organisation_customer_mismatch");
  if (subscription.id !== candidate.stripeSubscriptionId || customerId(subscription.customer) !== candidate.stripeCustomerId) return block(candidate, "stripe_subscription_or_customer_mismatch");
  if (subscription.livemode !== (input.expectedLivemode ?? false)) return block(candidate, "stripe_mode_mismatch");
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
    return { organisationId: candidate.organisationId, subscriptionRef: ref(candidate.stripeSubscriptionId),
      outcome: "already_reconciled", reason: "canonical_purchase_projection_matches",
      industryApps: nextIndustry, premiumApps: nextPremium };
  }
  if (currentIndustry.length || currentPremium.length) return block(candidate, "existing_entitlement_projection_conflicts_with_stripe");

  const itemFingerprint = stripeEvidence(subscription, { platformPriceId: input.platformPriceId, industryApps: nextIndustry, premiumApps: nextPremium }).evidenceFingerprint;
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
  mode?: "test" | "production";
  productionApproval?: ProductionReconciliationApproval;
  approvalPublicKey?: string;
  expectedDatabaseHost?: string;
  expectedDatabaseName?: string;
  now?: Date;
  platformPriceIds?: Partial<Record<string, string>>;
}) {
  const mode = input.mode ?? "test";
  if (input.apply && mode === "test" && (!input.approvalReference?.trim() || !/^test:/i.test(input.approvalReference))) {
    throw new Error("Applying reconciliation requires an explicit test: approval reference");
  }
  if (input.apply && mode === "production" && !input.productionApproval) {
    throw new Error("Production reconciliation requires a separately signed approval manifest");
  }
  const [account, balance] = await Promise.all([input.stripe.accounts.retrieve(), input.stripe.balance.retrieve()]);
  const expectedLivemode = mode === "production";
  if (account.id !== input.expectedStripeAccountId || balance.livemode !== expectedLivemode) throw new Error("Stripe account or mode verification failed");
  const candidates = await input.repository.listCandidates();
  const planned: Array<{ candidate: LegacyEntitlementCandidate; decision: LegacyEntitlementDecision }> = [];
  for (const candidate of candidates) {
    if (!candidate.stripeSubscriptionId) {
      planned.push({ candidate, decision: block(candidate, "stripe_subscription_missing") });
      continue;
    }
    try {
      const subscription = await input.stripe.subscriptions.retrieve(candidate.stripeSubscriptionId, { expand: ["items.data.price.product"] });
      const decision = await planLegacyEntitlementReconciliation({
        candidate,
        subscription,
        now: input.now,
        expectedLivemode,
        platformPriceId: candidate.planTier ? input.platformPriceIds?.[candidate.planTier] : undefined,
      });
      const evidence = stripeEvidence(subscription, {
        platformPriceId: candidate.planTier ? input.platformPriceIds?.[candidate.planTier] : undefined,
        industryApps: decision.industryApps,
        premiumApps: decision.premiumApps,
      });
      planned.push({ candidate, decision: { ...decision, evidence, itemFingerprint: evidence.evidenceFingerprint } });
    } catch {
      planned.push({ candidate, decision: block(candidate, "stripe_read_or_reconciliation_failed") });
    }
  }

  const planSha256 = createHash("sha256").update(JSON.stringify({
    version: 2,
    mode,
    stripeAccountId: account.id,
    databaseHost: mode === "production" ? input.expectedDatabaseHost ?? null : null,
    databaseName: mode === "production" ? input.expectedDatabaseName ?? null : null,
    entries: planned.map(({ candidate, decision }) => ({
      candidateId: candidate.id,
      organisationId: candidate.organisationId,
      stripeSubscriptionId: candidate.stripeSubscriptionId,
      stripeCustomerId: candidate.stripeCustomerId,
      updatedAt: candidate.updatedAt.toISOString(),
      outcome: decision.outcome,
      reason: decision.reason,
      industryApps: decision.industryApps ?? [],
      premiumApps: decision.premiumApps ?? [],
      auditKey: decision.auditKey ?? null,
      itemFingerprint: decision.itemFingerprint ?? null,
      evidence: decision.evidence ?? null,
    })),
  })).digest("hex");

  if (input.apply && mode === "production") {
    const approval = input.productionApproval!;
    const verified = await import("./legacy-reconciliation-approval").then(({ verifyProductionReconciliationApproval }) =>
      verifyProductionReconciliationApproval({
        approval,
        publicKey: input.approvalPublicKey ?? "",
        expectedPlanSha256: planSha256,
        expectedStripeAccountId: input.expectedStripeAccountId,
        expectedDatabaseHost: input.expectedDatabaseHost ?? "",
        expectedDatabaseName: input.expectedDatabaseName ?? "",
      }));
    if (!verified) throw new Error("Production reconciliation approval does not match this exact plan and target");
    if (!input.repository.authorizeProductionApply || !await input.repository.authorizeProductionApply({
      planSha256,
      approval,
      stripeAccountId: input.expectedStripeAccountId,
      databaseHost: input.expectedDatabaseHost ?? "",
      databaseName: input.expectedDatabaseName ?? "",
      proposedChanges: planned.filter(({ decision }) => decision.outcome === "reconcile").map(({ candidate, decision }) => ({
        candidateId: candidate.id,
        organisationId: candidate.organisationId,
        stripeSubscriptionId: candidate.stripeSubscriptionId!,
        stripeCustomerId: candidate.stripeCustomerId!,
        updatedAt: candidate.updatedAt.toISOString(),
        industryApps: decision.industryApps!,
        premiumApps: decision.premiumApps!,
        auditKey: decision.auditKey!,
        itemFingerprint: decision.itemFingerprint!,
      })),
    })) throw new Error("Production repository did not authorize the signed reconciliation plan");
  }

  const results: LegacyEntitlementDecision[] = [];
  for (const { candidate, decision } of planned) {
    if (input.apply && decision.outcome === "reconcile") {
      const reference = mode === "production"
        ? `${input.productionApproval!.changeTicket}:${input.productionApproval!.approvedBy}`
        : input.approvalReference!.trim();
      try {
        const result = await input.repository.apply({
          candidate,
          industryApps: decision.industryApps!,
          premiumApps: decision.premiumApps!,
          auditKey: decision.auditKey!,
          approvalReference: reference,
          itemFingerprint: decision.itemFingerprint!,
          planSha256,
        });
        results.push({ ...decision, outcome: result === "applied" ? "reconcile" : result === "already_applied" ? "already_reconciled" : "blocked", reason: result === "applied" ? "applied_with_audit_event" : result === "already_applied" ? "idempotent_audit_event_exists" : "canonical_row_changed_concurrently" });
      } catch {
        // Preserve a usable report after a partial batch failure. Successful
        // rows are idempotent on retry; the failed row remains unchanged.
        results.push({ ...decision, outcome: "blocked", reason: "reconciliation_write_failed" });
      }
    } else {
      results.push(decision);
    }
  }
  return { mode, applied: Boolean(input.apply), scanned: candidates.length, planSha256, results };
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

/** Production writer is intentionally separate from the fixture-only adapter above. */
export function prismaProductionLegacyEntitlementRepository(prisma: any, target: { databaseHost: string; databaseName: string }, approvalPublicKey: string): LegacyEntitlementRepository {
  let authorizedPlanSha256: string | null = null;
  let authorizedChanges = new Map<string, { candidateId: string; organisationId: string; stripeSubscriptionId: string; stripeCustomerId: string; updatedAt: string; industryApps: string[]; premiumApps: string[]; itemFingerprint: string }>();
  return {
    async listCandidates() {
      return prisma.platformSubscription.findMany({
        where: { stripeSubscriptionId: { not: null } },
        include: { organisation: { select: { billingCustomerId: true } } },
        orderBy: { id: "asc" },
      });
    },
    async authorizeProductionApply(input) {
      const approved = await import("./legacy-reconciliation-approval").then(({ verifyProductionReconciliationApproval }) =>
        verifyProductionReconciliationApproval({
          approval: input.approval,
          publicKey: approvalPublicKey,
          expectedPlanSha256: input.planSha256,
          expectedStripeAccountId: input.stripeAccountId,
          expectedDatabaseHost: target.databaseHost,
          expectedDatabaseName: target.databaseName,
        }));
      if (!approved || input.databaseHost !== target.databaseHost || input.databaseName !== target.databaseName) return false;
      authorizedPlanSha256 = input.planSha256;
      authorizedChanges = new Map(input.proposedChanges.map(change => [change.auditKey, change]));
      return true;
    },
    async apply(input) {
      if (!input.planSha256 || input.planSha256 !== authorizedPlanSha256) throw new Error("Production writer is locked until this exact plan has a valid signed approval");
      const approvedChange = authorizedChanges.get(input.auditKey);
      if (!approvedChange || approvedChange.candidateId !== input.candidate.id ||
        approvedChange.organisationId !== input.candidate.organisationId ||
        approvedChange.stripeSubscriptionId !== input.candidate.stripeSubscriptionId ||
        approvedChange.stripeCustomerId !== input.candidate.stripeCustomerId ||
        approvedChange.updatedAt !== input.candidate.updatedAt.toISOString() ||
        JSON.stringify(approvedChange.industryApps) !== JSON.stringify(input.industryApps) ||
        JSON.stringify(approvedChange.premiumApps) !== JSON.stringify(input.premiumApps) ||
        approvedChange.itemFingerprint !== input.itemFingerprint) {
        throw new Error("Production write is not an exact row update in the signed plan");
      }
      const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
      if (!databaseUrl || databaseUrl.hostname !== target.databaseHost || databaseUrl.pathname.slice(1) !== target.databaseName ||
        databaseUrl.searchParams.get("sslmode") !== "verify-full" || !/\.neon\.tech$/i.test(databaseUrl.hostname)) {
        throw new Error("Production reconciliation target does not match the approved Neon host, database, and TLS settings");
      }
      return prisma.$transaction(async (tx: any) => {
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
        await tx.platformSubscriptionEvent.create({ data: {
          organisationId: input.candidate.organisationId,
          subscriptionId: input.candidate.id,
          type: "legacy_app_entitlements_reconciled",
          source: "staff",
          stripeEventId: input.auditKey,
          payload: { version: 1, approvalReference: input.approvalReference, itemFingerprint: input.itemFingerprint,
            industryApps: input.industryApps, premiumApps: input.premiumApps, billingExemptionChanged: false },
        } });
        return "applied" as const;
      });
    },
  };
}
