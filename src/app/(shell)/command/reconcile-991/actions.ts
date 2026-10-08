'use server';

import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { hasPlatformAuthority } from '@dg/platform-core/access/platform-authority';
import { handleReconcile991Action, type Reconcile991ActionResult } from '@/lib/reconcile-991';

export async function runReconcile991Action(
  _previous: Reconcile991ActionResult | null,
  formData: FormData,
): Promise<Reconcile991ActionResult> {
  let database: PrismaClient | undefined;
  const getDatabase = () => (database ??= new PrismaClient({ log: [], errorFormat: 'minimal' }));
  try {
    return await handleReconcile991Action(formData.get('confirmation'), {
      userId: async () => (await auth({ acceptsToken: 'session_token' })).userId,
      database: getDatabase,
      isCurrentPlatformOperator: async userId => {
        const memberships = await getDatabase().membership.findMany({
          where: { clerkUserId: userId, status: 'active' },
          select: { organisationId: true, role: true },
        });
        return memberships.some(m => hasPlatformAuthority({ ...m, principalId: userId }));
      },
    });
  } catch {
    // Never serialize auth/database errors. Any execution uncertainty is STOP.
    return 'ambiguous';
  } finally {
    if (database) await database.$disconnect().catch(() => undefined);
  }
}
