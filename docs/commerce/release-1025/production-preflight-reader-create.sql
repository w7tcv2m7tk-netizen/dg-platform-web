-- DigitalGate Stage 2D — dg_preflight_reader creation (no password)
--
-- Run in the Neon SQL Editor or psql on the production branch/database as
-- neondb_owner or an approved owner/admin.
--
-- Do NOT use the Neon Console "Add role", CLI "neon roles create" or API
-- "Create role" flows. Neon grants those roles membership in neon_superuser,
-- which includes CREATEDB, CREATEROLE, BYPASSRLS, pg_read_all_data and
-- pg_write_all_data. SQL-created roles receive only the basic public schema
-- privileges and must be granted access explicitly.
--
-- This file creates the role only. It sets no password and grants no access.
-- Set the password afterwards through the Neon Console "Reset password" action
-- or an approved private credential procedure, then run the separate grants and
-- independent verification files.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

DO $dg_preflight_reader_create_precheck$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dg_preflight_reader') THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: dg_preflight_reader already exists';
  END IF;
END
$dg_preflight_reader_create_precheck$;

CREATE ROLE dg_preflight_reader
  LOGIN
  NOINHERIT
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS;

DO $dg_preflight_reader_create_postcheck$
DECLARE
  v_role pg_roles%ROWTYPE;
BEGIN
  SELECT * INTO v_role FROM pg_roles WHERE rolname = 'dg_preflight_reader';
  IF NOT FOUND
     OR NOT v_role.rolcanlogin
     OR v_role.rolinherit
     OR v_role.rolsuper
     OR v_role.rolcreatedb
     OR v_role.rolcreaterole
     OR v_role.rolreplication
     OR v_role.rolbypassrls THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: created role has unsafe attributes';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member = v_role.oid) THEN
    RAISE EXCEPTION 'DG_PREFLIGHT_READER_STOP: created role has a membership';
  END IF;
END
$dg_preflight_reader_create_postcheck$;

COMMIT;

SELECT 'dg_preflight_reader_created' AS result;
