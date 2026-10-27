\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='10s';
SELECT set_config('dg.runtime_role', :'runtime_role', true);

DO $runtime_role_precheck$
DECLARE
  v_role text := current_setting('dg.runtime_role', true);
  v_oid oid;
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
END
$runtime_role_precheck$;

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'runtime_role') \gexec
GRANT USAGE ON SCHEMA public TO :"runtime_role";

GRANT SELECT ON TABLE public."platform_checkout_admission_audit", public."platform_checkout_admissions", public."platform_checkout_creation_gate" TO :"runtime_role";
GRANT SELECT, INSERT ON TABLE public."agent_actions", public."audit_logs", public."growth_prospect_audits", public."growth_prospect_engagements", public."partner_commission_events", public."platform_referral_ledger", public."platform_subscription_events" TO :"runtime_role";
GRANT SELECT, INSERT, DELETE ON TABLE public."ai_worker_claim_receipts" TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE ON TABLE public."ai_local_deployments", public."ai_local_recipient_approvals", public."ai_worker_principals", public."ai_worker_provisioning_receipts", public."aida_conversations", public."platform_api_keys", public."platform_checkout_attempts", public."platform_referrals", public."stripe_webhook_receipts" TO :"runtime_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."accommodation_guest_profiles", public."accommodation_units", public."activities", public."ai_accounting_outbox", public."ai_inference_jobs", public."ai_visibility_citations", public."ai_visibility_competitor_mentions", public."ai_visibility_competitors", public."ai_visibility_observations", public."ai_visibility_prompts", public."app_installations", public."business_knowledge_items", public."business_knowledge_links", public."business_knowledge_sources", public."commerce_invoices", public."commerce_payment_requests", public."commerce_payments", public."commerce_products", public."commerce_quotes", public."commerce_refunds", public."commerce_subscriptions", public."commercial_leases", public."commercial_properties", public."communication_agents", public."communication_messages", public."communication_sessions", public."communication_usages", public."companies", public."contacts", public."customer_partner_attributions", public."delivery_blockers", public."delivery_milestones", public."delivery_projects", public."delivery_tasks", public."dreamscape_customer_links", public."dreamscape_webhook_events", public."finance_applications", public."growth_prospect_reports", public."growth_prospects", public."infrastructure_domains", public."leads", public."memberships", public."notifications", public."opportunities", public."org_communications", public."org_documents", public."organisations", public."partner_commissions", public."partner_referrals", public."partners", public."payment_connector_installations", public."platform_subscriptions", public."pm_leases", public."pm_maintenance_requests", public."pm_properties", public."properties", public."service_jobs", public."stay_bookings", public."support_conversations", public."support_messages", public."tasks", public."website_pages", public."websites" TO :"runtime_role";
GRANT UPDATE (attempt_id) ON TABLE public."platform_checkout_admissions" TO :"runtime_role";
GRANT UPDATE (last_admission_expires_at) ON TABLE public."platform_checkout_creation_gate" TO :"runtime_role";

GRANT USAGE, SELECT ON SEQUENCE public."support_messages_id_seq" TO :"runtime_role";

SELECT 'runtime_role_grants_applied' AS result;
COMMIT;
