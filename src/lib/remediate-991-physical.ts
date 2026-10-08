import "server-only";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { hasPlatformAuthority } from "@dg/platform-core/access/platform-authority";
import { reviewedRemediationStatements } from "./remediate-991-sql";
import { PHYSICAL_991_OPERATION, physical991Envelope, physical991Response, type Physical991Audit } from "./remediate-991-request";

type Database = Pick<PrismaClient, "$transaction">;
function refuse(): never { throw new Error("Remediation refused"); }
function enabled(): boolean {
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production"
    && process.env.DG_REMEDIATE_991_PHYSICAL_OPERATION === PHYSICAL_991_OPERATION
    && process.env.AI_WORKER_PROVISIONING_ENABLED !== "true";
}
async function validRequest(request: Request): Promise<boolean> {
  const expected = process.env.DG_REMEDIATE_991_PHYSICAL_SECRET_SHA256 ?? "";
  const secret = request.headers.get("X-DG-Remediate-991-Physical-Secret") ?? "";
  if (!await physical991Envelope(request) || request.headers.get("X-DG-Operation") !== PHYSICAL_991_OPERATION
    || !/^[a-f0-9]{64}$/.test(expected) || !/^[a-f0-9]{64}$/.test(secret)) return false;
  return timingSafeEqual(createHash("sha256").update(secret).digest(), Buffer.from(expected, "hex"));
}
async function operator(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const memberships = await tx.membership.findMany({ where: { clerkUserId: userId, status: "active" },
    select: { organisationId: true, role: true } });
  if (!memberships.some(m => hasPlatformAuthority({ ...m, principalId: userId }))) refuse();
}

export async function handleRemediate991Physical(request: Request, dependencies: {
  userId: () => Promise<string | null>; database: () => Database;
  audit: (event: Physical991Audit) => void;
}): Promise<Response> {
  const requestId = randomUUID();
  let actor: string | null = null;
  const audit = (outcome: Physical991Audit["outcome"]) => {
    // Audit transport failure must not misreport a committed transaction as refused.
    try { dependencies.audit({ operation: PHYSICAL_991_OPERATION, requestId,
      timestamp: new Date().toISOString(), actor, outcome }); } catch { /* no error logging */ }
  };
  try {
    if (!enabled() || !await validRequest(request)) refuse();
    const userId = await dependencies.userId();
    if (!userId || !/^user_[A-Za-z0-9_]+$/.test(userId)) refuse();
    actor = userId;
    const { settings, body } = reviewedRemediationStatements();
    audit("attempt");
    await dependencies.database().$transaction(async tx => {
      // Constant generated SQL only; no request values become SQL.
      for (const setting of settings) await tx.$executeRawUnsafe(setting);
      await operator(tx, userId);
      const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(991, 20261008) AS acquired`;
      if (!lock?.acquired) refuse();
      // Fence authority changes; recheck active membership after taking the lock.
      await tx.$executeRaw`LOCK TABLE public.memberships IN SHARE MODE`;
      await operator(tx, userId);
      if (!enabled() || !await validRequest(request)) refuse();
      // Exact rehearsed DO block: locks, checks, six deltas, postconditions.
      await tx.$executeRawUnsafe(body);
      if (!enabled() || !await validRequest(request)) refuse();
      await operator(tx, userId);
    }, { isolationLevel: "ReadCommitted", maxWait: 2000, timeout: 25000 });
    audit("success");
    return physical991Response(200, requestId);
  } catch {
    audit("refused");
    return physical991Response(403, requestId);
  }
}
