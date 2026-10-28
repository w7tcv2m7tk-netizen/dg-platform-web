# DigitalGate — Stage 3 SELECT-Only Runtime-Permissions Supplement

Prepared: 2026-10-28  
Status: **PROPOSED — NOT EXECUTED — owner approval required**  
Scope: SELECT-only catalog verification of the serving runtime role against the approved runtime-role manifest  
Worktree: `review/production-preflight-sql-review-20261028`  
Related: Stage 2C certification `b7633016e89309d0bc21a31e92a06a7c50e537b1`; Stage 3A `33778c1f02cb69dad6bbbd326446fa0c6dab45d6`; Stage 3B `d8e6b5ccebd57dd690f52964d428017459c4ad3d`

## 1. Purpose

The existing `scripts/sql/runtime-role-verify.sql` is an administrative verifier: it
creates transaction-local temporary tables and raises exceptions. This supplement is a
strictly SELECT-only review of the same approved runtime-role manifest. It is intended
for an attended read-only operator session using the already verified restricted reader
or another approved read-only catalog session.

It does not create roles, grant or revoke privileges, create temporary tables, write
data, change session role, or inspect customer rows. It returns zero or more STOP rows
and a PASS summary only when no violation exists.

## 2. Exact SQL

SQL SHA-256:

`247eef5df0de0ccab035fca10f768559addc33e0384b996cefa120ae3c14d4c6`

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

WITH expected_tables(table_name, table_privileges, column_privileges) AS (
  VALUES
  ('accommodation_guest_profiles', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('accommodation_units', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('activities', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('agent_actions', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('ai_accounting_outbox', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_inference_jobs', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_local_deployments', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('ai_local_recipient_approvals', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('ai_visibility_citations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_visibility_competitor_mentions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_visibility_competitors', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_visibility_observations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_visibility_prompts', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('ai_worker_claim_receipts', ARRAY['SELECT','INSERT','DELETE']::text[], '{}'::jsonb),
  ('ai_worker_principals', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('ai_worker_provisioning_receipts', ARRAY['SELECT']::text[], '{"INSERT":["nonce","fingerprint","window_id","operation","outcome"],"UPDATE":["outcome","worker_id","deployment_id","completed_at"]}'::jsonb),
  ('aida_conversations', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('app_installations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('audit_logs', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('business_knowledge_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('business_knowledge_links', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('business_knowledge_sources', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_invoices', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_payment_requests', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_payments', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_products', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_quotes', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_refunds', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commerce_subscriptions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commercial_leases', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('commercial_properties', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('communication_agents', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('communication_messages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('communication_sessions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('communication_usages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('companies', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('contacts', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('customer_partner_attributions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('delivery_blockers', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('delivery_milestones', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('delivery_projects', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('delivery_tasks', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('dreamscape_customer_links', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('dreamscape_webhook_events', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('finance_applications', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('growth_prospect_audits', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('growth_prospect_engagements', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('growth_prospect_reports', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('growth_prospects', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('infrastructure_domains', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('leads', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('memberships', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('notifications', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('opportunities', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('org_communications', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('org_documents', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('organisations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('partner_commission_events', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('partner_commissions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('partner_referrals', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('partners', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('payment_connector_installations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('platform_api_keys', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('platform_checkout_admission_audit', ARRAY['SELECT']::text[], '{}'::jsonb),
  ('platform_checkout_admissions', ARRAY['SELECT']::text[], '{"UPDATE":["attempt_id"]}'::jsonb),
  ('platform_checkout_attempts', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('platform_checkout_creation_gate', ARRAY['SELECT']::text[], '{"UPDATE":["last_admission_expires_at"]}'::jsonb),
  ('platform_referral_ledger', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('platform_referrals', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('platform_subscription_events', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb),
  ('platform_subscriptions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('pm_leases', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('pm_maintenance_requests', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('pm_properties', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('properties', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('service_jobs', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('stay_bookings', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('stripe_webhook_receipts', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb),
  ('support_conversations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('support_messages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('tasks', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('website_pages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb),
  ('websites', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb)
),
expected_excluded(relation_name) AS (
  VALUES
  ('_prisma_migrations'),
  ('playing_with_neon')
),
expected_sequences(sequence_name, sequence_privileges) AS (
  VALUES
  ('support_messages_id_seq', ARRAY['USAGE','SELECT']::text[])
),
denied_sequences(sequence_name) AS (
  VALUES
  ('platform_checkout_admission_audit_id_seq'),
  ('playing_with_neon_id_seq')
),
expected_functions(function_name, must_not_execute) AS (
  VALUES
  ('audit_platform_checkout_admission', true),
  ('preserve_checkout_admission_audit', true),
  ('ai_accounting_outbox_job_scope_check', false),
  ('ai_inference_jobs_terminal_immutable', false),
  ('ai_inference_jobs_completion_deadline_check', false)
),
parameters(runtime_role) AS (
  VALUES (:'runtime_role'::text)
),
role_info AS (
  SELECT r.oid, r.rolname, r.rolsuper, r.rolcreaterole, r.rolcreatedb,
         r.rolreplication, r.rolbypassrls, r.rolcanlogin
  FROM pg_catalog.pg_roles r
  JOIN parameters p ON p.runtime_role = r.rolname
),
all_table_privileges(p) AS (
  VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER'),('MAINTAIN')
),
all_column_privileges(p) AS (
  VALUES ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')
),
violations AS (
  SELECT 'role'::text AS category, 'runtime role is absent'::text AS finding
  FROM parameters p
  WHERE NOT EXISTS (SELECT 1 FROM role_info)
  UNION ALL
  SELECT 'role', 'unsafe role attributes'
  FROM role_info
  WHERE rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR rolbypassrls OR NOT rolcanlogin
  UNION ALL
  SELECT 'role', 'runtime role has a membership'
  FROM role_info ri
  WHERE EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members am WHERE am.member = ri.oid)
  UNION ALL
  SELECT 'role', 'runtime role owns a public relation'
  FROM role_info ri
  WHERE EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','p','v','m','S','f')
      AND pg_catalog.pg_has_role(ri.oid, c.relowner, 'MEMBER')
  )
  UNION ALL
  SELECT 'role', 'runtime role owns a public function'
  FROM role_info ri
  WHERE EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND pg_catalog.pg_has_role(ri.oid, p.proowner, 'MEMBER')
  )
  UNION ALL
  SELECT 'role', 'runtime role owns schema public'
  FROM role_info ri
  WHERE EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace n
    WHERE n.nspname = 'public'
      AND pg_catalog.pg_has_role(ri.oid, n.nspowner, 'MEMBER')
  )
  UNION ALL
  SELECT 'role', 'runtime role has schema CREATE'
  FROM role_info ri
  WHERE pg_catalog.has_schema_privilege(ri.oid, 'public', 'CREATE')
  UNION ALL
  SELECT 'role', 'runtime role has database CREATE'
  FROM role_info ri
  WHERE pg_catalog.has_database_privilege(ri.oid, current_database(), 'CREATE')
  UNION ALL
  SELECT 'role', 'runtime role lacks schema USAGE'
  FROM role_info ri
  WHERE NOT pg_catalog.has_schema_privilege(ri.oid, 'public', 'USAGE')
  UNION ALL
  SELECT 'role', 'runtime role can grant schema USAGE'
  FROM role_info ri
  WHERE pg_catalog.has_schema_privilege(ri.oid, 'public', 'USAGE WITH GRANT OPTION')
  UNION ALL
  SELECT 'role', 'runtime role lacks database CONNECT'
  FROM role_info ri
  WHERE NOT pg_catalog.has_database_privilege(ri.oid, current_database(), 'CONNECT')
  UNION ALL
  SELECT 'role', 'runtime role can grant database CONNECT'
  FROM role_info ri
  WHERE pg_catalog.has_database_privilege(ri.oid, current_database(), 'CONNECT WITH GRANT OPTION')
  UNION ALL
  SELECT 'table', 'expected table is absent: ' || e.table_name
  FROM expected_tables e
  WHERE pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)) IS NULL
  UNION ALL
  SELECT 'table', 'missing ' || p.p || ' on ' || e.table_name
  FROM expected_tables e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)))::oid
  CROSS JOIN LATERAL unnest(e.table_privileges) AS p(p)
  WHERE NOT pg_catalog.has_table_privilege(ri.oid, c.oid, p.p)
  UNION ALL
  SELECT 'table', 'unexpected ' || p.p || ' on ' || e.table_name
  FROM expected_tables e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)))::oid
  CROSS JOIN all_table_privileges p
  WHERE NOT (p.p = ANY(e.table_privileges))
    AND pg_catalog.has_table_privilege(ri.oid, c.oid, p.p)
  UNION ALL
  SELECT 'table', 'grant option ' || p.p || ' on ' || e.table_name
  FROM expected_tables e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)))::oid
  CROSS JOIN all_table_privileges p
  WHERE pg_catalog.has_table_privilege(ri.oid, c.oid, p.p || ' WITH GRANT OPTION')
  UNION ALL
  SELECT 'column', 'missing ' || cp.p || ' on ' || e.table_name || '.' || a.attname
  FROM expected_tables e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)))::oid
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  CROSS JOIN all_column_privileges cp
  WHERE (cp.p = ANY(e.table_privileges) OR COALESCE(((e.column_privileges -> cp.p) ? a.attname), false))
    AND NOT pg_catalog.has_column_privilege(ri.oid, c.oid, a.attnum, cp.p)
  UNION ALL
  SELECT 'column', 'unexpected ' || cp.p || ' on ' || e.table_name || '.' || a.attname
  FROM expected_tables e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)))::oid
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  CROSS JOIN all_column_privileges cp
  WHERE NOT (cp.p = ANY(e.table_privileges) OR COALESCE(((e.column_privileges -> cp.p) ? a.attname), false))
    AND pg_catalog.has_column_privilege(ri.oid, c.oid, a.attnum, cp.p)
  UNION ALL
  SELECT 'column', 'column grant option ' || cp.p || ' on ' || e.table_name || '.' || a.attname
  FROM expected_tables e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.table_name)))::oid
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  CROSS JOIN all_column_privileges cp
  WHERE pg_catalog.has_column_privilege(ri.oid, c.oid, a.attnum, cp.p || ' WITH GRANT OPTION')
  UNION ALL
  SELECT 'excluded', 'table privilege ' || p.p || ' on excluded relation ' || e.relation_name
  FROM expected_excluded e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.relation_name)))::oid
  CROSS JOIN all_table_privileges p
  WHERE pg_catalog.has_table_privilege(ri.oid, c.oid, p.p)
  UNION ALL
  SELECT 'excluded', 'column privilege ' || cp.p || ' on excluded relation ' || e.relation_name || '.' || a.attname
  FROM expected_excluded e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.relation_name)))::oid
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  CROSS JOIN all_column_privileges cp
  WHERE pg_catalog.has_column_privilege(ri.oid, c.oid, a.attnum, cp.p)
  UNION ALL
  SELECT 'excluded', 'column grant option ' || cp.p || ' on excluded relation ' || e.relation_name || '.' || a.attname
  FROM expected_excluded e
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', e.relation_name)))::oid
  JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  CROSS JOIN all_column_privileges cp
  WHERE pg_catalog.has_column_privilege(ri.oid, c.oid, a.attnum, cp.p || ' WITH GRANT OPTION')
  UNION ALL
  SELECT 'sequence', 'expected sequence is absent: ' || s.sequence_name
  FROM expected_sequences s
  WHERE pg_catalog.to_regclass(pg_catalog.format('public.%I', s.sequence_name)) IS NULL
  UNION ALL
  SELECT 'sequence', 'missing ' || p.p || ' on sequence ' || s.sequence_name
  FROM expected_sequences s
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', s.sequence_name)))::oid
  CROSS JOIN LATERAL unnest(s.sequence_privileges) AS p(p)
  WHERE NOT pg_catalog.has_sequence_privilege(ri.oid, c.oid, p.p)
  UNION ALL
  SELECT 'sequence', 'unexpected ' || p.p || ' on sequence ' || s.sequence_name
  FROM expected_sequences s
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', s.sequence_name)))::oid
  CROSS JOIN (VALUES ('USAGE'),('SELECT'),('UPDATE')) p(p)
  WHERE NOT (p.p = ANY(s.sequence_privileges))
    AND pg_catalog.has_sequence_privilege(ri.oid, c.oid, p.p)
  UNION ALL
  SELECT 'sequence', 'grant option ' || p.p || ' on sequence ' || s.sequence_name
  FROM expected_sequences s
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', s.sequence_name)))::oid
  CROSS JOIN (VALUES ('USAGE'),('SELECT'),('UPDATE')) p(p)
  WHERE pg_catalog.has_sequence_privilege(ri.oid, c.oid, p.p || ' WITH GRANT OPTION')
  UNION ALL
  SELECT 'sequence', 'privilege ' || p.p || ' on denied sequence ' || s.sequence_name
  FROM denied_sequences s
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', s.sequence_name)))::oid
  CROSS JOIN (VALUES ('USAGE'),('SELECT'),('UPDATE')) p(p)
  WHERE pg_catalog.has_sequence_privilege(ri.oid, c.oid, p.p)
  UNION ALL
  SELECT 'sequence', 'grant option ' || p.p || ' on denied sequence ' || s.sequence_name
  FROM denied_sequences s
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_class c ON c.oid = (pg_catalog.to_regclass(pg_catalog.format('public.%I', s.sequence_name)))::oid
  CROSS JOIN (VALUES ('USAGE'),('SELECT'),('UPDATE')) p(p)
  WHERE pg_catalog.has_sequence_privilege(ri.oid, c.oid, p.p || ' WITH GRANT OPTION')
  UNION ALL
  SELECT 'function', 'expected function is absent: ' || f.function_name
  FROM expected_functions f
  WHERE pg_catalog.to_regprocedure(pg_catalog.format('public.%I()', f.function_name)) IS NULL
  UNION ALL
  SELECT 'function', 'no-execute function is executable: ' || f.function_name
  FROM expected_functions f
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_proc p ON p.oid = (pg_catalog.to_regprocedure(pg_catalog.format('public.%I()', f.function_name)))::oid
  WHERE f.must_not_execute
    AND pg_catalog.has_function_privilege(ri.oid, p.oid, 'EXECUTE')
  UNION ALL
  SELECT 'function', 'no-execute function has grant option: ' || f.function_name
  FROM expected_functions f
  JOIN role_info ri ON true
  JOIN pg_catalog.pg_proc p ON p.oid = (pg_catalog.to_regprocedure(pg_catalog.format('public.%I()', f.function_name)))::oid
  WHERE f.must_not_execute
    AND pg_catalog.has_function_privilege(ri.oid, p.oid, 'EXECUTE WITH GRANT OPTION')
  UNION ALL
  SELECT 'function', 'runtime can execute a public SECURITY DEFINER function: ' || p.oid::regprocedure::text
  FROM pg_catalog.pg_proc p
  JOIN role_info ri ON true
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.prosecdef
    AND pg_catalog.has_function_privilege(ri.oid, p.oid, 'EXECUTE')
  UNION ALL
  SELECT 'function', 'runtime can execute an unexpected public function: ' || p.oid::regprocedure::text
  FROM pg_catalog.pg_proc p
  JOIN role_info ri ON true
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname NOT IN (SELECT function_name FROM expected_functions)
    AND pg_catalog.has_function_privilege(ri.oid, p.oid, 'EXECUTE')
  UNION ALL
  SELECT 'object', 'unexpected public relation: ' || c.relname
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r','p','v','m','f')
    AND c.relname NOT IN (SELECT table_name FROM expected_tables)
    AND c.relname NOT IN (SELECT relation_name FROM expected_excluded)
  UNION ALL
  SELECT 'object', 'unexpected public sequence: ' || c.relname
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'S'
    AND c.relname NOT IN (SELECT sequence_name FROM expected_sequences)
    AND c.relname NOT IN (SELECT sequence_name FROM denied_sequences)
)
SELECT category, finding, 'STOP' AS status
FROM violations
UNION ALL
SELECT 'summary', 'runtime permissions match the approved manifest', 'PASS'
WHERE NOT EXISTS (SELECT 1 FROM violations)
ORDER BY status, category, finding;

COMMIT;

```

## 3. Privilege coverage matrix

| Coverage area | Expected/checked |
| --- | --- |
| Runtime role | One named role; LOGIN; no SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS |
| Memberships | None; any `pg_auth_members` membership is STOP |
| Ownership | No ownership of public relations, functions or schema public |
| Database/schema | CONNECT and public USAGE required; no CREATE; no grant options on CONNECT/USAGE |
| Tables | 83 manifest tables; exact allowed privileges and no others |
| Table privilege groups | See grouped counts below |
| Columns | Table-level privileges cover all columns; explicit column privileges only where certified; no column grant options |
| Provisioning receipts | SELECT; INSERT(nonce,fingerprint,window_id,operation,outcome); UPDATE(outcome,worker_id,deployment_id,completed_at) |
| Admission tables | SELECT; UPDATE(attempt_id) on admissions; audit SELECT only; gate UPDATE(last_admission_expires_at) only |
| Sequences | `support_messages_id_seq` USAGE+SELECT only; two denied sequences with zero privileges; no unexpected public sequence |
| Excluded relations | `_prisma_migrations` and `playing_with_neon` with zero table/column privileges |
| Functions | Five expected functions; two no-execute functions; three trigger-only; no executable public SECURITY DEFINER; no unexpected executable public function |
| Unexpected objects | No unclassified public table/view/materialized view/foreign table |
| Grant options | None on tables, columns, sequences, functions, schema or database |
| Role visibility | The target role must be independently confirmed; missing role is STOP |

Table privilege groups:

| Allowed table privileges | Count |
| --- | --- |
| `SELECT` | 4 |
| `SELECT+INSERT` | 7 |
| `SELECT+INSERT+DELETE` | 1 |
| `SELECT+INSERT+UPDATE` | 8 |
| `SELECT+INSERT+UPDATE+DELETE` | 63 |

The SQL contains the complete per-table expected list and column restrictions; this
matrix is a summary, not a replacement.

## 4. STOP conditions

Any of the following is a STOP; do not repair or broaden privileges during this review:

- Target role is absent, is an owner/admin role, cannot log in, or has any membership.
- Target role owns or inherits ownership of any public relation, function or schema.
- Target role has schema/database CREATE or any grant option.
- Missing or unexpected table, column, sequence or function privilege.
- Any privilege on `_prisma_migrations`, `playing_with_neon` or their columns/sequence.
- Any executable public SECURITY DEFINER function.
- Any unexpected executable public function.
- Any unexpected public relation or sequence not covered by the manifest.
- Any catalog visibility limitation, query error, timeout, ambiguous output or
  inability to read the target role's effective privileges.
- Any session identity/TLS/database mismatch or any need for elevated credentials.

## 5. Safe attended procedure

1. Owner/operator independently confirms the exact serving runtime role name. Do not
   infer it from the candidate, prior reports or default names.
2. Use an approved restricted read-only catalog session (for example the verified
   `dg_preflight_reader`), with verified project/branch/database, TLS and session
   identity. Do not use `neondb_owner` or an elevated credential.
3. Confirm the target role is not the session role unless the serving role is itself
   the approved read-only operator. Never `SET ROLE`.
4. Run the SQL once in a read-only transaction using psql with the target role supplied
   as a variable and the credential source supplied privately:

```text
PGPASSFILE=<approved-private-path> psql -X -v ON_ERROR_STOP=1   -v runtime_role=<independently-confirmed-runtime-role>   -f <approved-supplement.sql>
```

5. Treat any `STOP` row as a failed review. A single `PASS` summary row is valid only
   when there are no STOP rows.
6. Capture only category, finding and status. Do not publish customer data, secrets,
   connection strings or raw catalog dumps.
7. Stop without making changes if any condition in section 4 occurs.

## 6. Relationship to existing verifier

This supplement is additive. It does not replace `runtime-role-verify.sql`, does not
weaken any existing assertion, and does not authorise role creation, grants, credential
cutover, deployment or checkout activation. The existing verifier remains the
administrative acceptance test; this supplement provides an attended, SELECT-only
cross-check using the verified restricted reader.

## 7. Handoff

- Supplement SQL SHA-256: `247eef5df0de0ccab035fca10f768559addc33e0384b996cefa120ae3c14d4c6`
- No SQL was executed, no credential was accessed and no Production change was made.
- Owner approval is required before any attended execution.
