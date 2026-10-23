-- PROPOSED PRODUCTION WRITE: separate owner approval required. Never run in preflight.
-- psql -X -v ON_ERROR_STOP=1 -v expected_revision=<fresh-reviewed-integer> -f <this-file>
BEGIN;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '3s';
WITH changed AS (
 UPDATE public.platform_checkout_creation_gate
 SET subscription_webhooks_held = true, revision = revision + 1, changed_at = clock_timestamp()
 WHERE id = 1 AND blocked = true
   AND subscription_webhooks_held = false
   AND revision = :'expected_revision'::integer
 RETURNING id
)
-- Zero changed rows raises division-by-zero, rolling back this transaction.
SELECT 1 / count(*)::integer AS exactly_one_changed FROM changed;
SELECT id,blocked,subscription_webhooks_held,revision
FROM public.platform_checkout_creation_gate WHERE id=1;
COMMIT;
