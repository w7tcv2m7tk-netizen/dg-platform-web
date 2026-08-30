/**
 * Stripe webhook receipt state machine (H-7 crash recovery).
 *
 * ⚠️ MIGRATION-FIRST BOUNDARY — NOT YET ON THE PRODUCTION PATH ⚠️
 *
 * This module is complete and tested, but it is deliberately NOT wired into
 * `src/app/api/webhooks/stripe/route.ts`. The state it depends on
 * (`status`, `attempts`, `claimed_at`, `completed_at`, `last_error`) does not
 * exist in the production `stripe_webhook_receipts` table yet. Deploying code
 * that queries those columns before the migration is applied would take the
 * Stripe webhook endpoint down.
 *
 * Deployment order is therefore mandatory:
 *   1. apply packages/database/prisma/baseline/proposed/stripe_webhook_receipt_state.sql
 *   2. add the five fields to the Prisma model and regenerate
 *   3. implement `prismaReceiptStore` against them
 *   4. swap `withWebhookIdempotency` for `withWebhookReceiptState` in the route
 *
 * Until step 1 happens, the shipped behaviour remains `withWebhookIdempotency`
 * (claim → handle → release-on-failure), which is correct for handler errors
 * and only leaves a gap on a hard crash.
 *
 * ---
 *
 * Why a status column is required rather than reusing `processed_at`:
 * `processed_at` defaults to now() at INSERT, i.e. at claim time. A row that
 * crashed 20 minutes ago and a row that succeeded 20 minutes ago are byte
 * identical. A stale sweep built on it would re-run successful events, and the
 * handlers are demonstrably not all idempotent — `markPublicStayPaidFromStripe`
 * and `handleConnectAccountUpdated` have no event-id dedup — so that would be
 * strictly worse than the gap it closes.
 */

/** Persisted lifecycle of one Stripe event. */
export type ReceiptStatus = "processing" | "processed" | "failed";

export type ReceiptRow = {
  eventId: string;
  status: ReceiptStatus;
  attempts: number;
  claimedAt: Date | null;
  completedAt: Date | null;
};

/**
 * Outcome of attempting to take ownership of an event.
 *
 * `claimed`   — this worker owns it and must run the handler.
 * `duplicate` — already completed, or actively held by another worker.
 * `exhausted` — retried too many times; left for alerting, never looped.
 */
export type ClaimOutcome =
  | { kind: "claimed"; attempt: number; recoveredStaleClaim: boolean }
  | { kind: "duplicate"; reason: "already_processed" | "in_flight" }
  | { kind: "exhausted"; attempts: number };

/**
 * Storage seam. The Prisma implementation lands with the migration; tests
 * supply an in-memory version so every transition is provable now.
 *
 * `insertClaim` and `reclaim` MUST be atomic — a unique constraint on eventId
 * and a conditional UPDATE respectively. Read-then-write would reintroduce the
 * double-processing race the claim exists to prevent.
 */
export type ReceiptStore = {
  /** Insert a new claim. Returns false if the row already exists. */
  insertClaim(eventId: string, eventType: string, organisationId: string | null): Promise<boolean>;
  read(eventId: string): Promise<ReceiptRow | null>;
  /**
   * Conditional UPDATE → 'processing'. Must only succeed when the row is
   * currently `failed`, or `processing` with claimedAt older than the stale
   * threshold. Returns the new attempt number, or null if it did not win.
   */
  reclaim(eventId: string, staleBefore: Date): Promise<number | null>;
  markProcessed(eventId: string): Promise<void>;
  markFailed(eventId: string, error: string): Promise<void>;
};

/**
 * How long a claim may be held before it is treated as abandoned.
 *
 * Must exceed the longest possible handler run. The longest configured
 * maxDuration in this app is 120s, so 15 minutes leaves a wide margin: a claim
 * older than this cannot still be executing, it can only be a crash.
 */
export const STALE_CLAIM_MS = 15 * 60 * 1000;

/**
 * Cap on retries so a permanently malformed event cannot loop forever.
 * Stripe itself retries a failing endpoint for ~3 days; this bounds our own
 * reprocessing within that window and then leaves the row `failed` for alerting.
 */
export const MAX_ATTEMPTS = 6;

export async function claimWebhookEvent(
  store: ReceiptStore,
  input: {
    eventId: string;
    eventType: string;
    organisationId?: string | null;
    now?: Date;
  },
): Promise<ClaimOutcome> {
  const now = input.now ?? new Date();

  // Fast path: no row yet.
  const inserted = await store.insertClaim(
    input.eventId,
    input.eventType,
    input.organisationId ?? null,
  );
  if (inserted) {
    return { kind: "claimed", attempt: 1, recoveredStaleClaim: false };
  }

  const existing = await store.read(input.eventId);
  if (!existing) {
    // Row vanished between insert and read — treat as duplicate rather than
    // racing again; Stripe will retry.
    return { kind: "duplicate", reason: "in_flight" };
  }

  if (existing.status === "processed") {
    return { kind: "duplicate", reason: "already_processed" };
  }

  if (existing.attempts >= MAX_ATTEMPTS) {
    return { kind: "exhausted", attempts: existing.attempts };
  }

  // `failed` is immediately retryable. `processing` is only retryable once the
  // claim is provably abandoned.
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  if (
    existing.status === "processing" &&
    existing.claimedAt &&
    existing.claimedAt.getTime() > staleBefore.getTime()
  ) {
    return { kind: "duplicate", reason: "in_flight" };
  }

  const attempt = await store.reclaim(input.eventId, staleBefore);
  if (attempt === null) {
    // Another worker won the reclaim.
    return { kind: "duplicate", reason: "in_flight" };
  }

  return {
    kind: "claimed",
    attempt,
    recoveredStaleClaim: existing.status === "processing",
  };
}

export type ProcessOutcome<T> =
  | { status: "processed"; result: T }
  | { status: "duplicate"; reason: "already_processed" | "in_flight" }
  | { status: "exhausted"; attempts: number };

/**
 * Run a handler exactly once per event, with crash recovery.
 *
 * Rethrows the handler error after recording `failed`, so the caller can return
 * a retryable status to Stripe.
 */
export async function withWebhookReceiptState<T>(options: {
  store: ReceiptStore;
  eventId: string;
  eventType: string;
  organisationId?: string | null;
  handle: () => Promise<T>;
  now?: Date;
}): Promise<ProcessOutcome<T>> {
  const claim = await claimWebhookEvent(options.store, {
    eventId: options.eventId,
    eventType: options.eventType,
    organisationId: options.organisationId,
    now: options.now,
  });

  if (claim.kind === "duplicate") {
    return { status: "duplicate", reason: claim.reason };
  }
  if (claim.kind === "exhausted") {
    return { status: "exhausted", attempts: claim.attempts };
  }

  try {
    const result = await options.handle();
    await options.store.markProcessed(options.eventId);
    return { status: "processed", result };
  } catch (error) {
    await options.store
      .markFailed(
        options.eventId,
        error instanceof Error ? error.message : "handler failed",
      )
      .catch(() => {
        // Recording the failure is best-effort. If it fails the row stays
        // 'processing' and the stale sweep recovers it later — which is the
        // whole point of having claimedAt.
      });
    throw error;
  }
}
