-- ============================================================================
-- H-7: crash recovery for Stripe webhook processing.
--
-- APPROVED. Apply BEFORE deploying application code that reads these columns.
-- See docs/infrastructure/STRIPE-RECEIPT-STATE-DEPLOYMENT.md.
--
-- Current behaviour (shipped, no schema change):
--   claim (insert receipt) → handle → on thrown error, release (delete receipt)
--   so Stripe's retry can re-claim.
--
-- Residual gap: a hard crash — OOM kill, function timeout, instance
-- termination — unwinds nothing, so the claim row survives with no handler ever
-- having completed. Stripe retries, matches the unique event_id, and is told
-- "duplicate". The event is lost with no signal.
--
-- WHY A SCHEMA CHANGE IS REQUIRED
--
-- The existing table cannot express this. Its columns are:
--   id, event_id (unique), event_type, organisation_id, processed_at
-- `processed_at` is NOT NULL and defaults to now() at INSERT — i.e. at claim
-- time, not at completion. So "claimed 20 minutes ago and crashed" and
-- "processed successfully 20 minutes ago" are byte-identical rows.
--
-- A stale-claim sweep built on `processed_at` alone would therefore re-run
-- events that had already succeeded. Several handlers are not idempotent
-- (stay-booking paid marker, Connect account update), so that would cause
-- duplicate side effects — strictly worse than the current gap.
--
-- Distinguishing "processing" from "processed" needs one durable field.
-- ============================================================================

-- 1. State machine columns.
--
-- Two-step default is deliberate and load-bearing:
--
--   Step 1a adds `status` with DEFAULT 'processed'. Every EXISTING row is
--   backfilled to 'processed' in the same statement, with no separate UPDATE
--   and no window in which history looks unprocessed. Existing rows were only
--   ever written on a successful claim under the pre-state-machine code, so
--   'processed' preserves today's dedup behaviour exactly and can never cause
--   a historical event to be reprocessed.
--
--   Step 1b then changes the default to 'processing' for FUTURE inserts,
--   because a new row is created at CLAIM time, not at completion. Leaving the
--   default as 'processed' would mark every new claim as already complete and
--   silently disable retry — the opposite of this migration's purpose.
--
-- Both steps are idempotent: IF NOT EXISTS on the columns, and SET DEFAULT is
-- naturally repeatable. Running this file twice is safe.

-- 1a. Add columns; existing rows land on 'processed'.
ALTER TABLE "stripe_webhook_receipts"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;

-- 1b. Future inserts are claims, not completions.
ALTER TABLE "stripe_webhook_receipts"
  ALTER COLUMN "status" SET DEFAULT 'processing';

-- Historical rows keep claimed_at / completed_at NULL. That is intentional:
-- the stale sweep only considers status='processing', so a NULL claimed_at on
-- a 'processed' row is never examined.

COMMENT ON COLUMN "stripe_webhook_receipts"."status" IS
  'processing | processed | failed. Existing rows backfilled to processed; new claims default to processing.';

-- 2. Index for the stale-claim sweep.
CREATE INDEX IF NOT EXISTS "stripe_webhook_receipts_status_claimed_at_idx"
  ON "stripe_webhook_receipts" ("status", "claimed_at");

-- ============================================================================
-- INTENDED STATE MACHINE (implement only after this migration is applied)
--
--   absent                → unseen; claim by INSERT (status='processing',
--                           claimed_at=now(), attempts=1)
--   status='processing'   → in flight, or crashed. Concurrent delivery sees the
--                           row and returns duplicate WITHOUT running.
--   status='processed'    → completed; future duplicates ignored.
--   status='failed'       → handler threw; retryable. Next delivery re-claims
--                           by UPDATE ... WHERE status IN ('failed') and
--                           increments attempts.
--   attempts >= N         → stop retrying; leave as 'failed' for alerting so a
--                           permanently malformed event cannot loop forever.
--
-- Stale-claim recovery: a row in 'processing' whose claimed_at is older than
-- the maximum function duration (Vercel maxDuration, currently 120s for the
-- longest route; use a margin such as 15 minutes) cannot still be running, so
-- it is safe to reclaim. This is the case that needs `status` — without it the
-- sweep cannot tell a crash from a success.
--
-- Concurrency: reclaim must be a conditional UPDATE returning affected rows,
-- not read-then-write, e.g.
--   UPDATE stripe_webhook_receipts
--      SET status='processing', claimed_at=now(), attempts=attempts+1
--    WHERE event_id=$1
--      AND (status='failed'
--           OR (status='processing' AND claimed_at < now() - interval '15 minutes'))
--   RETURNING id;
-- Zero rows returned means someone else holds it, or it is already processed.
--
-- DEPLOYMENT ORDER (important)
--   1. Apply this migration.
--   2. Then deploy code that reads/writes the new columns.
-- Deploying the code first would query columns that do not exist and take the
-- webhook endpoint down. This is why no application code in this branch
-- references these columns.
--
-- ROLLBACK
--   ALTER TABLE "stripe_webhook_receipts"
--     DROP COLUMN IF EXISTS "status",
--     DROP COLUMN IF EXISTS "attempts",
--     DROP COLUMN IF EXISTS "claimed_at",
--     DROP COLUMN IF EXISTS "completed_at",
--     DROP COLUMN IF EXISTS "last_error";
--   DROP INDEX IF EXISTS "stripe_webhook_receipts_status_claimed_at_idx";
-- Safe while no deployed code references the columns. Reverting the
-- application alone is sufficient if the columns are left in place.
--
-- INTERIM MITIGATION (no schema change, available today)
--   Stripe retries a failing endpoint for up to ~3 days and surfaces failed
--   deliveries in the Dashboard. Until this lands, a crashed-mid-handler event
--   is visible there as a delivery that received 200 with {"duplicate": true}
--   and can be replayed manually. Prisma schema.prisma is intentionally
--   unchanged so the artifact and the code cannot drift.
-- ============================================================================
