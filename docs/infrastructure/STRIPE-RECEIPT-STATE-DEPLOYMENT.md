# Stripe webhook receipt state — deployment runbook (H-7)

**Status: prepared, NOT applied.** The migration has not been run and no
application code references the new columns. Production behaviour is unchanged
by this branch.

## What problem this closes

Today's shipped behaviour is claim → handle → release-on-failure
(`withWebhookIdempotency`). That correctly handles a handler that *throws*: the
claim is released and Stripe's retry reprocesses the event.

It does not handle a hard crash. An OOM kill, function timeout or instance
termination unwinds nothing, so the claim row survives with no handler having
completed. Stripe retries, matches the unique `event_id`, is told `duplicate`,
and the event is lost silently.

## Why a schema change is unavoidable

`processed_at` is `NOT NULL DEFAULT now()` and is set at **INSERT**, i.e. at
claim time. A row that crashed 20 minutes ago and a row that succeeded 20
minutes ago are byte-identical. A stale sweep built on that column would re-run
events that already succeeded.

That is not tolerable here, because the handlers are **not** all idempotent —
verified in source: `markPublicStayPaidFromStripe` and
`handleConnectAccountUpdated` have no event-id dedup. Reprocessing them would
be strictly worse than the gap being closed. One durable status field removes
the ambiguity.

## Artefacts

| File | Purpose |
|---|---|
| `packages/database/prisma/baseline/proposed/stripe_webhook_receipt_state.sql` | The migration |
| `packages/platform-core/src/billing/webhook-receipt-state.ts` | State machine, complete and tested, **not wired** |
| `scripts/test-webhook-receipt-state.mjs` | 11 tests covering every transition |

## Existing records

The migration adds `status` with `DEFAULT 'processed'`, so **every existing row
is backfilled to processed in the same statement** — no separate UPDATE, no
window where history looks unprocessed, and no possibility of a historical
event being reprocessed.

It then changes the default to `'processing'` for future inserts, because a new
row is created at claim time. This two-step is load-bearing: leaving the default
as `'processed'` would mark every new claim as already complete and silently
disable retry.

Historical rows keep `claimed_at` NULL. The stale sweep only examines
`status='processing'`, so those rows are never considered. Tested.

## State machine

| State | Meaning | Next |
|---|---|---|
| row absent | unseen | claim by INSERT → `processing` |
| `processing`, claim fresh | a worker is running it | duplicate; do not run |
| `processing`, claim older than 15 min | crashed | reclaim → `processing`, attempts+1 |
| `processed` | completed | duplicate; never re-run |
| `failed` | handler threw | reclaim immediately, attempts+1 |
| `failed`, attempts ≥ 6 | permanently failing | `exhausted`; left for alerting, never looped |

15 minutes is well above the longest configured `maxDuration` (120s), so a claim
older than that cannot still be executing.

Concurrency safety depends on two operations being atomic:
`insertClaim` (unique constraint on `event_id`) and `reclaim` (conditional
`UPDATE … WHERE status='failed' OR (status='processing' AND claimed_at < …)`
returning affected rows). Read-then-write would reintroduce the double-processing
race the claim exists to prevent.

## Deployment sequence

**1. Pre-deployment checks**

```sql
-- Confirm current shape and volume (read-only)
SELECT COUNT(*) AS total,
       MIN(processed_at) AS oldest,
       MAX(processed_at) AS newest
FROM stripe_webhook_receipts;

-- Confirm the columns do not already exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'stripe_webhook_receipts';
```

Run on staging first. Confirm the Stripe webhook endpoint is healthy before
starting (`GET /api/webhooks/stripe` returns `{ status: "ok" }`).

**2. Apply the migration**

Apply `stripe_webhook_receipt_state.sql`. It is idempotent — `IF NOT EXISTS` on
every column and index, and `SET DEFAULT` is naturally repeatable — so a partial
failure can be re-run safely. It takes no destructive action: no `DROP`, no
`DELETE`, no `TRUNCATE` (asserted in tests).

**3. Verify the migration**

```sql
SELECT status, COUNT(*) FROM stripe_webhook_receipts GROUP BY status;
-- Expect: every existing row 'processed', none 'processing' or 'failed'.

SELECT column_default FROM information_schema.columns
WHERE table_name = 'stripe_webhook_receipts' AND column_name = 'status';
-- Expect: 'processing'::text
```

**4. Deploy the application**

Only after step 3. Three changes, none of which exist yet:

- add `status`, `attempts`, `claimedAt`, `completedAt`, `lastError` to the
  `StripeWebhookReceipt` model in `schema.prisma` and regenerate the client;
- implement `prismaReceiptStore` satisfying the `ReceiptStore` interface, with
  `reclaim` as a conditional `updateMany` checking the affected count;
- replace `withWebhookIdempotency` with `withWebhookReceiptState` in
  `src/app/api/webhooks/stripe/route.ts`, mapping `exhausted` to a 200 (so
  Stripe stops retrying a poison event) and a thrown handler to 400.

**5. Verify webhooks**

Send a Stripe test event. Confirm: a new row appears as `processing` then
`processed`; a replay of the same event id returns `duplicate` without
re-running; the Stripe Dashboard shows 200s.

**6. Rollback**

Revert the application deployment first — the previous code ignores the new
columns entirely, so it keeps working with them present. That alone restores
prior behaviour.

Only drop the columns if you also need to revert the schema:

```sql
ALTER TABLE "stripe_webhook_receipts"
  ALTER COLUMN "status" SET DEFAULT 'processed';
ALTER TABLE "stripe_webhook_receipts"
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "attempts",
  DROP COLUMN IF EXISTS "claimed_at",
  DROP COLUMN IF EXISTS "completed_at",
  DROP COLUMN IF EXISTS "last_error";
DROP INDEX IF EXISTS "stripe_webhook_receipts_status_claimed_at_idx";
```

Do this only while no deployed code references them.

## Interim position

Until step 1 runs, the gap remains: a hard crash mid-handler strands the event.
Stripe retains failed deliveries for ~3 days and surfaces them in its Dashboard,
so an affected event can be replayed manually. `schema.prisma` is intentionally
unchanged so the artefact and the running code cannot drift.
