import type { IdentityGrant } from './runtime-identity-invocation';

/** Configuration correlation is not a live provider lookup or TLS attestation. */
export function configuredNeonEndpoint(url: string | undefined): string | null {
  try {
    const u = new URL(url ?? '');
    if (!['postgres:', 'postgresql:'].includes(u.protocol) || u.port && u.port !== '5432' ||
        u.hash || u.searchParams.has('options') || u.searchParams.has('host') || u.searchParams.has('hostaddr') ||
        u.searchParams.has('schema') && u.searchParams.get('schema') !== 'public') return null;
    return /^(ep-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+)\.ap-southeast-2\.aws\.neon\.tech$/
      .exec(u.hostname.replace('-pooler.','.'))?.[1] ?? null;
  } catch { return null; }
}

export function applicationCredentialsMatch(grant: IdentityGrant, env: Record<string,string|undefined>): boolean {
  for (const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED','DIRECT_URL','SHADOW_DATABASE_URL','RECONCILIATION_DATABASE_URL']) {
    if (!env[key] && key !== 'DATABASE_URL') continue;
    try {
      const u=new URL(env[key] ?? '');
      if (configuredNeonEndpoint(env[key]) !== grant.endpoint || decodeURIComponent(u.username) !== grant.expectedRole ||
          decodeURIComponent(u.pathname.slice(1)) !== grant.expectedDatabase) return false;
    } catch { return false; }
  }
  return true;
}

