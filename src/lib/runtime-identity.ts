import { databaseLogger } from '../../packages/database/src/safe-logging';
import { hasPlatformAuthority, isApiKeyPrincipal } from '../../packages/platform-core/src/access/platform-authority';

export type IdentityResult = { status: 'ok'; role: string; sessionRole: string; database: string; revision: string } | { status: 'denied' | 'unavailable' };
type Tx = {
  $executeRaw: (sql: TemplateStringsArray) => Promise<unknown>;
  $queryRaw: (sql: TemplateStringsArray) => Promise<Array<{ role: unknown; session_role: unknown; database: unknown }>>;
  membership: { findMany: (args: unknown) => Promise<Array<{ organisationId: string; role: string }>> };
};
export type IdentityDatabase = { $transaction: <T>(run: (tx: Tx) => Promise<T>, options: { maxWait: number; timeout: number }) => Promise<T> };
const label = (value: unknown): string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,63}$/.test(value) ? value : '[redacted]';

/** No cache, request SQL, connection metadata, error text, or logging. */
export async function inspectRuntimeIdentity(deps: {
  userId: () => Promise<string | null>;
  database: () => IdentityDatabase;
  revision: string | undefined;
  expired?: () => boolean;
  validateSession?: (tx: Tx, row: { role: unknown; session_role: unknown; database: unknown }) => Promise<boolean>;
}): Promise<IdentityResult> {
  let databaseAttempted = false;
  try {
    const userId = await deps.userId();
    if (deps.expired?.()) return { status: 'unavailable' };
    if (!userId || isApiKeyPrincipal(userId)) return { status: 'denied' };
    databaseAttempted = true;
    return await deps.database().$transaction(async tx => {
      if (deps.expired?.()) return { status: 'unavailable' };
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '1500ms'`;
      await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
      const memberships = await tx.membership.findMany({
        where: { clerkUserId: userId, status: 'active' },
        select: { organisationId: true, role: true }, take: 100,
      });
      if (deps.expired?.()) return { status: 'unavailable' };
      if (!memberships.some(m => hasPlatformAuthority({ ...m, principalId: userId }))) return { status: 'denied' };
      const rows = await tx.$queryRaw`SELECT current_user::text AS role, session_user::text AS session_role, current_database()::text AS database`;
      if (rows.length !== 1) return { status: 'unavailable' };
      if (deps.validateSession && !await deps.validateSession(tx, rows[0])) return { status: 'denied' };
      if (deps.expired?.()) return { status: 'unavailable' };
      return { status: 'ok', role: label(rows[0].role), sessionRole: label(rows[0].session_role), database: label(rows[0].database),
        revision: deps.revision && /^[a-f0-9]{40}$/i.test(deps.revision) ? deps.revision.toLowerCase() : '[unavailable]' };
    }, { maxWait: 1000, timeout: 4000 });
  } catch (error) {
    if (databaseAttempted) databaseLogger.operationFailure(error);
    return { status: 'unavailable' };
  }
}

/** One surviving operation per worker. A response timeout does NOT release its slot.
 * Auth/engine startup cannot be cancelled; a stuck phase closes this worker's
 * diagnostic until settlement/recycle. Other application work is not gated.
 */
export function createRuntimeIdentityDiagnostic(responseMs = 6500) {
  let occupied = false;
  return async (deps: Parameters<typeof inspectRuntimeIdentity>[0]): Promise<IdentityResult> => {
    if (occupied) return { status: 'unavailable' };
    occupied = true;
    let expired = false;
    const deadline = performance.now() + responseMs;
    const isExpired = () => expired || performance.now() >= deadline;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = inspectRuntimeIdentity({ ...deps, expired: isExpired })
      .finally(() => { occupied = false; });
    try {
      const result = await Promise.race([
        work,
        new Promise<IdentityResult>(resolve => {
          timer = setTimeout(() => { expired = true; resolve({ status: 'unavailable' }); }, responseMs);
        }),
      ]);
      return isExpired() ? { status: 'unavailable' } : result;
    } finally { if (timer) clearTimeout(timer); }
  };
}
export const diagnoseRuntimeIdentity = createRuntimeIdentityDiagnostic();
