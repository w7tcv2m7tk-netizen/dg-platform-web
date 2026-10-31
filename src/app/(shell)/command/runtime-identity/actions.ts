'use server';

import { unstable_noStore as noStore } from 'next/cache.js';
import type { IdentityResult } from '@/lib/runtime-identity';

export async function readRuntimeIdentity(): Promise<IdentityResult> {
  noStore();
  // Retired public action identifier: never leave a grant-free bypass for stale clients.
  return { status: 'denied' };
}
