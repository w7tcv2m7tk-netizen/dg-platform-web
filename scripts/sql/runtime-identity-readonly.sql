-- Run only with the exact serving deployment credential, loaded privately.
-- Never pass the credential as a command argument or paste its output into chat.
BEGIN READ ONLY;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='3s';
SELECT current_user AS runtime_role,
       session_user AS session_role,
       current_database() AS database_name,
       inet_server_port() AS server_port;
SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls, rolcanlogin
FROM pg_catalog.pg_roles
WHERE rolname=current_user;
WITH reachable AS (
  SELECT * FROM pg_catalog.pg_roles WHERE pg_catalog.pg_has_role(current_user,oid,'MEMBER')
)
SELECT role.rolname AS reachable_role,
       role.rolsuper,
       role.rolcreaterole,
       role.rolcreatedb,
       role.rolreplication,
       role.rolbypassrls
FROM reachable role
WHERE role.oid<>current_user::regrole
ORDER BY role.rolname;
SELECT pg_catalog.pg_has_role(current_user,(SELECT relowner FROM pg_catalog.pg_class WHERE oid='public.platform_checkout_creation_gate'::regclass),'MEMBER') AS gate_owner_reachable,
       pg_catalog.has_column_privilege(current_user,'public.platform_checkout_creation_gate','blocked','UPDATE') AS can_change_global_gate,
       pg_catalog.has_column_privilege(current_user,'public.platform_checkout_creation_gate','last_admission_expires_at','UPDATE') AS can_advance_admission_horizon,
       pg_catalog.has_table_privilege(current_user,'public.platform_checkout_admissions','INSERT') AS can_create_admission,
       pg_catalog.has_table_privilege(current_user,'public.platform_checkout_admission_audit','INSERT,UPDATE,DELETE,TRUNCATE') AS can_mutate_admission_audit,
       pg_catalog.has_schema_privilege(current_user,'public','CREATE') AS can_create_schema_objects,
       pg_catalog.has_database_privilege(current_user,current_database(),'CREATE') AS can_create_database_objects,
       current_setting('transaction_read_only') AS transaction_read_only;
COMMIT;
