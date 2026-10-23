-- Operator-only; credentials supplied privately. No schema or record writes.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
SELECT migration_name, checksum, applied_steps_count,
       finished_at::text, rolled_back_at::text
FROM public._prisma_migrations ORDER BY migration_name;
SELECT id,blocked,subscription_webhooks_held,revision,last_admission_expires_at
FROM public.platform_checkout_creation_gate;
SELECT count(*)::int AS subscriptions,
       count(*) FILTER (WHERE platform_exempt)::int AS exemptions
FROM public.platform_subscriptions;
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('platform_checkout_attempts','platform_checkout_creation_gate')
ORDER BY tablename,indexname;
SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('public.platform_checkout_attempts'::regclass,'public.platform_checkout_creation_gate'::regclass)
ORDER BY conrelid::regclass::text,conname;
SELECT table_name,column_name,data_type,udt_name,column_default,is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND
 (table_name IN ('platform_checkout_attempts','platform_checkout_creation_gate') OR
  (table_name='platform_subscriptions' AND column_name IN ('industry_apps','premium_apps')))
ORDER BY table_name,column_name;
COMMIT;
