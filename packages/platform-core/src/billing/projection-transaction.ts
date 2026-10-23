import type { Prisma } from "@dg/database";

/** Refresh and project under one tenant lock, including derived billing writes.
 * Provider reads have a bounded timeout; failures roll back and webhook retries.
 */
export type ProjectionRead = <T>(operation: (timeout: number) => Promise<T>) => Promise<T>;

export async function withProjectionTransaction<T>(organisationId: string, run: (database: Prisma.TransactionClient, read: ProjectionRead) => Promise<T>): Promise<T> {
  const { prisma } = await import("@dg/database");
  return prisma.$transaction(async tx => {
    // The read deadline includes lock wait and leaves ten seconds for DB writes.
    const deadline = Date.now() + 20_000;
    const read: ProjectionRead = async operation => {
      const timeout = Math.min(5_000, deadline - Date.now());
      if (timeout <= 0) throw new Error("Stripe provider read budget exhausted");
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([Promise.resolve().then(() => operation(timeout)), new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Stripe provider read timed out")), timeout);
        })]);
      } finally { if (timer) clearTimeout(timer); }
    };
    await tx.$queryRaw`SELECT id FROM organisations WHERE id = ${organisationId} FOR NO KEY UPDATE`;
    return run(tx, read);
  }, { maxWait: 10_000, timeout: 30_000 });
}
