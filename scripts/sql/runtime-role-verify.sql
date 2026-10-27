\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
SELECT set_config('dg.runtime_role', :'runtime_role', true);
CREATE TEMP TABLE dg_runtime_expected_tables (table_name text PRIMARY KEY, table_privileges text[] NOT NULL, column_privileges jsonb NOT NULL) ON COMMIT DROP;
INSERT INTO dg_runtime_expected_tables VALUES ('accommodation_guest_profiles', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('accommodation_units', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('activities', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('agent_actions', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_accounting_outbox', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_inference_jobs', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_local_deployments', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_local_recipient_approvals', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_visibility_citations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_visibility_competitor_mentions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_visibility_competitors', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_visibility_observations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_visibility_prompts', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_worker_claim_receipts', ARRAY['SELECT','INSERT','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_worker_principals', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('ai_worker_provisioning_receipts', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('aida_conversations', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('app_installations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('audit_logs', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('business_knowledge_items', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('business_knowledge_links', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('business_knowledge_sources', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_invoices', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_payment_requests', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_payments', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_products', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_quotes', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_refunds', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commerce_subscriptions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commercial_leases', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('commercial_properties', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('communication_agents', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('communication_messages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('communication_sessions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('communication_usages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('companies', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('contacts', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('customer_partner_attributions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('delivery_blockers', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('delivery_milestones', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('delivery_projects', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('delivery_tasks', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('dreamscape_customer_links', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('dreamscape_webhook_events', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('finance_applications', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('growth_prospect_audits', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('growth_prospect_engagements', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('growth_prospect_reports', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('growth_prospects', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('infrastructure_domains', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('leads', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('memberships', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('notifications', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('opportunities', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('org_communications', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('org_documents', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('organisations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('partner_commission_events', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('partner_commissions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('partner_referrals', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('partners', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('payment_connector_installations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_api_keys', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_checkout_admission_audit', ARRAY['SELECT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_checkout_admissions', ARRAY['SELECT']::text[], '{"UPDATE":["attempt_id"]}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_checkout_attempts', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_checkout_creation_gate', ARRAY['SELECT']::text[], '{"UPDATE":["last_admission_expires_at"]}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_referral_ledger', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_referrals', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_subscription_events', ARRAY['SELECT','INSERT']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('platform_subscriptions', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('pm_leases', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('pm_maintenance_requests', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('pm_properties', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('properties', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('service_jobs', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('stay_bookings', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('stripe_webhook_receipts', ARRAY['SELECT','INSERT','UPDATE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('support_conversations', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('support_messages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('tasks', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('website_pages', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
INSERT INTO dg_runtime_expected_tables VALUES ('websites', ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[], '{}'::jsonb);
CREATE TEMP TABLE dg_runtime_expected_sequences (sequence_name text PRIMARY KEY, sequence_privileges text[] NOT NULL) ON COMMIT DROP;
INSERT INTO dg_runtime_expected_sequences VALUES ('support_messages_id_seq', ARRAY['USAGE','SELECT']::text[]);
CREATE TEMP TABLE dg_runtime_denied_sequences (sequence_name text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO dg_runtime_denied_sequences VALUES ('platform_checkout_admission_audit_id_seq');

DO $runtime_role_verify$
DECLARE
  v_role text := current_setting('dg.runtime_role', true);
  v_oid oid;
  v_table record;
  v_sequence record;
  v_column record;
  v_privilege text;
  v_all text[] := ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'];
BEGIN
  IF v_role IS NULL OR length(v_role)=0 THEN RAISE EXCEPTION 'runtime_role is required'; END IF;
  SELECT oid INTO v_oid FROM pg_catalog.pg_roles WHERE rolname=v_role;
  IF v_oid IS NULL THEN RAISE EXCEPTION 'runtime role does not exist: %', v_role; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.oid=v_oid AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls OR NOT r.rolcanlogin)) THEN RAISE EXCEPTION 'runtime role has unsafe attributes or cannot log in'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles x WHERE x.oid<>v_oid AND pg_catalog.pg_has_role(v_oid,x.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role has role memberships'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles o ON o.oid=c.relowner WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','S','f') AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of a public relation'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_roles o ON o.oid=p.proowner WHERE p.pronamespace='public'::regnamespace AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of a public function'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n JOIN pg_catalog.pg_roles o ON o.oid=n.nspowner WHERE n.nspname='public' AND pg_catalog.pg_has_role(v_oid,o.oid,'MEMBER')) THEN RAISE EXCEPTION 'runtime role owns or inherits ownership of schema public'; END IF;
  IF has_schema_privilege(v_oid,'public','CREATE') THEN RAISE EXCEPTION 'runtime role can create in schema public'; END IF;
  IF has_database_privilege(v_oid,current_database(),'CREATE') THEN RAISE EXCEPTION 'runtime role has database CREATE'; END IF;
  IF NOT has_schema_privilege(v_oid,'public','USAGE') THEN RAISE EXCEPTION 'runtime role lacks schema USAGE'; END IF;
  IF has_schema_privilege(v_oid,'public','USAGE WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime role can grant schema USAGE'; END IF;
  IF NOT has_database_privilege(v_oid,current_database(),'CONNECT') THEN RAISE EXCEPTION 'runtime role lacks database CONNECT'; END IF;
  IF has_database_privilege(v_oid,current_database(),'CONNECT WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime role can grant database CONNECT'; END IF;
  FOR v_table IN SELECT * FROM dg_runtime_expected_tables LOOP
    IF to_regclass(format('public.%I', v_table.table_name)) IS NULL THEN RAISE EXCEPTION 'expected table is absent: %', v_table.table_name; END IF;
    FOREACH v_privilege IN ARRAY v_table.table_privileges LOOP
      IF NOT has_table_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege) THEN RAISE EXCEPTION 'missing % on %', v_privilege, v_table.table_name; END IF;
    END LOOP;
    FOREACH v_privilege IN ARRAY v_all LOOP
      IF NOT (v_privilege = ANY(v_table.table_privileges)) AND has_table_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege) THEN RAISE EXCEPTION 'unexpected % on %', v_privilege, v_table.table_name; END IF;
      IF has_table_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege || ' WITH GRANT OPTION') THEN RAISE EXCEPTION 'grant option % on %', v_privilege, v_table.table_name; END IF;
    END LOOP;
    FOR v_column IN SELECT attname FROM pg_catalog.pg_attribute WHERE attrelid=format('public.%I', v_table.table_name)::regclass AND attnum>0 AND NOT attisdropped LOOP
      IF NOT (v_table.column_privileges ? 'UPDATE') THEN CONTINUE; END IF;
      IF NOT (v_column.attname = ANY(ARRAY(SELECT jsonb_array_elements_text(v_table.column_privileges->'UPDATE')))) AND has_column_privilege(v_oid, format('public.%I', v_table.table_name), v_column.attname, 'UPDATE') THEN RAISE EXCEPTION 'unexpected UPDATE on %.%', v_table.table_name, v_column.attname; END IF;
    END LOOP;
    IF v_table.column_privileges ? 'UPDATE' THEN
      FOR v_privilege IN SELECT jsonb_array_elements_text(v_table.column_privileges->'UPDATE') LOOP
        IF NOT has_column_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege, 'UPDATE') THEN RAISE EXCEPTION 'missing UPDATE on %.%', v_table.table_name, v_privilege; END IF;
        IF has_column_privilege(v_oid, format('public.%I', v_table.table_name), v_privilege, 'UPDATE WITH GRANT OPTION') THEN RAISE EXCEPTION 'grant option UPDATE on %.%', v_table.table_name, v_privilege; END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    FOREACH v_privilege IN ARRAY v_all LOOP
      IF has_table_privilege(v_oid,'public._prisma_migrations',v_privilege) THEN RAISE EXCEPTION 'runtime has % on _prisma_migrations', v_privilege; END IF;
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p') AND c.relname<>'_prisma_migrations' AND c.relname NOT IN (SELECT table_name FROM dg_runtime_expected_tables)) THEN RAISE EXCEPTION 'unexpected public table not covered by manifest'; END IF;
  FOR v_sequence IN SELECT * FROM dg_runtime_expected_sequences LOOP
    IF to_regclass(format('public.%I', v_sequence.sequence_name)) IS NULL THEN RAISE EXCEPTION 'expected sequence is absent: %', v_sequence.sequence_name; END IF;
    FOREACH v_privilege IN ARRAY v_sequence.sequence_privileges LOOP
      IF NOT has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege) THEN RAISE EXCEPTION 'missing % on sequence %', v_privilege, v_sequence.sequence_name; END IF;
      IF has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege || ' WITH GRANT OPTION') THEN RAISE EXCEPTION 'grant option % on sequence %', v_privilege, v_sequence.sequence_name; END IF;
    END LOOP;
    FOREACH v_privilege IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP
      IF NOT (v_privilege = ANY(v_sequence.sequence_privileges)) AND has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege) THEN RAISE EXCEPTION 'unexpected % on sequence %', v_privilege, v_sequence.sequence_name; END IF;
    END LOOP;
  END LOOP;
  FOR v_sequence IN SELECT * FROM dg_runtime_denied_sequences LOOP
    IF to_regclass(format('public.%I', v_sequence.sequence_name)) IS NOT NULL THEN
      FOREACH v_privilege IN ARRAY ARRAY['USAGE','SELECT','UPDATE'] LOOP
        IF has_sequence_privilege(v_oid, format('public.%I', v_sequence.sequence_name), v_privilege) THEN RAISE EXCEPTION 'runtime has % on denied sequence %', v_privilege, v_sequence.sequence_name; END IF;
      END LOOP;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind='S' AND c.relname NOT IN (SELECT sequence_name FROM dg_runtime_expected_sequences) AND c.relname NOT IN (SELECT sequence_name FROM dg_runtime_denied_sequences)) THEN RAISE EXCEPTION 'unexpected public sequence not covered by manifest'; END IF;
  IF has_function_privilege(v_oid,'public.audit_platform_checkout_admission()','EXECUTE') THEN RAISE EXCEPTION 'runtime can execute admission audit definer function'; END IF;
  IF has_function_privilege(v_oid,'public.audit_platform_checkout_admission()','EXECUTE WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime can grant admission audit execution'; END IF;
  IF has_function_privilege(v_oid,'public.preserve_checkout_admission_audit()','EXECUTE') THEN RAISE EXCEPTION 'runtime can execute admission audit guard function'; END IF;
  IF has_function_privilege(v_oid,'public.preserve_checkout_admission_audit()','EXECUTE WITH GRANT OPTION') THEN RAISE EXCEPTION 'runtime can grant admission audit guard execution'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prosecdef AND has_function_privilege(v_oid,p.oid,'EXECUTE')) THEN RAISE EXCEPTION 'runtime can execute a public SECURITY DEFINER function'; END IF;
END
$runtime_role_verify$;
SELECT 'runtime_role_verified' AS result;
COMMIT;
