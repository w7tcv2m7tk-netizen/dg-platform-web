# Stripe webhook receipt state — deployment runbook (H-7)

**Status (2026-08-31):**

| Layer | State |
|---|---|
| Production database | H-7 SQL **applied** (direct SQL). Columns + `stripe_webhook_receipts_status_claimed_at_idx` present. |
| Prisma migration history | `20260830_stripe_webhook_receipt_state` **recorded** via `prisma migrate resolve --applied`. `prisma migrate status --schema packages/database/prisma/schema.prisma` reports **Database schema is up to date!** |
| Application code | **Prepared locally** (state machine + Stripe route wiring). **Not deployed** to production yet. |

This runbook is H-7 only. It does not cover H-8 (billing identity separation) or H-9 (booking overlap / `btree_gist`).

## Rollout order (required)

1. **Database first** — apply `20260830_stripe_webhook_receipt_state` SQL, then mark it applied in `_prisma_migrations` if needed. ✅ Done on production.
2. **Application second** — deploy the local H-7 code that reads/writes `status`, `attempts`, `claimed_at`, `completed_at`, `last_error`. ⏳ Remaining.

Deploying the application before those columns exist would take `/api/webhooks/stripe` down. That risk is closed for production DB; keep the remaining app-deploy window short.

## What problem this closes

### Pre-H-7 behaviour on `main` (before this change)

Production used a **claim-once** model on `stripe_webhook_receipts`:

1. **Claim** — `INSERT` a receipt keyed by unique `event_id` (at the start of webhook handling).
2. **Process** — run the Stripe event handlers.
3. **On duplicate `event_id`** — treat as already seen (`duplicate`) and do not re-run handlers.

There was **no** reliable “release on failure” that deleted the receipt when a handler threw. A thrown error could leave the claim row in place, so Stripe’s retry often matched `event_id` and received `duplicate` without reprocessing. A hard crash (OOM, timeout, instance kill) had the same outcome: the claim survived, retries looked like duplicates, and the event could be lost with no durable signal that work was incomplete.

`processed_at` is `NOT NULL DEFAULT now()` and is set at **INSERT** (claim time), not at completion. Without a separate status field, a crashed claim and a successful claim look the same on disk.

### Why a schema change was required

Several handlers are **not** all idempotent (e.g. `markPublicStayPaidFromStripe`, `handleConnectAccountUpdated` have no event-id dedup). A stale sweep based only on `processed_at` would risk re-running successful events — worse than the gap. Distinguishing `processing` from `processed` / `failed` needs durable columns.

## Current H-7 state machine (application code, once deployed)

Implemented in `packages/platform-core/src/billing/webhook-receipt-state.ts` and wired from `src/app/api/webhooks/stripe/route.ts` via `withWebhookReceiptState` / `prismaReceiptStore`:

1. **Claim** — `INSERT` receipt as `status='processing'`, `attempts=1`, `claimed_at=now()` (unique on `event_id`).
2. **Process** — run the Stripe event handler.
3. **Complete** — on success, mark `status='processed'`, set `completed_at`, clear `last_error`.
4. **Fail / retry** — on handler throw, mark `status='failed'` with `last_error`, rethrow so the route returns a retryable error to Stripe; the next delivery may **reclaim** a `failed` row (attempts+1).
5. **Stale reclaim** — a `processing` row with `claimed_at` older than 15 minutes (`STALE_CLAIM_MS`) is treated as abandoned and can be reclaimed.
6. **Idempotent duplicates** — `processed` events (and safe deploy-window rows; see below) return duplicate and do **not** re-run handlers.
7. **Exhaustion** — `attempts ≥ 6` returns exhausted (HTTP 200 skip) and leaves the row `failed` for alerting so poison events do not loop forever.

| State | Meaning | Next |
|---|---|---|
| row absent | unseen | claim by INSERT → `processing` |
| `processing`, claim fresh | a worker is running it | duplicate; do not run |
| `processing`, claim older than 15 min | crashed | reclaim → `processing`, attempts+1 |
| `processing`, claim NULL | written by pre-H-7 app code during the DB→app window | duplicate; never re-run |
| `processed` | completed | duplicate; never re-run |
| `failed` | handler threw | reclaim immediately, attempts+1 |
| `attempts` ≥ 6 | permanently failing | `exhausted`; row left `failed` |

`exhausted` is a return value only; persisted statuses are `processing | processed | failed`.

15 minutes is well above the longest configured `maxDuration` (120s).

## Artefacts

| File | State |
|---|---|
| `packages/database/prisma/migrations/20260830_stripe_webhook_receipt_state/migration.sql` | Canonical SQL. **Applied on production** (direct SQL), then **marked applied** with `prisma migrate resolve --applied 20260830_stripe_webhook_receipt_state`. |
| `packages/database/prisma/schema.prisma` → `StripeWebhookReceipt` | Model includes the five H-7 fields and `@@index([status, claimedAt])`. Local change; deploy with app. |
| `packages/platform-core/src/billing/webhook-receipt-state.ts` | State machine + `prismaReceiptStore`. Local; **not deployed**. |
| `src/app/api/webhooks/stripe/route.ts` | Uses `withWebhookReceiptState`. Local; **not deployed**. |
| `scripts/test-webhook-receipt-state.mjs` | 14 unit tests covering claim / complete / fail / retry / stale reclaim / duplicates / deploy-window NULL claim. |

## How production H-7 SQL was applied

At apply time, production already had a reconciled `_prisma_migrations` history for the ten prior `main` migrations. H-7 was **not** introduced with `prisma migrate deploy` or `db push`.

1. **Direct SQL** from `packages/database/prisma/migrations/20260830_stripe_webhook_receipt_state/migration.sql` (additive, idempotent: `IF NOT EXISTS` / repeatable `SET DEFAULT`).
2. **History sync** (no SQL re-execution):

```bash
npx prisma migrate resolve --applied 20260830_stripe_webhook_receipt_state \
  --schema packages/database/prisma/schema.prisma
```

3. **Confirm:**

```bash
npx prisma migrate status --schema packages/database/prisma/schema.prisma
# → Database schema is up to date!
```

Do **not** use `db push` for this change. Do **not** re-run `migrate deploy` expecting it to “apply” H-7 again — it is already recorded as applied; re-running deploy should be a no-op for pending migrations when status is up to date.

## Migration SQL review (what was executed)

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
| Backward compatible with existing rows | Yes. Additive only. Pre-H-7 app code did not SELECT these columns, so it kept working after SQL apply. |
| Idempotent | Yes. `IF NOT EXISTS` on columns/index; `SET DEFAULT` is repeatable. |
| Non-destructive | Yes. No live `DROP` / `DELETE` / `TRUNCATE` / type change. |
| Safe for existing data | Yes. Existing rows backfilled to `'processed'` via the `ADD COLUMN` default. (Production had **0** receipt rows at apply time.) |
| Matches Prisma model / store | Yes. Names, nullability, defaults, and index name align with `schema.prisma` and `prismaReceiptStore`. |

Two-step default is load-bearing: step 1 backfills history to `'processed'`; step 2 sets future inserts to `'processing'` because rows are created at claim time.

## The DB → app deployment window (current)

Production DB has H-7 columns; production app is still the pre-H-7 claim-once inserter. That code inserts a receipt without setting `status` / `claimed_at`, so new rows during this window land as:

- `status='processing'` (column default), and
- `claimed_at` NULL

even when handling completed (or failed) under the old code.

The H-7 state machine treats `processing` + NULL `claimed_at` as **already_processed** (never as a reclaimable crash), because handlers are not all idempotent. Keep this window short; expect a small number of such rows if any webhooks arrive before app deploy.

## Remaining sequence — deploy application

Database steps above are **done**. Remaining work:

### 1. Pre-deploy check (read-only)

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'stripe_webhook_receipts'
  AND column_name IN ('status','attempts','claimed_at','completed_at','last_error');

SELECT indexname FROM pg_indexes
WHERE tablename = 'stripe_webhook_receipts'
  AND indexname = 'stripe_webhook_receipts_status_claimed_at_idx';
```

Confirm `GET /api/webhooks/stripe` still returns `{ status: "ok" }` on production (old app).

### 2. Deploy the application

Ship the local H-7 application changes. Regenerate the Prisma client as part of the build (`npm run db:generate`) so the client includes the new fields.

### 3. Verify the webhook (after app deploy)

Send a Stripe test event (prefer staging if available), then:

```sql
SELECT event_id, event_type, status, attempts, claimed_at, completed_at, last_error
FROM stripe_webhook_receipts
ORDER BY processed_at DESC
LIMIT 5;
```

Confirm:

- **claim** — row with `status='processing'`, `attempts=1`, `claimed_at` set (briefly, or already settled);
- **process** — settles to `status='processed'` with `completed_at` set and `last_error` NULL;
- **duplicate** — replaying the same event id returns 200 without re-running the handler; `attempts` does not increase;
- **retry** — a handler failure leaves `status='failed'` with `last_error`; the next delivery reclaims with `attempts` incremented;
- **recover** — a row left `processing` with `claimed_at` older than 15 minutes is reclaimed rather than reported as a duplicate.

Force handler failures only on staging. Confirm Stripe Dashboard shows 200s and no rise in failed deliveries.

### 4. Rollback (if needed after app deploy)

Revert the **application** deployment first. Pre-H-7 code ignores the H-7 columns and keeps working with them present — preferred rollback.

Only drop columns if you must revert schema **and** no deployed code references them:

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

If columns are dropped, also reconcile Prisma history (e.g. `migrate resolve --rolled-back` / follow-up) before treating the tree as clean — prefer not to drop once the H-7 app is live.

## Interim position (until app deploy)

- **DB / Prisma history:** complete for H-7.
- **Crash / retry semantics in production:** still the pre-H-7 claim-once behaviour until the prepared application is deployed.
- Stripe retains failed deliveries for ~3 days in the Dashboard for manual replay if needed during the remaining window.
