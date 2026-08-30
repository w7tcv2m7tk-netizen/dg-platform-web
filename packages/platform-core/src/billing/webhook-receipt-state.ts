/**
 * Stripe webhook receipt state machine (H-7 crash recovery).
 *
 * Requires the columns added by
 * `prisma/migrations/20260830_stripe_webhook_receipt_state`. That migration
 * MUST be applied before this code is deployed — see
 * docs/infrastructure/STRIPE-RECEIPT-STATE-DEPLOYMENT.md.
 *
 * Why a status column rather than reusing `processed_at`: that column defaults
 * to now() at INSERT, i.e. at claim time, so a row that crashed 20 minutes ago
 * and one that succeeded 20 minutes ago are byte identical. A sweep built on it
 * would re-run successful events, and the handlers are demonstrably not all
 * idempotent — `markPublicStayPaidFromStripe` and `handleConnectAccountUpdated`
 * have no event-id dedup — so that would be worse than the gap it closes.
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

/**
 * Prisma-backed store.
 *
 * `insertClaim` relies on the unique constraint on `event_id`, and `reclaim` is
 * a conditional `updateMany` whose affected-row count decides the winner. Both
 * are single atomic statements — a read-then-write would reintroduce the
 * double-processing race the claim exists to prevent.
 */
export function prismaReceiptStore(): ReceiptStore {
  return {
    async insertClaim(eventId, eventType, organisationId) {
      const { prisma } = await import("@dg/database");
      try {
        await prisma.stripeWebhookReceipt.create({
          data: {
            eventId,
            eventType,
            organisationId,
            status: "processing",
            attempts: 1,
            claimedAt: new Date(),
          },
        });
        return true;
      } catch {
        // Unique violation — another delivery holds it, or it is already done.
        return false;
      }
    },

    async read(eventId) {
      const { prisma } = await import("@dg/database");
      const row = await prisma.stripeWebhookReceipt.findUnique({
        where: { eventId },
        select: {
          eventId: true,
          status: true,
          attempts: true,
          claimedAt: true,
          completedAt: true,
        },
      });
      if (!row) return null;
      return {
        eventId: row.eventId,
        status: row.status as ReceiptStatus,
        attempts: row.attempts,
        claimedAt: row.claimedAt,
        completedAt: row.completedAt,
      };
    },

    async reclaim(eventId, staleBefore) {
      const { prisma } = await import("@dg/database");
      // Retryable failure, or a claim old enough that its owner cannot still be
      // running. Zero affected rows means another worker won.
      const result = await prisma.stripeWebhookReceipt.updateMany({
        where: {
          eventId,
          OR: [
            { status: "failed" },
            { status: "processing", claimedAt: { lt: staleBefore } },
          ],
        },
        data: {
          status: "processing",
          claimedAt: new Date(),
          attempts: { increment: 1 },
        },
      });
      if (result.count === 0) return null;

      const row = await prisma.stripeWebhookReceipt.findUnique({
        where: { eventId },
        select: { attempts: true },
      });
      return row?.attempts ?? null;
    },

    async markProcessed(eventId) {
      const { prisma } = await import("@dg/database");
      await prisma.stripeWebhookReceipt.update({
        where: { eventId },
        data: { status: "processed", completedAt: new Date(), lastError: null },
      });
    },

    async markFailed(eventId, error) {
      const { prisma } = await import("@dg/database");
      await prisma.stripeWebhookReceipt.update({
        where: { eventId },
        data: { status: "failed", lastError: error.slice(0, 2000) },
      });
    },
  };
}
