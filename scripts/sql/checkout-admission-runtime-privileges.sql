-- PROPOSED operator operation. Never run against Production without approval.
-- psql -X -v ON_ERROR_STOP=1 -v runtime_role=<existing-nonowner-role> -f <this-file>
-- Does not create roles, retrieve credentials or alter existing table ownership.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
SELECT 1/count(*)::integer AS exactly_one_safe_runtime_role FROM pg_catalog.pg_roles r
WHERE r.rolname=:'runtime_role' AND NOT r.rolsuper AND NOT r.rolcreaterole
 AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls
 AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c
   WHERE c.oid IN ('public.platform_checkout_admissions'::regclass,'public.platform_checkout_admission_audit'::regclass,'public.platform_checkout_creation_gate'::regclass)
     AND pg_catalog.pg_has_role(r.oid,c.relowner,'MEMBER'));
GRANT USAGE ON SCHEMA public TO :"runtime_role";
GRANT SELECT ON public.platform_checkout_admissions,public.platform_checkout_admission_audit TO :"runtime_role";
GRANT UPDATE(attempt_id) ON public.platform_checkout_admissions TO :"runtime_role";
GRANT SELECT ON public.platform_checkout_creation_gate TO :"runtime_role";
GRANT UPDATE(last_admission_expires_at) ON public.platform_checkout_creation_gate TO :"runtime_role";
-- Check a conservative superset of SET-ROLE reachability: ALL role membership,
-- including NOINHERIT membership. Do not trust effective leaf-role grants alone.
WITH reachable AS (
 SELECT r.* FROM pg_catalog.pg_roles r
 WHERE pg_catalog.pg_has_role(:'runtime_role',r.oid,'MEMBER')
), violations AS (
 SELECT r.oid FROM reachable r WHERE
 r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls
 OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c
   WHERE c.oid IN ('public.platform_checkout_admissions'::regclass,
     'public.platform_checkout_admission_audit'::regclass,'public.platform_checkout_creation_gate'::regclass)
   AND pg_catalog.pg_has_role(r.oid,c.relowner,'MEMBER'))
 OR has_table_privilege(r.oid,'public.platform_checkout_admissions','INSERT,DELETE,TRUNCATE,TRIGGER')
 OR has_table_privilege(r.oid,'public.platform_checkout_admission_audit','INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
 OR has_table_privilege(r.oid,'public.platform_checkout_creation_gate','INSERT,DELETE,TRUNCATE,TRIGGER')
 OR has_function_privilege(r.oid,'public.audit_platform_checkout_admission()','EXECUTE')
 OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
   WHERE a.attrelid='public.platform_checkout_admissions'::regclass AND a.attnum>0 AND NOT a.attisdropped
   AND a.attname<>'attempt_id' AND has_column_privilege(r.oid,a.attrelid,a.attnum,'UPDATE'))
 OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a
   WHERE a.attrelid='public.platform_checkout_creation_gate'::regclass AND a.attnum>0 AND NOT a.attisdropped
   AND a.attname<>'last_admission_expires_at' AND has_column_privilege(r.oid,a.attrelid,a.attnum,'UPDATE'))
)
SELECT 1/(CASE WHEN NOT EXISTS(SELECT 1 FROM violations)
 AND has_table_privilege(:'runtime_role','public.platform_checkout_admissions','SELECT')
 AND has_column_privilege(:'runtime_role','public.platform_checkout_admissions','attempt_id','UPDATE')
 AND has_table_privilege(:'runtime_role','public.platform_checkout_admission_audit','SELECT')
 AND has_column_privilege(:'runtime_role','public.platform_checkout_creation_gate','last_admission_expires_at','UPDATE')
 THEN 1 ELSE 0 END) AS runtime_privileges_verified;
COMMIT;
