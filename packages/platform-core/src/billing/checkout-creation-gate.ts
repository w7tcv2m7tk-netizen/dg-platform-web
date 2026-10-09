import "server-only";

export class CheckoutTemporarilyUnavailable extends Error {
  constructor() {
    super("Subscription checkout is temporarily unavailable. Please try again shortly.");
    this.name = "CheckoutTemporarilyUnavailable";
  }
}

/** No cached reads or env bypass. This UPDATE commits before any Stripe create.
 * Closing the same singleton row serializes with admission on every instance.
 * Even a worker paused after admission cannot create an unbounded late session:
 * its Stripe request must retain the database-issued absolute expires_at.
 */
export async function admitPlatformCheckout(): Promise<{ expiresAt: number }> {
  try {
    const { prisma } = await import("@dg/database");
    const rows = await prisma.$queryRaw<Array<{ expiresAt: bigint }>>`
      UPDATE platform_checkout_creation_gate
      SET last_admission_expires_at = GREATEST(
        last_admission_expires_at,
        date_trunc('second', clock_timestamp()) + interval '35 minutes'
      )
      WHERE id = 1 AND blocked = false
      RETURNING EXTRACT(EPOCH FROM last_admission_expires_at)::bigint AS "expiresAt"
    `;
    if (rows.length !== 1) throw new CheckoutTemporarilyUnavailable();
    const expiresAt = Number(rows[0].expiresAt);
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) throw new CheckoutTemporarilyUnavailable();
    return { expiresAt };
  } catch {
    // Missing migration/row, denied writes, timeouts and unknown commit all deny.
    // Do not log provider payloads, customer details or database errors here.
    throw new CheckoutTemporarilyUnavailable();
  }
}
