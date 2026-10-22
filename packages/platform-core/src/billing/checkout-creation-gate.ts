import "server-only";
import type { Prisma } from "@dg/database";

export class CheckoutTemporarilyUnavailable extends Error {
  readonly outcome: "gate_denied" | "expiry_rejected" | "unknown";

  constructor(outcome: "gate_denied" | "expiry_rejected" | "unknown" = "gate_denied") {
    super(outcome === "unknown"
      ? "We couldn't confirm whether subscription checkout started. Contact DigitalGate before starting another checkout."
      : "Subscription checkout is temporarily unavailable. Please try again shortly.");
    this.name = "CheckoutTemporarilyUnavailable";
    this.outcome = outcome;
  }
}

/** No cached reads or env bypass. This UPDATE commits before any Stripe create.
 * Closing the same singleton row serializes with admission on every instance.
 * Even a worker paused after admission cannot create an unbounded late session:
 * its Stripe request must retain the admitted immutable absolute expires_at.
 * Coordinator callers pass the stored expiry; no-argument compatible callers
 * retain the original 35-minute permit. Never copy a larger drain horizon into
 * a coordinator replay body.
 */
export async function admitPlatformCheckout(input: {
  expiresAt?: number;
  database?: Pick<Prisma.TransactionClient, "$queryRaw">;
} = {}): Promise<{ expiresAt: number }> {
  try {
    const database = input.database ?? (await import("@dg/database")).prisma;
    if (input.expiresAt !== undefined && (!Number.isSafeInteger(input.expiresAt) || input.expiresAt <= 0)) {
      throw new CheckoutTemporarilyUnavailable();
    }
    const rows = await database.$queryRaw<Array<{ expiresAt: bigint }>>`
      UPDATE platform_checkout_creation_gate
      SET last_admission_expires_at = GREATEST(
        last_admission_expires_at,
        COALESCE(to_timestamp(${input.expiresAt ?? null}::double precision),
          date_trunc('second', clock_timestamp()) + interval '35 minutes')
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
