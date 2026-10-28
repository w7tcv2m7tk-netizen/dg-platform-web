# Stage 3 — Default Privileges and RLS Read-Only Verification Procedure

Status: **PROPOSED — NOT EXECUTED — requires separate owner approval.**  
Scope: read-only catalog verification only. No Production connection is authorised by
this document.

## Purpose

The Stage 2C evidence establishes admission-table RLS through the approved
expected-catalog/receipt and records default privileges as UNVERIFIED. This procedure
is the minimal read-only check needed to close that gap before a Production release.
It does not query customer rows, does not create temporary tables and does not use
`SET ROLE`.

## Execution conditions

- Authorised read-only operator session only; never the application runtime role and
  never an owner/admin credential used to impersonate the reader.
- Use the exact approved project, production branch and database.
- Read-only transaction; no writes, DDL, grants, locks for mutation or credential
  retrieval.
- The operator must confirm the session identity and TLS before running.
- Review the catalog results privately; publish only sanitised aggregates and
  booleans. Do not publish policy expressions, connection details or customer data.

## Exact SQL

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

-- 1. Explicit default ACLs for schema public and global defaults.
SELECT
  CASE WHEN d.defaclnamespace = 0 THEN '<global>'
       ELSE d.defaclnamespace::regnamespace::text END AS default_scope,
  d.defaclrole::regrole::text AS owner_role,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE a.grantee::regrole::text END AS grantee,
  d.defaclobjtype AS object_type,
  a.privilege_type,
  a.is_grantable
FROM pg_default_acl d
CROSS JOIN LATERAL aclexplode(d.defaclacl) a
WHERE d.defaclnamespace = 0
   OR d.defaclnamespace = 'public'::regnamespace
ORDER BY 1, 2, 3, 4, 5;

-- 2. RLS status for every public table.
SELECT
  c.relname AS table_name,
  c.relkind,
  c.relrowsecurity,
  c.relforcerowsecurity,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
ORDER BY c.relname;

-- 3. RLS policies by role and command. No policy expressions are returned.
SELECT
  c.relname AS table_name,
  p.polname,
  p.polcmd,
  CASE WHEN p.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS mode,
  ARRAY(
    SELECT CASE WHEN role_oid = 0 THEN 'PUBLIC' ELSE role_oid::regrole::text END
    FROM unnest(p.polroles) AS role_oid
    ORDER BY 1
  ) AS roles
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, p.polname;

-- 4. Current ACL/owner/RLS metadata for the Stage 2C target relations.
SELECT
  c.relname AS table_name,
  c.relowner::regrole::text AS owner,
  c.relacl::text AS acl,
  c.relrowsecurity,
  c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    '_prisma_migrations',
    'platform_checkout_creation_gate',
    'platform_subscriptions',
    'platform_subscription_events',
    'platform_checkout_attempts',
    'platform_checkout_admissions',
    'platform_checkout_admission_audit',
    'stripe_webhook_receipts'
  )
ORDER BY c.relname;

COMMIT;
```

## Acceptance criteria

- No default ACL grants table, sequence or function privileges to `PUBLIC` or
  `dg_preflight_reader` unless explicitly reviewed and approved.
- Default ACL entries owned by expected owner roles are recorded; unexpected owner
  roles are STOP.
- Stage 2C target tables must have `relrowsecurity=false` and
  `relforcerowsecurity=false`, matching the captured aggregate evidence, unless an
  explicit separately reviewed policy is proven not to filter those aggregates.
- Any RLS policy on a target table is a STOP for release readiness until reviewed.
- `_prisma_migrations` must not be runtime-accessible.
- No `dg_app_runtime` or application runtime role may be an owner of public objects.

## STOP conditions

- Unexpected default ACL grant, owner role, policy, RLS flag or target-table ACL.
- Any need to write, grant, alter, create a temp table or change a session role.
- Wrong project/branch/database or session identity.
- Any uncertainty about policy filtering of Stage 2C aggregates.

## Approval

This procedure is proposed only. It requires separate owner approval before any
read-only Production execution. It does not authorise a Production release,
deployment, migration, grant or checkout action.
