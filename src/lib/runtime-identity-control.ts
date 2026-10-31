import { PrismaClient } from '@prisma/client';
import type { IdentityControlStore, IdentityGrant, IdentityOutcome, RuntimeBinding } from './runtime-identity-invocation';

/** No per-request connect/disconnect; never use the application database for claims. */
export function createPostgresIdentityControl(client: PrismaClient): IdentityControlStore {
  return {
    claim: async (digest, actor, b: RuntimeBinding, requestId) => client.$transaction(async tx => {
      await tx.$executeRaw`SET LOCAL statement_timeout='1500ms'`;
      await tx.$executeRaw`SET LOCAL lock_timeout='500ms'`;
      const rows = await tx.$queryRaw<Array<{ value: {
        id: string; actor: string; project: string; deployment: string; revision: string;
        environment: 'production'; expected_role: string; expected_database: string;
        endpoint: string; neon_project: string; neon_branch: string; provider_verified_at: string;
      } }>>`SELECT to_jsonb(runtime_identity_control.claim(
          ${digest},${actor},${b.project},${b.deployment},${b.revision},${b.environment},${requestId}::uuid)) AS value`;
      if (rows.length === 0) return null;
      if (rows.length !== 1) throw new Error('invalid claim response');
      const g = rows[0].value;
      return { grantId:g.id,actor:g.actor,project:g.project,deployment:g.deployment,revision:g.revision,
        environment:g.environment,expectedRole:g.expected_role,expectedDatabase:g.expected_database,
        endpoint:g.endpoint,neonProject:g.neon_project,neonBranch:g.neon_branch,
        providerVerifiedAt:new Date(g.provider_verified_at) } satisfies IdentityGrant;
    }, { maxWait:1000,timeout:2500 }),
    finish: async (g, requestId, outcome: IdentityOutcome) => {
      await client.$transaction(async tx => {
        await tx.$executeRaw`SET LOCAL statement_timeout='1500ms'`;
        await tx.$executeRaw`SET LOCAL lock_timeout='500ms'`;
        const rows=await tx.$queryRaw<Array<{ok:boolean}>>`SELECT runtime_identity_control.finish(
          ${g.grantId}::uuid,${requestId}::uuid,${outcome}) AS ok`;
        if (rows.length!==1 || rows[0].ok!==true) throw new Error('completion not confirmed');
      }, { maxWait:1000,timeout:2500 });
    },
  };
}

export function isolatedControlUrl(control: string | undefined, application: string | undefined): string | null {
  try {
    const c=new URL(control ?? '');const a=new URL(application ?? '');
    const endpoint=(host:string)=>host.replace('-pooler.','.');
    if (!['postgres:','postgresql:'].includes(c.protocol) || !['postgres:','postgresql:'].includes(a.protocol) ||
        c.hash || c.username!=='dg_identity_executor' || !c.password ||
        !/^\/dg_identity_control[A-Za-z0-9_]*$/.test(c.pathname) ||
        endpoint(c.hostname)===endpoint(a.hostname) && c.pathname===a.pathname ||
        [...c.searchParams.keys()].some(k=>!['sslmode','sslaccept','connection_limit','connect_timeout','pool_timeout'].includes(k)) ||
        c.searchParams.get('sslmode')!=='require' || c.searchParams.get('sslaccept')!=='strict') return null;
    c.searchParams.set('connect_timeout','3');c.searchParams.set('pool_timeout','1');c.searchParams.set('connection_limit','1');
    return c.toString();
  } catch { return null; }
}
let control: IdentityControlStore | undefined;
export function getIdentityControl(): IdentityControlStore {
  if (control) return control;
  const url=isolatedControlUrl(process.env.DG_RUNTIME_IDENTITY_CONTROL_URL,process.env.DATABASE_URL);
  if (!url) throw new Error('control isolation unavailable');
  control=createPostgresIdentityControl(new PrismaClient({datasourceUrl:url,log:[]}));
  return control;
}
