import "server-only";

/**
 * Read the shared operational hold on every delivery. This deliberately has no
 * process cache so every server instance observes the same committed state.
 * Missing migrations, rows, permissions, and database failures throw; callers
 * must return a retryable response rather than claim the event receipt.
 */
export async function readPlatformSubscriptionWebhookCutoverHold(
  readState?: () => Promise<{ subscriptionWebhooksHeld: unknown } | null>,
): Promise<boolean> {
  const read = readState ?? (async () => {
    const { prisma } = await import("@dg/database");
    return prisma.platformCheckoutCreationGate.findUnique({
      where: { id: 1 },
      select: { subscriptionWebhooksHeld: true },
    });
  });

  const state = await read();
  if (!state || typeof state.subscriptionWebhooksHeld !== "boolean") {
    throw new Error("Platform subscription webhook hold state is unavailable");
  }
  return state.subscriptionWebhooksHeld;
}
