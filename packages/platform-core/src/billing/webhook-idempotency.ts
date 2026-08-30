/**
 * Webhook idempotency orchestration (H-7).
 *
 * The claim must happen *before* the handler so two concurrent deliveries of
 * the same event cannot both execute it. The consequence is that a handler
 * which throws leaves the claim in place, so Stripe's retry is rejected as a
 * duplicate and the event is lost. Releasing the claim on failure returns the
 * event to the unseen state while keeping the concurrency guarantee.
 *
 * State model, using only the existing StripeWebhookReceipt row:
 *
 *   row absent   → unseen (or released after failure) — will be processed
 *   row present  → claimed by an in-flight delivery, or already processed
 *
 * Known limit: a process that dies without unwinding cannot release its claim,
 * so a hard crash mid-handler still strands the event. Separating "processing"
 * from "processed" needs a status column on StripeWebhookReceipt, which is a
 * schema change and is deliberately not part of this pass.
 */

export type WebhookIdempotencyOutcome =
  | { status: "processed" }
  | { status: "duplicate" }
  | { status: "released"; error: unknown };

export type WithWebhookIdempotencyOptions<T> = {
  /** Insert the receipt. Must be atomic — a unique constraint on the event id. */
  claim: () => Promise<{ claimed: boolean }>;
  /** Delete the receipt so a retry can re-claim. */
  release: () => Promise<unknown>;
  /** Runs only when this delivery won the claim. */
  handle: () => Promise<T>;
  /** Runs when another delivery already holds or completed the claim. */
  onDuplicate: () => T | Promise<T>;
  /** Observability hook; never throws into the caller. */
  onReleaseFailed?: (error: unknown) => void;
};

/**
 * Run a webhook handler exactly once per event id, keeping failures retryable.
 * Rethrows the handler's error after releasing, so the caller can return a
 * retryable status code to the provider.
 */
export async function withWebhookIdempotency<T>(
  options: WithWebhookIdempotencyOptions<T>,
): Promise<T> {
  const receipt = await options.claim();

  if (!receipt.claimed) {
    return await options.onDuplicate();
  }

  try {
    return await options.handle();
  } catch (error) {
    try {
      await options.release();
    } catch (releaseError) {
      options.onReleaseFailed?.(releaseError);
    }
    throw error;
  }
}
