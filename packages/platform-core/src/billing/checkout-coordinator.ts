import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@dg/database";
import type Stripe from "stripe";
import { admitPlatformCheckout, CheckoutTemporarilyUnavailable } from "./checkout-creation-gate";
import { createAdmittedPlatformSession } from "./checkout-session-create";

// Keep the existing SDK/API contract; retries must retain this version as well as the body.
const API_VERSION = "2025-02-24.acacia";
const HOUR = 60 * 60 * 1000;
const LEASE_MS = 60_000;
const TERMINAL_SUBSCRIPTIONS = new Set(["canceled", "incomplete_expired"]);

export class CheckoutCoordinationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CheckoutCoordinationError";
    this.code = code;
  }
}

function blocked(code: string, message: string): never {
  throw new CheckoutCoordinationError(code, message);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Fingerprint commercial terms, independent of actor email and entry-point return URLs. */
export function checkoutPurchaseFingerprint(params: Stripe.Checkout.SessionCreateParams): string {
  const metadata = { ...params.metadata };
  delete metadata.contact_email;
  delete metadata.business_name;
  for (const key of ["dg_industry_apps", "dg_industry_templates", "dg_premium_apps"]) {
    if (typeof metadata[key] === "string") metadata[key] = [...new Set(metadata[key].split(",").filter(Boolean))].sort().join(",");
  }
  const subscription = { ...params.subscription_data, metadata: undefined };
  const lines = (params.line_items ?? []).map(canonical).sort();
  return createHash("sha256").update(canonical({ mode: params.mode, metadata, subscription, lines })).digest("hex");
}

function legacyIds(settings: Prisma.JsonValue | null): string[] {
  const s = settings as { gen2Onboarding?: { stripeCheckoutSessionId?: unknown }; billing?: { lastCheckoutSessionId?: unknown } } | null;
  return [...new Set([s?.gen2Onboarding?.stripeCheckoutSessionId, s?.billing?.lastCheckoutSessionId]
    .filter((v): v is string => typeof v === "string" && v.length > 0))];
}

function assertOwned(session: Stripe.Checkout.Session, organisationId: string) {
  if (session.mode !== "subscription" || session.metadata?.organisation_id !== organisationId || session.metadata?.dg_platform_checkout !== "true") {
    blocked("checkout_ownership_unverified", "Existing checkout ownership could not be verified. Contact DigitalGate.");
  }
}

/** All standard and custom platform subscription checkouts share this boundary.
 * Short DB transactions reserve/claim; no DB transaction remains open during Stripe I/O.
 * Lease tokens fence stale workers; a reclaimed request ALWAYS replays the persisted body/key.
 */
export async function coordinatePlatformCheckout(input: {
  organisationId: string;
  stripe: Stripe;
  parameters: Stripe.Checkout.SessionCreateParams;
  // Dependency injection is used only by isolated behavioural tests.
  database?: PrismaClient;
  now?: () => Date;
}) {
  const db = input.database ?? (await import("@dg/database")).prisma;
  const now = input.now ?? (() => new Date());
  const stripe = input.stripe;
  if (input.parameters.mode !== "subscription" || input.parameters.metadata?.organisation_id !== input.organisationId ||
    input.parameters.metadata?.dg_platform_checkout !== "true") {
    blocked("checkout_ownership_unverified", "Checkout must belong to the authorised organisation.");
  }
  const fingerprint = checkoutPurchaseFingerprint(input.parameters);
  // Account and mode changes must never replay a request in a different Stripe namespace.
  const account = await stripe.accounts.retrieve();
  const balance = await stripe.balance.retrieve();
  const scope = `${account.id}:${balance.livemode ? "live" : "test"}:${API_VERSION}`;

  for (let pass = 0; pass < 3; pass++) {
    const token = randomUUID();
    const reserved = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM organisations WHERE id = ${input.organisationId} FOR UPDATE`;
      const org = await tx.organisation.findUniqueOrThrow({ where: { id: input.organisationId } });
      const sub = await tx.platformSubscription.findUnique({ where: { organisationId: input.organisationId } });
      // Local cancellation/restriction is not proof that a remote subscription ended.
      const customerIds = [...new Set([org.billingCustomerId, sub?.stripeCustomerId].filter((v): v is string => Boolean(v)))];
      let attempt = await tx.platformCheckoutAttempt.findUnique({ where: { currentOrganisationId: input.organisationId } });
      const timestamp = now();
      if (attempt?.leaseUntil && attempt.leaseUntil > timestamp) {
        blocked("checkout_in_progress", "Checkout is being recovered. Please try again shortly.");
      }
      if (!attempt) {
        const params = structuredClone(input.parameters);
        // These metadata copies are unnecessary personal data; Stripe supplies customer details.
        delete params.metadata?.contact_email;
        delete params.metadata?.business_name;
        params.expires_at = Math.floor((timestamp.getTime() + HOUR) / 1000);
        attempt = await tx.platformCheckoutAttempt.create({ data: {
          organisationId: org.id, currentOrganisationId: org.id,
          purchaseFingerprint: fingerprint, requestParameters: params as unknown as Prisma.InputJsonValue,
          idempotencyKey: `platform-checkout-${randomUUID()}`, providerScope: scope,
          expiresAt: new Date(params.expires_at * 1000),
          replayUntil: new Date(timestamp.getTime() + 23 * HOUR),
          legacySessionIds: legacyIds(org.settings),
        } });
      }
      if (attempt.providerScope !== scope) blocked("checkout_provider_changed", "Checkout requires recovery in its original Stripe account and mode.");
      const storedCustomer = (attempt.requestParameters as { customer?: string }).customer;
      if (storedCustomer && !customerIds.includes(storedCustomer)) customerIds.push(storedCustomer);
      attempt = await tx.platformCheckoutAttempt.update({ where: { id: attempt.id }, data: {
        leaseToken: token, leaseUntil: new Date(timestamp.getTime() + LEASE_MS),
      } });
      return { attempt, customerIds, subscriptionId: sub?.stripeSubscriptionId };
    });
    let attempt = reserved.attempt;
    const save = async (data: Prisma.PlatformCheckoutAttemptUpdateManyMutationInput) => {
      const result = await db.platformCheckoutAttempt.updateMany({
        where: { id: attempt.id, organisationId: input.organisationId, currentOrganisationId: input.organisationId, leaseToken: token }, data,
      });
      if (result.count !== 1) blocked("checkout_lease_lost", "Checkout recovery is already in progress. Please try again shortly.");
    };
    const requireRecovery = async (reason: string) => {
      await save({ state: "RECOVERY_REQUIRED", recoveryReason: reason });
      blocked("checkout_recovery_required", "An earlier checkout needs confirmation. Contact DigitalGate before starting another subscription.");
    };
    const observe = async (session: Stripe.Checkout.Session) => {
      assertOwned(session, input.organisationId);
      await save({ sessionId: session.id, expiresAt: new Date(session.expires_at * 1000),
        state: session.status === "complete" ? "AWAITING_WEBHOOK" : session.status === "open" ? "OPEN" : "UNCERTAIN" });
      if (session.status === "complete") blocked("checkout_awaiting_webhook", "Your checkout is complete. Waiting for subscription confirmation.");
      return session;
    };
    try {
      if (attempt.state === "RECOVERY_REQUIRED") await requireRecovery(attempt.recoveryReason ?? "unresolved");
      if (attempt.state === "AWAITING_WEBHOOK") {
        blocked("checkout_awaiting_webhook", "Your checkout is complete. Waiting for subscription confirmation.");
      }
      if (reserved.subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(reserved.subscriptionId);
        if (!TERMINAL_SUBSCRIPTIONS.has(subscription.status)) blocked("subscription_exists", "An existing subscription must be managed through billing settings.");
      }
      for (const customer of reserved.customerIds) {
        for await (const subscription of stripe.subscriptions.list({ customer, status: "all", limit: 100 })) {
          if (!TERMINAL_SUBSCRIPTIONS.has(subscription.status)) blocked("subscription_exists", "An existing subscription must be managed through billing settings.");
        }
      }
      // Legacy sessions have no persisted fingerprint. Expire open ones before replacing;
      // never infer expiry from a return URL, local timestamp, or failed retrieval.
      for (const id of attempt.legacySessionIds as string[]) {
        let legacy = await stripe.checkout.sessions.retrieve(id);
        assertOwned(legacy, input.organisationId);
        if (legacy.status === "complete") {
          await save({ state: "AWAITING_WEBHOOK", recoveryReason: "legacy_checkout_complete" });
          blocked("checkout_awaiting_webhook", "Your checkout is complete. Waiting for subscription confirmation.");
        }
        if (legacy.status === "open") legacy = await stripe.checkout.sessions.expire(id);
        assertOwned(legacy, input.organisationId);
        if (legacy.status !== "expired") await requireRecovery("legacy_session_not_expired");
      }
      let session: Stripe.Checkout.Session;
      if (attempt.sessionId) {
        session = await stripe.checkout.sessions.retrieve(attempt.sessionId);
      } else {
        if (attempt.firstRequestedAt && now() >= attempt.replayUntil) await requireRecovery("idempotency_window_elapsed");
        const storedParams = attempt.requestParameters as unknown as Stripe.Checkout.SessionCreateParams;
        if (!Number.isSafeInteger(storedParams.expires_at) || (storedParams.expires_at ?? 0) <= 0) {
          await requireRecovery("immutable_expiry_missing");
        }
        if (!attempt.firstRequestedAt && (attempt.purchaseFingerprint !== fingerprint ||
          (storedParams.expires_at ?? 0) * 1000 <= now().getTime() + 30 * 60_000)) {
          // The send marker is committed before I/O and fenced by this lease, so
          // an unused reservation can be retired without a remote outcome to resolve.
          await save({ state: "EXPIRED", currentOrganisationId: null, leaseToken: null, leaseUntil: null, recoveryReason: "never_submitted" });
          continue;
        }
        const previouslyUncertain = attempt.firstRequestedAt !== null;
        const firstRequestedAt = attempt.firstRequestedAt ?? now();
        // Fence the send marker and gate admission in one transaction. Closure
        // serializes with the gate UPDATE; no transaction spans provider I/O.
        await db.$transaction(async (tx) => {
          const claimed = await tx.platformCheckoutAttempt.updateMany({
            where: { id: attempt.id, organisationId: input.organisationId,
              currentOrganisationId: input.organisationId, leaseToken: token },
            data: { firstRequestedAt, state: "UNCERTAIN", recoveryReason: "stripe_outcome_unknown" },
          });
          if (claimed.count !== 1) blocked("checkout_lease_lost", "Checkout recovery is already in progress. Please try again shortly.");
          await admitPlatformCheckout({ expiresAt: storedParams.expires_at, database: tx });
        });
        attempt = { ...attempt, firstRequestedAt };
        try {
          session = await createAdmittedPlatformSession(stripe, storedParams,
            { idempotencyKey: attempt.idempotencyKey, apiVersion: API_VERSION });
        } catch (error) {
          if (error instanceof CheckoutTemporarilyUnavailable && error.outcome === "expiry_rejected") {
            if (previouslyUncertain) {
              // Validation on this replay cannot disprove acceptance of an earlier
              // send whose response was lost. Preserve its key and current slot.
              await requireRecovery("uncertain_replay_expiry_rejected");
            }
            await save({ state: "EXPIRED", currentOrganisationId: null,
              leaseToken: null, leaseUntil: null, recoveryReason: "provider_expiry_rejected" });
          }
          throw error;
        }
      }
      await observe(session);
      if (session.status === "open" && attempt.purchaseFingerprint !== fingerprint) {
        session = await stripe.checkout.sessions.expire(session.id);
        await observe(session);
      }
      if (session.status === "expired") {
        await save({ state: "EXPIRED", currentOrganisationId: null, leaseToken: null, leaseUntil: null, recoveryReason: null });
        continue;
      }
      if (session.status !== "open" || !session.url) await requireRecovery("session_not_resumable");
      await save({ state: "OPEN", recoveryReason: null });
      return { url: session.url, sessionId: session.id };
    } finally {
      // A process crash leaves a bounded lease; normal errors retain the attempt but release it.
      await db.platformCheckoutAttempt.updateMany({ where: { id: attempt.id, leaseToken: token }, data: { leaseToken: null, leaseUntil: null } });
    }
  }
  blocked("checkout_retry_required", "Checkout expired during recovery. Please try again.");
}
