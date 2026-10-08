'use server';

import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';
import { hasPlatformAuthority } from '@dg/platform-core/access/platform-authority';
import { auditPhysical991 } from '@/lib/remediate-991-request';
import { handleRemediate991PhysicalAction, type Physical991ActionResult } from '@/lib/remediate-991-physical';

export async function runPhysical991Action(
  _previous: Physical991ActionResult | null,
  formData: FormData,
): Promise<Physical991ActionResult> {
  let database: PrismaClient | undefined;
  const getDatabase = () => (database ??= new PrismaClient({ log: [], errorFormat: 'minimal' }));
  try {
    return await handleRemediate991PhysicalAction(formData.get('confirmation'), {
      userId: async () => (await auth({ acceptsToken: 'session_token' })).userId,
      database: getDatabase,
      isCurrentPlatformOperator: async userId => {
        const memberships = await getDatabase().membership.findMany({
          where: { clerkUserId: userId, status: 'active' },
          select: { organisationId: true, role: true },
        });
        return memberships.some(m => hasPlatformAuthority({ ...m, principalId: userId }));
      },
      audit: auditPhysical991,
    });
  } catch {
    // Never serialize or log auth/database errors. Once invoked, the client is
    // told to stop and verify read-only state rather than retrying.
    return 'ambiguous';
  } finally {
    if (database) await database.$disconnect().catch(() => undefined);
  }
}
