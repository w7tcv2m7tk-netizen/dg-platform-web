-- TEST ONLY — disposable local PostgreSQL fixture.
-- Never run against Production.
--
-- Representative subset of the DigitalGate catalog needed by the certified
-- Stage 2C preflight, plus unrelated customer, view and function objects used
-- to prove the reader cannot reach outside its named table grants.

\set ON_ERROR_STOP on

CREATE TABLE public._prisma_migrations (
  id text PRIMARY KEY,
  checksum text NOT NULL,
  migration_name text NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  rolled_back_at timestamptz,
  logs text,
  applied_steps_count integer
);

INSERT INTO public._prisma_migrations
  (id, checksum, migration_name, started_at, finished_at, rolled_back_at, logs, applied_steps_count)
SELECT
  'synthetic-' || g,
  repeat('a', 64),
  'synthetic_' || lpad(g::text, 2, '0'),
  now() - interval '1 day',
  now(),
  NULL,
  NULL,
  1
FROM generate_series(1, 25) AS g;

INSERT INTO public._prisma_migrations
  (id, checksum, migration_name, started_at, finished_at, rolled_back_at, logs, applied_steps_count)
VALUES (
  'synthetic-admission',
  'a60c03ab49b4b1969e52c4edccb06f73117faac577271400c63eea9e2ec472f6',
  '20261027_single_use_checkout_admission',
  now() - interval '1 day',
  now(),
  NULL,
  NULL,
  1
);

CREATE TABLE public.platform_checkout_creation_gate (
  id integer PRIMARY KEY,
  blocked boolean NOT NULL,
  subscription_webhooks_held boolean NOT NULL,
  revision integer NOT NULL,
  last_admission_expires_at timestamptz,
  CONSTRAINT platform_checkout_creation_gate_singleton CHECK (id = 1)
);

INSERT INTO public.platform_checkout_creation_gate
  (id, blocked, subscription_webhooks_held, revision, last_admission_expires_at)
VALUES (1, true, false, 2, now() + interval '1 day');

CREATE TABLE public.platform_subscriptions (
  id text PRIMARY KEY,
  organisation_id text NOT NULL,
  status text NOT NULL,
  entitlement text NOT NULL,
  platform_exempt boolean NOT NULL DEFAULT false,
  industry_apps text[] NOT NULL DEFAULT '{}',
  premium_apps text[] NOT NULL DEFAULT '{}'
);

INSERT INTO public.platform_subscriptions
  (id, organisation_id, status, entitlement, platform_exempt, industry_apps, premium_apps)
SELECT
  'subscription-' || g,
  'synthetic-organisation-' || g,
  CASE WHEN g % 2 = 0 THEN 'ACTIVE' ELSE 'TRIALING' END,
  'FULL',
  true,
  CASE WHEN g = 1 THEN ARRAY['finance']::text[] ELSE ARRAY[]::text[] END,
  CASE WHEN g = 2 THEN ARRAY['reviews']::text[] ELSE ARRAY[]::text[] END
FROM generate_series(1, 6) AS g;

CREATE TABLE public.platform_subscription_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  organisation_id text
);

INSERT INTO public.platform_subscription_events (id, type, organisation_id)
VALUES ('event-1', 'created', 'synthetic-organisation-1'),
       ('event-2', 'updated', 'synthetic-organisation-2'),
       ('event-3', 'created', 'synthetic-organisation-3');

CREATE TABLE public.platform_checkout_attempts (
  id text PRIMARY KEY,
  state text NOT NULL,
  organisation_id text NOT NULL
);

CREATE TABLE public.platform_checkout_admissions (
  id text PRIMARY KEY,
  organisation_id text NOT NULL,
  active_organisation_id text,
  clerk_user_id text NOT NULL,
  provider_scope text NOT NULL,
  terms_hash text NOT NULL,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  attempt_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_checkout_admission_audit (
  id bigserial PRIMARY KEY,
  admission_id text NOT NULL,
  action text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

SELECT nextval('public.platform_checkout_admission_audit_id_seq');

CREATE TABLE public.stripe_webhook_receipts (
  id text PRIMARY KEY,
  status text NOT NULL
);

INSERT INTO public.stripe_webhook_receipts (id, status)
VALUES ('receipt-1', 'processed'), ('receipt-2', 'processed'), ('receipt-3', 'ignored');

CREATE TABLE public.contacts (
  id text PRIMARY KEY,
  email text NOT NULL
);

INSERT INTO public.contacts (id, email) VALUES ('contact-1', 'synthetic@example.invalid');

CREATE VIEW public.customer_view AS
SELECT id, email FROM public.contacts;

CREATE TABLE public.rls_contacts (
  id text PRIMARY KEY,
  owner text NOT NULL
);

ALTER TABLE public.rls_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_contacts_owner_policy ON public.rls_contacts
  USING (owner = current_user);

CREATE SEQUENCE public.support_messages_id_seq;

CREATE FUNCTION public.audit_platform_checkout_admission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  RETURN NEW;
END
$$;

CREATE FUNCTION public.preserve_checkout_admission_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Admission audit is append only';
END
$$;

REVOKE ALL ON FUNCTION public.audit_platform_checkout_admission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preserve_checkout_admission_audit() FROM PUBLIC;

CREATE TRIGGER platform_checkout_admission_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.platform_checkout_admissions
FOR EACH ROW EXECUTE FUNCTION public.audit_platform_checkout_admission();

CREATE TRIGGER platform_checkout_admission_audit_immutable
BEFORE UPDATE OR DELETE ON public.platform_checkout_admission_audit
FOR EACH ROW EXECUTE FUNCTION public.preserve_checkout_admission_audit();
