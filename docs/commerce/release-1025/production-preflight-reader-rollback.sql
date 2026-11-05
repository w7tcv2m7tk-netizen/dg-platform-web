-- DigitalGate Stage 2D — dg_preflight_reader rollback and revocation
--
-- Phase 1 revokes access immediately. Phase 2 drops the role only after
-- confirming no active session and no owned object or default ACL.
--
-- Run as the Production database owner (neondb_owner) or an approved admin.
-- Do not run as dg_preflight_reader. Do not terminate sessions automatically.

-- Phase 1 — immediate revocation. Safe to run independently.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

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
REVOKE USAGE ON SCHEMA public FROM dg_preflight_reader;
REVOKE CREATE ON SCHEMA public FROM dg_preflight_reader;

DO $dg_preflight_reader_database_revoke$
BEGIN
  EXECUTE format(
    'REVOKE ALL PRIVILEGES ON DATABASE %I FROM dg_preflight_reader',
    current_database()
  );
END
$dg_preflight_reader_database_revoke$;

SELECT 'dg_preflight_reader_access_revoked' AS result;
COMMIT;

-- Phase 2 — drop only after a separate safety check. If any check fails,
-- this transaction rolls back and the role remains present but revoked.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

DO $dg_preflight_reader_drop_gate$
DECLARE
  v_oid oid;
BEGIN
  SELECT oid INTO v_oid FROM pg_roles WHERE rolname = 'dg_preflight_reader';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_stat_activity WHERE usename = 'dg_preflight_reader') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: active dg_preflight_reader session; coordinate and retry';
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

  IF EXISTS (SELECT 1 FROM pg_default_acl WHERE defaclrole = v_oid) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: role owns a default ACL entry';
  END IF;
END
$dg_preflight_reader_drop_gate$;

DROP ROLE dg_preflight_reader;
SELECT 'dg_preflight_reader_dropped' AS result;
COMMIT;
