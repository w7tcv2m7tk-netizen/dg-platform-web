import type { Prisma } from '@prisma/client';
import type { IdentityGrant } from './runtime-identity-invocation';
import { inspectRuntimeIdentity, type IdentityDatabase, type IdentityResult } from './runtime-identity';

import { applicationCredentialsMatch } from './runtime-identity-credentials';
export { configuredNeonEndpoint, applicationCredentialsMatch } from './runtime-identity-credentials';

export async function probeApprovedIdentity(grant: IdentityGrant): Promise<IdentityResult> {
  const age = Date.now() - grant.providerVerifiedAt.getTime();
  if (!Number.isFinite(age) || age < 0 || age > 900000 ||
      grant.expectedRole !== 'dg_app_runtime' || grant.expectedDatabase !== 'neondb' ||
      !applicationCredentialsMatch(grant,process.env) ||
      grant.neonProject !== 'gentle-sky-35028642' || grant.neonBranch !== 'br-old-shadow-a7ffezls') return { status: 'denied' };
  // Same exported client as checkout, imported only after durable consumption.
  const { prisma } = await import('@dg/database');
  return inspectRuntimeIdentity({
    userId: async () => grant.actor,
    database: () => prisma as unknown as IdentityDatabase,
    revision: grant.revision,
    validateSession: async (tx,row) => validateRuntimeSession(tx as unknown as Prisma.TransactionClient,row,grant),
  });
}

export async function validateRuntimeSession(transaction: Prisma.TransactionClient, row: {role:unknown;session_role:unknown;database:unknown},grant: IdentityGrant): Promise<boolean> {

      if (row.role !== grant.expectedRole || row.session_role !== grant.expectedRole ||
          row.database !== grant.expectedDatabase) return false;
      const tx = transaction;
      // Limited hard-negative guard. Full 83-table manifest verification remains a
      // separately approved read-only prerequisite, not a claim made by this query.
      const checks = await tx.$queryRaw<Array<{ unsafe: boolean }>>`
        SELECT (
          NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user)
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user
            AND (rolsuper OR rolbypassrls OR rolcreaterole OR rolcreatedb OR rolreplication OR rolinherit))
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname<>current_user
            AND (pg_catalog.pg_has_role(current_user,oid,'MEMBER') OR pg_catalog.pg_has_role(current_user,oid,'SET')))
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relowner=current_user::regrole)
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
            WHERE n.nspname='public' AND p.proowner=current_user::regrole)
          OR pg_catalog.has_schema_privilege(current_user,'public','CREATE')
          OR pg_catalog.has_database_privilege(current_user,current_database(),'CREATE')
          OR COALESCE(pg_catalog.has_any_column_privilege(current_user,
            pg_catalog.to_regclass('public._prisma_migrations'),'SELECT,INSERT,UPDATE,REFERENCES'),true)
          OR COALESCE(pg_catalog.has_table_privilege(current_user,
            pg_catalog.to_regclass('public._prisma_migrations'),'DELETE,TRUNCATE,TRIGGER'),true)
        ) AS unsafe`;
      return checks.length === 1 && checks[0].unsafe === false;

}
