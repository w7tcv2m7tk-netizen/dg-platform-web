import { prisma } from "@dg/database";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GUARDED_PLATFORM_BILLING_EVENT_TYPES = [
  "subscription.created",
  "subscription.updated",
  "subscription.cancelled",
  // Both checkout.session.completed and checkout.session.async_payment_succeeded
  // normalize to checkout.completed before receipt claiming.
  "checkout.completed",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.paid",
];
const staleClaimMs = 15 * 60 * 1000;

/**
 * Read-only view of lifecycle receipts while the shared hold is active.
 * A processing row without claimedAt is a known legacy post-handler receipt:
 * the previous handler inserted receipts only after successful processing.
 */
export async function readPlatformSubscriptionWebhookDrain(db = prisma, now = Date.now()) {
  const gate = await db.platformCheckoutCreationGate.findUnique({
    where: { id: 1 },
    select: { subscriptionWebhooksHeld: true, revision: true },
  });
  if (!gate || gate.subscriptionWebhooksHeld !== true) {
    throw new Error("Refusing to report a drain: the shared subscription webhook hold is not active");
  }

  const receipts = await db.stripeWebhookReceipt.findMany({
    where: { eventType: { in: GUARDED_PLATFORM_BILLING_EVENT_TYPES }, status: { in: ["processing", "failed"] } },
    orderBy: [{ claimedAt: "asc" }, { eventId: "asc" }],
    select: { eventId: true, eventType: true, status: true, attempts: true, claimedAt: true },
  });
  const activeProcessing = receipts.filter((receipt) => receipt.status === "processing" && receipt.claimedAt !== null).map((receipt) => {
    const ageMs = receipt.claimedAt ? now - receipt.claimedAt.getTime() : null;
    return {
      eventId: receipt.eventId,
      eventType: receipt.eventType,
      attempts: receipt.attempts,
      claimedAt: receipt.claimedAt?.toISOString() ?? null,
      ageMs,
      state: ageMs !== null && ageMs >= staleClaimMs ? "stale_candidate_requires_operator_resolution" : "possibly_in_flight",
    };
  });
  const legacyCompleted = receipts.filter((receipt) => receipt.status === "processing" && receipt.claimedAt === null).map((receipt) => ({
    eventId: receipt.eventId,
    eventType: receipt.eventType,
    attempts: receipt.attempts,
    claimedAt: null,
    classification: "legacy_post_handler_receipt",
  }));
  const failed = receipts.filter((receipt) => receipt.status === "failed").map((receipt) => ({
    eventId: receipt.eventId,
    eventType: receipt.eventType,
    attempts: receipt.attempts,
  }));

  return {
    holdActive: true,
    gateRevision: gate.revision,
    activeProcessingCount: activeProcessing.length,
    activeProcessing,
    legacyCompletedCount: legacyCompleted.length,
    legacyCompleted,
    failedCount: failed.length,
    failed,
    drained: activeProcessing.length === 0,
    recoveryRequired: failed.length > 0,
  };
}

async function main() {
  try {
    const report = await readPlatformSubscriptionWebhookDrain();
    console.log(JSON.stringify(report, null, 2));
    if (!report.drained || report.recoveryRequired) process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Unable to read webhook drain state");
    process.exitCode = 1;
  });
}
