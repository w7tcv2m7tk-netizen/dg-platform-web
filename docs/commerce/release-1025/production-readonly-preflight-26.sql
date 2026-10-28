\set ON_ERROR_STOP on
\pset pager off

BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';
SET LOCAL idle_in_transaction_session_timeout = '10s';
SET LOCAL search_path = pg_catalog, public;

-- Fail closed before any evidence output if the operator or expected state is unsafe.
DO $dg_preflight_gate$
DECLARE
  v_role pg_roles%ROWTYPE;
  v_oid oid;
  v_total integer;
BEGIN
  IF current_setting('transaction_read_only') <> 'on' THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: transaction is not read-only';
  END IF;
  IF current_user <> session_user THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: SET ROLE/session identity mismatch';
  END IF;
  SELECT * INTO v_role FROM pg_roles WHERE rolname = current_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: current role is not registered';
  END IF;
  v_oid := v_role.oid;
  IF v_role.rolsuper OR v_role.rolcreaterole OR v_role.rolcreatedb OR v_role.rolreplication OR v_role.rolbypassrls THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator has elevated role attributes';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.oid <> v_oid
      AND pg_has_role(v_oid, r.oid, 'MEMBER')
      AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator inherits an elevated role';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','p','v','m','S','f')
      AND pg_has_role(v_oid, c.relowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator owns a public relation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND pg_has_role(v_oid, p.proowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator owns a public function';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_namespace n
    WHERE n.nspname = 'public'
      AND pg_has_role(v_oid, n.nspowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator owns schema public';
  END IF;
  IF has_schema_privilege(v_oid, 'public', 'CREATE') OR has_database_privilege(v_oid, current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator has CREATE authority';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','p','v','m','f')
      AND (has_table_privilege(v_oid, c.oid, 'INSERT')
        OR has_table_privilege(v_oid, c.oid, 'UPDATE')
        OR has_table_privilege(v_oid, c.oid, 'DELETE')
        OR has_table_privilege(v_oid, c.oid, 'TRUNCATE')
        OR has_table_privilege(v_oid, c.oid, 'TRIGGER')
        OR has_table_privilege(v_oid, c.oid, 'REFERENCES'))
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator has write-capable table authority';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'S'
      AND (has_sequence_privilege(v_oid, c.oid, 'USAGE')
        OR has_sequence_privilege(v_oid, c.oid, 'UPDATE'))
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: operator has sequence allocation authority';
  END IF;

  SELECT count(*) INTO v_total FROM public._prisma_migrations;
  IF v_total <> 26 THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: expected exactly 26 migration rows, found %', v_total;
  END IF;
  IF (SELECT count(*) FROM (SELECT migration_name FROM public._prisma_migrations GROUP BY migration_name HAVING count(*) > 1) d) > 0 THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: duplicate migration identity';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL) > 0 THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: unfinished or rolled-back migration';
  END IF;
  IF (SELECT count(*) FROM public._prisma_migrations WHERE migration_name = '20261027_single_use_checkout_admission') <> 1 THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: certified admission migration is missing or duplicated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public._prisma_migrations
    WHERE migration_name = '20261027_single_use_checkout_admission'
      AND checksum = 'a60c03ab49b4b1969e52c4edccb06f73117faac577271400c63eea9e2ec472f6'
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: certified admission checksum mismatch';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_checkout_creation_gate
    WHERE id = 1 AND blocked = true AND subscription_webhooks_held = false AND revision = 2
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: gate is not blocked at the certified revision';
  END IF;
  IF (SELECT count(*) FROM public.platform_subscriptions) <> 6
     OR (SELECT count(*) FROM public.platform_subscriptions WHERE platform_exempt) <> 6 THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: certified subscription/exemption aggregate changed';
  END IF;
  IF (SELECT count(*) FROM public.platform_checkout_attempts) <> 0
     OR (SELECT count(*) FROM public.platform_checkout_admissions) <> 0
     OR (SELECT count(*) FROM public.platform_checkout_admission_audit) <> 0 THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_STOP: admission/attempt/audit baseline changed';
  END IF;
END
$dg_preflight_gate$;

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
       p.proconfig IS NULL AS proconfig_null,
       coalesce(cardinality(p.proconfig), 0) AS proconfig_entries,
       coalesce(p.proconfig @> ARRAY['search_path=pg_catalog'], false) AS has_pg_catalog_search_path
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

SELECT 'DG_PREFLIGHT_COMPLETE' AS capture_marker;
