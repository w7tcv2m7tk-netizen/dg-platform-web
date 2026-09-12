import { MAX_ATTEMPTS, STALE_CLAIM_MS } from "./webhook-receipt-state";

export type StripeWebhookProcessingHealth = {
  processedLast24h: number;
  activeClaims: number;
  staleClaims: number;
  failed: number;
  exhausted: number;
  latestFailure: {
    eventType: string;
    attempts: number;
    claimedAt: string | null;
  } | null;
};

/**
 * Operator-only aggregate of durable Stripe webhook receipt state.
 *
 * Intentionally exposes counts and lifecycle metadata only — never event
 * payloads, customer fields, provider object bodies or recorded error text.
 */
export async function getStripeWebhookProcessingHealth(
  now = new Date(),
): Promise<StripeWebhookProcessingHealth> {
  const { prisma } = await import("@dg/database");
  const staleBefore = new Date(now.getTime() - STALE_CLAIM_MS);
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [processedLast24h, activeClaims, staleClaims, failed, exhausted, latestFailure] =
    await Promise.all([
      prisma.stripeWebhookReceipt.count({
        where: { status: "processed", completedAt: { gte: last24h } },
      }),
      prisma.stripeWebhookReceipt.count({
        where: { status: "processing", claimedAt: { gt: staleBefore } },
      }),
      prisma.stripeWebhookReceipt.count({
        where: { status: "processing", claimedAt: { lte: staleBefore } },
      }),
      prisma.stripeWebhookReceipt.count({ where: { status: "failed" } }),
      prisma.stripeWebhookReceipt.count({
        where: { status: "failed", attempts: { gte: MAX_ATTEMPTS } },
      }),
      prisma.stripeWebhookReceipt.findFirst({
        where: { status: "failed" },
        orderBy: [{ claimedAt: "desc" }, { processedAt: "desc" }],
        select: {
          eventType: true,
          attempts: true,
          claimedAt: true,
        },
      }),
    ]);

  return {
    processedLast24h,
    activeClaims,
    staleClaims,
    failed,
    exhausted,
    latestFailure: latestFailure
      ? {
          eventType: latestFailure.eventType,
          attempts: latestFailure.attempts,
          claimedAt: latestFailure.claimedAt?.toISOString() ?? null,
        }
      : null,
  };
}
