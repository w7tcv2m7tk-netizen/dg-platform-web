# Stripe webhook receipt state — deployment runbook (H-7)

**Status: approved, application code written and wired, migration NOT applied.**

This is a change of state from the previous revision of this document. The
application code now reads and writes the new columns, so the ordering below is
no longer advisory:

> Deploying this branch before applying the migration will take the Stripe
> webhook endpoint down. Every delivery would query columns that do not exist.

The migration must be applied first. Nothing in this repository has contacted a
database; the migration has not been run.

## What problem this closes

The behaviour in production today is claim → handle → release-on-failure. That
correctly handles a handler that *throws*: the claim row is deleted and Stripe's
retry reprocesses the event.

It does not handle a hard crash. An OOM kill, function timeout or instance
termination unwinds nothing, so the claim row survives with no handler having
completed. Stripe retries, matches the unique `event_id`, is told `duplicate`,
and the event is lost with no signal.

## Why a schema change is unavoidable

`processed_at` is `NOT NULL DEFAULT now()` and is set at **INSERT**, i.e. at
claim time. A row that crashed 20 minutes ago and a row that succeeded 20
minutes ago are byte-identical. A stale sweep built on that column would re-run
events that already succeeded.

That is not tolerable here, because the handlers are **not** all idempotent —
verified in source: `markPublicStayPaidFromStripe` and
`handleConnectAccountUpdated` have no event-id dedup. Reprocessing them would be
strictly worse than the gap being closed. One durable status field removes the
ambiguity.

## Artefacts

| File | State |
|---|---|
| `packages/database/prisma/migrations/20260830_stripe_webhook_receipt_state/migration.sql` | The migration. **Not applied.** |
| `packages/database/prisma/schema.prisma` → `StripeWebhookReceipt` | Model carries the five new fields and the `[status, claimedAt]` index. |
| `packages/platform-core/src/billing/webhook-receipt-state.ts` | State machine + `prismaReceiptStore`. Wired. |
| `src/app/api/webhooks/stripe/route.ts` | Uses `withWebhookReceiptState`. The previous `withWebhookIdempotency` is removed. |
| `scripts/test-webhook-receipt-state.mjs` | 14 tests covering every transition. |

The schema and the migration were cross-checked by regenerating the C-4 baseline
from `schema.prisma` (`prisma migrate diff --from-empty`, schema file only, no
database). The only delta against the previous baseline was exactly these five
columns and this index, and Prisma independently generates the same index name
the migration creates — so model, migration and baseline agree.

## How to apply it — NOT `prisma migrate deploy`

`prisma migrate deploy` **cannot be used in this repository.** This is the
unresolved C-4 finding, not a new problem:

- there is no `prisma/migrations/migration_lock.toml`;
- the checked-in history creates 16 of 63 tables and opens with `ALTER TABLE`
  against tables it never creates, so a clean-database deploy fails on the third
  migration;
- production was established with `db:push`, so `_prisma_migrations` has never
  been baselined;
- `package.json` has no `migrate` script at all.

Running `migrate deploy` against production would attempt to replay the whole
broken history. Apply this one migration as **direct SQL** instead. It is
written to be safe under that model: `IF NOT EXISTS` on every column and index,
and `SET DEFAULT` is naturally repeatable.

The migration folder placement is for the future, once C-4 baselining is done.
It is not a claim that `migrate deploy` works today.

## Migration review

Re-inspected before apply. The executable statements are:

```sql
ALTER TABLE "stripe_webhook_receipts"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'processed',
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_error" TEXT;

ALTER TABLE "stripe_webhook_receipts"
  ALTER COLUMN "status" SET DEFAULT 'processing';

COMMENT ON COLUMN "stripe_webhook_receipts"."status" IS '…';

CREATE INDEX IF NOT EXISTS "stripe_webhook_receipts_status_claimed_at_idx"
  ON "stripe_webhook_receipts" ("status", "claimed_at");
```

| Requirement | Assessment |
|---|---|
| Backward compatible with existing rows | Yes. Only additive. The currently deployed code selects none of these columns, so it keeps working with them present. |
| Idempotent | Yes. `IF NOT EXISTS` on all five columns and the index; `SET DEFAULT` is repeatable; `COMMENT` is a replace. Re-running the file is safe. |
| Non-destructive | Yes. No `DROP`, `DELETE`, `TRUNCATE`, `ALTER … TYPE` or `NOT NULL` added to an existing column. Asserted in tests. |
| Safe for existing data | Yes. Existing rows are backfilled to `'processed'` by the `ADD COLUMN` default in the same statement — no separate `UPDATE`, no window in which history looks unprocessed. Those rows were only ever written after a successful claim under the current code, so `'processed'` preserves today's dedup behaviour exactly. |
| Consistent with the Prisma model and store | Yes. Column names, types, nullability, defaults and index name all match `schema.prisma` and the store's queries. |
| Cannot create duplicate or conflicting states | Yes. `event_id` remains uniquely constrained, so `insertClaim` can only ever produce one row per event. `reclaim` is a single conditional `UPDATE` whose affected-row count decides the winner, so two workers cannot both take a claim. |

The two-step default is load-bearing. Step 1 backfills history to `'processed'`;
step 2 makes future inserts `'processing'`, because a row is created at claim
time. Leaving the default at `'processed'` would mark every new claim as already
complete and silently disable retry — the opposite of the intent.

## The deployment window

Between applying the migration and deploying the application there is a period
where the migration is live but the old code is still running. The old code
inserts a receipt only *after* a successful handler run and specifies neither
`status` nor `claimed_at`, so rows written in that window land as `'processing'`
with `claimed_at` NULL **despite having completed successfully**.

Those rows are indistinguishable from a crash. Because the handlers are not all
idempotent, the only safe reading is "already done", and the state machine now
treats `processing` + NULL `claimed_at` as `already_processed` explicitly. Keep
the window short regardless, and expect a small number of such rows.

## State machine

| State | Meaning | Next |
|---|---|---|
| row absent | unseen | claim by INSERT → `processing` |
| `processing`, claim fresh | a worker is running it | duplicate; do not run |
| `processing`, claim older than 15 min | crashed | reclaim → `processing`, attempts+1 |
| `processing`, claim NULL | written by pre-deployment code | duplicate; never run |
| `processed` | completed | duplicate; never re-run |
| `failed` | handler threw | reclaim immediately, attempts+1 |
| `attempts` ≥ 6 | permanently failing | returns `exhausted`; row left `failed` for alerting, never looped |

`exhausted` is a return value only; the persisted statuses are exactly
`processing | processed | failed`, matching the column comment.

15 minutes (`STALE_CLAIM_MS`) is well above the longest configured
`maxDuration` (120s), so a claim older than that cannot still be executing.

## Sequence

### 1. Pre-flight (read-only)

```sql
SELECT COUNT(*) AS total,
       MIN(processed_at) AS oldest,
       MAX(processed_at) AS newest
FROM stripe_webhook_receipts;

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'stripe_webhook_receipts'
ORDER BY ordinal_position;
```

Record the total — step 3 checks it is unchanged. Confirm the five new columns
are absent. Confirm the webhook endpoint is healthy: `GET /api/webhooks/stripe`
returns `{ status: "ok" }`.

Run the whole sequence against staging first.

### 2. Apply

```bash
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f packages/database/prisma/migrations/20260830_stripe_webhook_receipt_state/migration.sql
```

Do **not** use `db push` — it would diff the entire 63-model schema against a
database whose migration history is unreconciled.

### 3. Verify the migration

```sql
-- (a) No rows lost. Compare with the total from step 1.
SELECT COUNT(*) FROM stripe_webhook_receipts;

-- (b) All history is 'processed'; nothing stranded in 'processing'.
SELECT status, COUNT(*) FROM stripe_webhook_receipts GROUP BY status;
-- Expect exactly one row: processed | <total from step 1>

-- (c) Future inserts default to a claim, not a completion.
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'stripe_webhook_receipts'
  AND column_name IN ('status','attempts','claimed_at','completed_at','last_error');
-- Expect: status 'processing'::text NOT NULL; attempts 1 NOT NULL;
--         claimed_at / completed_at / last_error NULL-able, no default.

-- (d) Sweep index present.
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'stripe_webhook_receipts';
-- Expect stripe_webhook_receipts_status_claimed_at_idx on (status, claimed_at),
-- alongside the existing event_id unique index and processed_at index.

-- (e) The uniqueness the claim depends on is intact.
SELECT COUNT(*) - COUNT(DISTINCT event_id) AS duplicate_event_ids
FROM stripe_webhook_receipts;
-- Expect 0.
```

If (b) shows any row not `processed`, stop and investigate before deploying —
the backfill assumption has been violated.

### 4. Deploy the application

Only after step 3 passes. No code change is needed at this point; the branch
already contains it. Regenerate the Prisma client as part of the build
(`npm run db:generate`) so the client knows the new fields.

### 5. Verify the webhook

Send a Stripe test event, then:

```sql
SELECT event_id, event_type, status, attempts, claimed_at, completed_at, last_error
FROM stripe_webhook_receipts
ORDER BY processed_at DESC
LIMIT 5;
```

Confirm, in order:

- **claim** — the new row exists with `status='processing'`, `attempts=1`,
  `claimed_at` set;
- **process** — it settles to `status='processed'` with `completed_at` set and
  `last_error` NULL;
- **duplicate** — replaying the same event id from the Stripe Dashboard returns
  200 without re-running the handler, and `attempts` does **not** increase;
- **retry** — a handler failure leaves `status='failed'` with `last_error`
  populated, and the next delivery reclaims it with `attempts` incremented;
- **recover** — a row left `processing` with `claimed_at` older than 15 minutes
  is reclaimed by the next delivery rather than reported as a duplicate.

The last two are most cheaply checked on staging by forcing a handler error.
Do not manufacture failures against production.

Confirm the Stripe Dashboard shows 200s and no rise in failed deliveries.

### 6. Rollback

Revert the application deployment first. The previous code ignores these columns
entirely, so it keeps working with them present — that alone restores prior
behaviour, and is the preferred rollback.

Only drop the columns if you also need to revert the schema, and only while no
deployed code references them:

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

## Interim position

Until step 2 runs, the crash gap remains and this branch must not be deployed.
Stripe retains failed deliveries for ~3 days and surfaces them in its Dashboard,
so an affected event can be replayed manually in the meantime.
