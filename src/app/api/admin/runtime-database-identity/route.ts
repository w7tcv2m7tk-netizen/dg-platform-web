import { auth } from '@clerk/nextjs/server';
import { createIdentityInvocation, type RuntimeBinding } from '@/lib/runtime-identity-invocation';
import { getIdentityControl } from '@/lib/runtime-identity-control';
import { probeApprovedIdentity } from '@/lib/runtime-identity-probe';
import { identityRefusal } from '@/lib/runtime-identity-request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 25;
const invoke = createIdentityInvocation();

export async function POST(request: Request): Promise<Response> {
  if (process.env.DG_RUNTIME_IDENTITY_ENABLED !== '1') return identityRefusal();
  return invoke(request, {
    authenticate: async () => (await auth({ acceptsToken:'session_token' })).userId,
    binding: () => process.env.VERCEL_ENV === 'production' ? {
      project:process.env.VERCEL_PROJECT_ID ?? '',deployment:process.env.VERCEL_DEPLOYMENT_ID ?? '',
      revision:process.env.VERCEL_GIT_COMMIT_SHA ?? '',environment:'production',
    } satisfies RuntimeBinding : null,
    store:getIdentityControl,
    probe:probeApprovedIdentity,
  });
}
export const GET=identityRefusal;
export const PUT=identityRefusal;
export const PATCH=identityRefusal;
export const DELETE=identityRefusal;
export const HEAD=identityRefusal;
export const OPTIONS=identityRefusal;
