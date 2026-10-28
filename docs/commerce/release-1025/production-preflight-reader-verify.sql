-- DigitalGate Stage 2D — dg_preflight_reader independent privilege verification
--
-- Run as the Production database owner (neondb_owner) or an approved admin.
-- Do not run as dg_preflight_reader. This checks effective privileges for the
-- reader role without using SET ROLE and without simulating the reader.
--
-- This is a read-only verification. It does not grant, revoke, alter or write.

BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';

DO $dg_preflight_reader_verify$
DECLARE
  v_oid oid;
  v_role pg_roles%ROWTYPE;
  v_allowed text[] := ARRAY[
    '_prisma_migrations',
    'platform_checkout_creation_gate',
    'platform_subscriptions',
    'platform_subscription_events',
    'platform_checkout_attempts',
    'platform_checkout_admissions',
    'platform_checkout_admission_audit',
    'stripe_webhook_receipts'
  ];
  v_table record;
  v_sequence record;
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

  IF has_schema_privilege(v_oid, 'public', 'CREATE')
     OR has_database_privilege(v_oid, current_database(), 'CREATE') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role has CREATE authority';
  END IF;

  IF NOT has_database_privilege(v_oid, current_database(), 'CONNECT') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role lacks CONNECT';
  END IF;

  IF NOT has_schema_privilege(v_oid, 'public', 'USAGE') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role lacks schema USAGE';
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

  IF EXISTS (
    SELECT 1
    FROM unnest(v_allowed) AS expected(name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = expected.name
        AND c.relkind IN ('r','p')
    )
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: an approved table is missing or is not an ordinary/partitioned table';
  END IF;

  FOR v_table IN
    SELECT c.oid, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r','p','v','m','f')
  LOOP
    IF v_table.relname = ANY(v_allowed) THEN
      IF NOT has_table_privilege(v_oid, v_table.oid, 'SELECT') THEN
        RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: allowed table lacks SELECT: %', v_table.relname;
      END IF;
    ELSE
      IF has_table_privilege(v_oid, v_table.oid, 'SELECT')
         OR has_any_column_privilege(v_oid, v_table.oid, 'SELECT') THEN
        RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: unexpected SELECT on %', v_table.relname;
      END IF;
    END IF;

    IF has_table_privilege(v_oid, v_table.oid, 'INSERT')
       OR has_table_privilege(v_oid, v_table.oid, 'UPDATE')
       OR has_table_privilege(v_oid, v_table.oid, 'DELETE')
       OR has_table_privilege(v_oid, v_table.oid, 'TRUNCATE')
       OR has_table_privilege(v_oid, v_table.oid, 'TRIGGER')
       OR has_table_privilege(v_oid, v_table.oid, 'REFERENCES')
       OR has_any_column_privilege(v_oid, v_table.oid, 'INSERT')
       OR has_any_column_privilege(v_oid, v_table.oid, 'UPDATE')
       OR has_any_column_privilege(v_oid, v_table.oid, 'REFERENCES') THEN
      RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: write-capable privilege on %', v_table.relname;
    END IF;

    IF v_table.relname = ANY(v_allowed)
       AND (v_table.relrowsecurity OR v_table.relforcerowsecurity) THEN
      RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: target table has RLS; aggregate capture may be filtered: %', v_table.relname;
    END IF;
  END LOOP;

  FOR v_sequence IN
    SELECT c.oid, c.relname
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'S'
  LOOP
    IF has_sequence_privilege(v_oid, v_sequence.oid, 'USAGE')
       OR has_sequence_privilege(v_oid, v_sequence.oid, 'UPDATE') THEN
      RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: sequence allocation privilege on %', v_sequence.relname;
    END IF;
    IF has_sequence_privilege(v_oid, v_sequence.oid, 'SELECT') THEN
      RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: unexpected sequence SELECT on %', v_sequence.relname;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.prosecdef
      AND has_function_privilege(v_oid, p.oid, 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role can execute a SECURITY DEFINER function in any schema';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE a.grantee IN (0, v_oid)
  ) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: default ACL grants new objects to the reader or PUBLIC';
  END IF;
END
$dg_preflight_reader_verify$;

SELECT rolname,
       rolcanlogin,
       rolsuper,
       rolcreatedb,
       rolcreaterole,
       rolreplication,
       rolbypassrls,
       rolinherit
FROM pg_roles
WHERE rolname = 'dg_preflight_reader';

SELECT has_database_privilege('dg_preflight_reader', current_database(), 'CONNECT') AS can_connect,
       has_database_privilege('dg_preflight_reader', current_database(), 'TEMP') AS has_public_temp,
       has_schema_privilege('dg_preflight_reader', 'public', 'USAGE') AS can_use_schema,
       has_schema_privilege('dg_preflight_reader', 'public', 'CREATE') AS can_create_schema,
       has_database_privilege('dg_preflight_reader', current_database(), 'CREATE') AS can_create_database;

SELECT count(*) FILTER (WHERE p.prosecdef) AS executable_security_definer_functions,
       count(*) FILTER (WHERE NOT p.prosecdef) AS executable_invoker_functions
FROM pg_proc p
WHERE has_function_privilege('dg_preflight_reader', p.oid, 'EXECUTE');

COMMIT;

SELECT 'dg_preflight_reader_verified' AS result;
