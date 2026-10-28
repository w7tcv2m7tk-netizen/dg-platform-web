-- DigitalGate Stage 2D — dg_preflight_reader privilege grants
--
-- Run only after the role has been created with SQL using
-- production-preflight-reader-create.sql in the Neon SQL Editor or psql.
-- Do not use the Neon Console "Add role", CLI or API create flow.
-- Run as the Production database owner (neondb_owner) or an approved
-- owner/admin with grant authority. Do not run as dg_preflight_reader.
--
-- This file does not create the role, set a password, change application
-- runtime credentials, or grant access to unrelated customer tables.
--
-- No sequence grant is included. The Stage 2C capture can read the sequence
-- row through pg_sequences, but last_value will be NULL without sequence
-- SELECT. The certified verifier does not consume that field. A non-null
-- value would require separate approval for SELECT (not USAGE or UPDATE)
-- on only platform_checkout_admission_audit_id_seq.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

DO $dg_preflight_reader_grants_precheck$
DECLARE
  v_oid oid;
  v_role pg_roles%ROWTYPE;
BEGIN
  SELECT * INTO v_role FROM pg_roles WHERE rolname = 'dg_preflight_reader';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: dg_preflight_reader does not exist';
  END IF;

  v_oid := v_role.oid;

  IF NOT v_role.rolcanlogin
     OR v_role.rolinherit
     OR v_role.rolsuper
     OR v_role.rolcreatedb
     OR v_role.rolcreaterole
     OR v_role.rolreplication
     OR v_role.rolbypassrls THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role has unsafe attributes or cannot log in';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = v_oid) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role has a membership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.oid <> v_oid
      AND pg_has_role(v_oid, r.oid, 'MEMBER')
      AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls)
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role inherits an elevated role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','p','v','m','S','f')
      AND pg_has_role(v_oid, c.relowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role owns a public relation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND pg_has_role(v_oid, p.proowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role owns a public function';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_namespace n
    WHERE n.nspname = 'public'
      AND pg_has_role(v_oid, n.nspowner, 'MEMBER')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role owns schema public';
  END IF;

  IF has_schema_privilege(v_oid, 'public', 'CREATE')
     OR has_database_privilege(v_oid, current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role has CREATE authority';
  END IF;
END
$dg_preflight_reader_grants_precheck$;

-- Clear direct table-level, column-level, sequence, function and
-- schema/database grants that may have been added outside this procedure.
-- PUBLIC privileges are not altered by these statements and are checked by
-- the independent verifier.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM dg_preflight_reader;

DO $dg_preflight_reader_revoke_columns$
DECLARE
  v_relation record;
BEGIN
  FOR v_relation IN
    SELECT c.oid::regclass AS relation_name,
           string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) AS columns
    FROM pg_class c
    JOIN pg_attribute a
      ON a.attrelid = c.oid
     AND a.attnum > 0
     AND NOT a.attisdropped
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','p','v','m','f')
    GROUP BY c.oid
  LOOP
    EXECUTE format(
      'REVOKE SELECT (%s), INSERT (%s), UPDATE (%s), REFERENCES (%s) ON TABLE %s FROM dg_preflight_reader',
      v_relation.columns, v_relation.columns, v_relation.columns, v_relation.columns,
      v_relation.relation_name
    );
  END LOOP;
END
$dg_preflight_reader_revoke_columns$;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM dg_preflight_reader;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM dg_preflight_reader;
REVOKE CREATE ON SCHEMA public FROM dg_preflight_reader;

DO $dg_preflight_reader_database_privileges$
BEGIN
  EXECUTE format(
    'REVOKE ALL PRIVILEGES ON DATABASE %I FROM dg_preflight_reader',
    current_database()
  );
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO dg_preflight_reader',
    current_database()
  );
END
$dg_preflight_reader_database_privileges$;

GRANT USAGE ON SCHEMA public TO dg_preflight_reader;

-- Named objects only. These are the tables read by the certified Stage 2C
-- capture. No customer/CRM, identity, prospecting, website, commerce or AI
-- tables are included.
GRANT SELECT ON TABLE
  public._prisma_migrations,
  public.platform_checkout_creation_gate,
  public.platform_subscriptions,
  public.platform_subscription_events,
  public.platform_checkout_attempts,
  public.platform_checkout_admissions,
  public.platform_checkout_admission_audit,
  public.stripe_webhook_receipts
TO dg_preflight_reader;

COMMIT;

SELECT 'dg_preflight_reader_grants_applied' AS result;
