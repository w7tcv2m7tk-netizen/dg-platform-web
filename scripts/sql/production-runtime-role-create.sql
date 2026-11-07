-- PROPOSED operator operation. Never execute without separate owner approval.
-- Creates the single non-owner LOGIN role only. No password is set here.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
DO $role_precheck$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='dg_app_runtime') THEN
    RAISE EXCEPTION 'dg_app_runtime already exists';
  END IF;
END
$role_precheck$;
CREATE ROLE dg_app_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
DO $role_postcheck$
DECLARE
  v_role pg_catalog.pg_roles%ROWTYPE;
BEGIN
  SELECT * INTO v_role FROM pg_catalog.pg_roles WHERE rolname='dg_app_runtime';
  IF NOT FOUND OR NOT v_role.rolcanlogin OR v_role.rolsuper OR v_role.rolcreaterole OR v_role.rolcreatedb OR v_role.rolreplication OR v_role.rolbypassrls OR v_role.rolinherit THEN
    RAISE EXCEPTION 'dg_app_runtime attributes are not safe';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members WHERE member=v_role.oid) THEN
    RAISE EXCEPTION 'dg_app_runtime has a role membership';
  END IF;
END
$role_postcheck$;
SELECT 'runtime_role_created' AS result;
COMMIT;
