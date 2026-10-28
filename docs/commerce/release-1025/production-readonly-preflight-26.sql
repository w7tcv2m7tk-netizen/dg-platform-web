\set ON_ERROR_STOP on
\pset pager off

BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '10s';
SET LOCAL search_path = pg_catalog, public;

-- Read-only transaction and operator identity.
SELECT current_database() AS database_name,
       current_user AS operator_role,
       session_user AS session_role,
       current_setting('transaction_read_only') AS transaction_read_only;
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
FROM pg_roles
WHERE rolname = current_user;
SELECT r.rolname AS reachable_role
FROM pg_roles r
WHERE pg_has_role(current_user, r.oid, 'MEMBER')
ORDER BY r.rolname;
SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_schema,
       has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_database,
       has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_schema,
       has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect;

-- Migration ledger: exact 26-row baseline and completion state.
SELECT id,
       migration_name,
       checksum,
       applied_steps_count,
       started_at::text AS started_at,
       finished_at::text AS finished_at,
       rolled_back_at::text AS rolled_back_at,
       (logs IS NULL) AS logs_null,
       md5(coalesce(logs, '')) AS logs_fingerprint
FROM public._prisma_migrations
ORDER BY migration_name;
SELECT count(*)::int AS total,
       count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS finished,
       count(*) FILTER (WHERE finished_at IS NULL)::int AS unfinished,
       count(*) FILTER (WHERE rolled_back_at IS NOT NULL)::int AS rolled_back,
       count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
                         AND migration_name = '20261027_single_use_checkout_admission')::int AS admission_finished
FROM public._prisma_migrations;

-- Singleton checkout gate.
SELECT id,
       blocked,
       subscription_webhooks_held,
       revision,
       last_admission_expires_at::text AS last_admission_expires_at
FROM public.platform_checkout_creation_gate
WHERE id = 1;

-- Subscription and purchase aggregates only; no customer identifiers.
SELECT count(*)::int AS subscriptions,
       count(*) FILTER (WHERE platform_exempt)::int AS exemptions,
       count(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
       count(*) FILTER (WHERE status = 'TRIALING')::int AS trialing,
       count(*) FILTER (WHERE entitlement = 'FULL')::int AS full_entitlement,
       count(*) FILTER (WHERE cardinality(industry_apps) > 0)::int AS with_industry_apps,
       count(*) FILTER (WHERE cardinality(premium_apps) > 0)::int AS with_premium_apps
FROM public.platform_subscriptions;
SELECT status, entitlement, count(*)::int AS subscriptions
FROM public.platform_subscriptions
GROUP BY status, entitlement
ORDER BY status, entitlement;
SELECT type, count(*)::int AS events
FROM public.platform_subscription_events
GROUP BY type
ORDER BY type;

-- Checkout attempt, admission, audit and webhook receipt aggregates.
SELECT state, count(*)::int AS attempts
FROM public.platform_checkout_attempts
GROUP BY state
ORDER BY state;
SELECT count(*)::int AS admissions,
       count(*) FILTER (WHERE revoked_at IS NOT NULL)::int AS revoked,
       count(*) FILTER (WHERE attempt_id IS NOT NULL)::int AS bound
FROM public.platform_checkout_admissions;
SELECT count(*)::int AS audit_rows
FROM public.platform_checkout_admission_audit;
SELECT status, count(*)::int AS receipts
FROM public.stripe_webhook_receipts
GROUP BY status
ORDER BY status;

-- Relevant schema objects: indexes, constraints, columns.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('platform_checkout_attempts',
                    'platform_checkout_creation_gate',
                    'platform_checkout_admissions',
                    'platform_checkout_admission_audit')
ORDER BY tablename, indexname;
SELECT conrelid::regclass::text AS table_name,
       conname,
       contype,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.platform_checkout_attempts'::regclass,
                   'public.platform_checkout_creation_gate'::regclass,
                   'public.platform_checkout_admissions'::regclass,
                   'public.platform_checkout_admission_audit'::regclass)
ORDER BY conrelid::regclass::text, conname;
SELECT table_name,
       column_name,
       data_type,
       udt_name,
       column_default,
       is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('platform_checkout_attempts',
                     'platform_checkout_creation_gate',
                     'platform_checkout_admissions',
                     'platform_checkout_admission_audit',
                     'platform_subscriptions')
ORDER BY table_name, ordinal_position;

-- Admission functions and triggers (metadata only; no function bodies).
SELECT p.oid::regprocedure::text AS function_name,
       p.prosecdef,
       p.proowner::regrole::text AS owner,
       p.proconfig
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('audit_platform_checkout_admission',
                    'preserve_checkout_admission_audit')
ORDER BY p.oid::regprocedure::text;
SELECT tgname,
       tgrelid::regclass::text AS table_name,
       pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid IN ('public.platform_checkout_admissions'::regclass,
                  'public.platform_checkout_admission_audit'::regclass)
ORDER BY tgrelid::regclass::text, tgname;
SELECT sequencename, last_value
FROM pg_sequences
WHERE schemaname = 'public'
  AND sequencename = 'platform_checkout_admission_audit_id_seq';

-- Relevant lock visibility; no activity/query text.
SELECT l.locktype,
       l.mode,
       l.granted,
       count(*)::int AS lock_count
FROM pg_locks l
JOIN pg_class c ON c.oid = l.relation
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('platform_checkout_attempts',
                    'platform_checkout_creation_gate',
                    'platform_checkout_admissions',
                    'platform_checkout_admission_audit')
GROUP BY l.locktype, l.mode, l.granted
ORDER BY l.locktype, l.mode, l.granted;

COMMIT;
