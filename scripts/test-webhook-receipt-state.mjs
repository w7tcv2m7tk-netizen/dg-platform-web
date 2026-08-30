/**
 * H-7 crash recovery — state machine tests.
 *
 * This covers the implementation that lands once
 * prisma/baseline/proposed/stripe_webhook_receipt_state.sql is applied. It is
 * tested now so the migration can be reviewed against proven behaviour, and so
 * the deployment is a wiring change rather than new untested logic.
 *
 * The in-memory store mirrors the SQL semantics exactly: insert is a unique
 * constraint, reclaim is a conditional UPDATE returning affected rows.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = () =>
  import(
    pathToFileURL(
      path.join(
        __dirname,
        "../packages/platform-core/src/billing/webhook-receipt-state.ts",
      ),
    ).href
  );

/**
 * @param seed rows that already exist, e.g. historical receipts backfilled to
 *   'processed' by the migration.
 */
function memoryStore(seed = []) {
  const rows = new Map();
  for (const row of seed) rows.set(row.eventId, { ...row });

  return {
    rows,
    async insertClaim(eventId, eventType, organisationId) {
      if (rows.has(eventId)) return false; // unique constraint
      rows.set(eventId, {
        eventId,
        eventType,
        organisationId,
        status: "processing",
        attempts: 1,
        claimedAt: new Date(),
        completedAt: null,
      });
      return true;
    },
    async read(eventId) {
      const row = rows.get(eventId);
      return row ? { ...row } : null;
    },
    async reclaim(eventId, staleBefore) {
      const row = rows.get(eventId);
      if (!row) return null;
      // Conditional UPDATE: failed, or processing with an abandoned claim.
      const eligible =
        row.status === "failed" ||
        (row.status === "processing" &&
          row.claimedAt !== null &&
          row.claimedAt.getTime() <= staleBefore.getTime());
      if (!eligible) return null;
      row.attempts += 1;
      row.status = "processing";
      row.claimedAt = new Date();
      return row.attempts;
    },
    async markProcessed(eventId) {
      const row = rows.get(eventId);
      if (row) {
        row.status = "processed";
        row.completedAt = new Date();
      }
    },
    async markFailed(eventId, error) {
      const row = rows.get(eventId);
      if (row) {
        row.status = "failed";
        row.lastError = error;
      }
    },
  };
}

const run = async (store, handle, extra = {}) => {
  const { withWebhookReceiptState } = await load();
  return withWebhookReceiptState({
    store,
    eventId: extra.eventId ?? "evt_1",
    eventType: "invoice.paid",
    organisationId: "org_a",
    handle,
    ...extra,
  });
};

describe("H-7: first delivery and successful processing", () => {
  it("processes an unseen event exactly once and marks it completed", async () => {
    const store = memoryStore();
    let calls = 0;

    const outcome = await run(store, async () => {
      calls += 1;
      return "ok";
    });

    assert.equal(outcome.status, "processed");
    assert.equal(outcome.result, "ok");
    assert.equal(calls, 1);

    const row = await store.read("evt_1");
    assert.equal(row.status, "processed");
    assert.ok(row.completedAt);
  });
});

describe("H-7: duplicate delivery", () => {
  it("does not re-run a completed event", async () => {
    const store = memoryStore();
    let calls = 0;
    const handler = async () => {
      calls += 1;
      return "ok";
    };

    assert.equal((await run(store, handler)).status, "processed");

    const second = await run(store, handler);
    assert.equal(second.status, "duplicate");
    assert.equal(second.reason, "already_processed");
    assert.equal(calls, 1);
  });

  it("does not re-run an event another worker is actively holding", async () => {
    const store = memoryStore();
    let concurrent = 0;
    let maxConcurrent = 0;
    let calls = 0;

    const handler = async () => {
      calls += 1;
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 15));
      concurrent -= 1;
      return "ok";
    };

    const results = await Promise.all([
      run(store, handler),
      run(store, handler),
      run(store, handler),
    ]);

    assert.equal(calls, 1, "only one worker may execute the handler");
    assert.equal(maxConcurrent, 1);
    assert.equal(results.filter((r) => r.status === "processed").length, 1);
    assert.equal(results.filter((r) => r.status === "duplicate").length, 2);
  });
});

describe("H-7: handler failure and retry", () => {
  it("records failure and rethrows so the caller can return a retryable status", async () => {
    const store = memoryStore();

    await assert.rejects(
      run(store, async () => {
        throw new Error("downstream exploded");
      }),
      /downstream exploded/,
    );

    const row = await store.read("evt_1");
    assert.equal(row.status, "failed");
    assert.equal(row.lastError, "downstream exploded");
  });

  it("retries after a failure and succeeds, processing exactly once overall", async () => {
    const store = memoryStore();
    let attempts = 0;
    const handler = async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("transient");
      return "recovered";
    };

    await assert.rejects(run(store, handler), /transient/);

    const second = await run(store, handler);
    assert.equal(second.status, "processed");
    assert.equal(second.result, "recovered");
    assert.equal(attempts, 2);

    const row = await store.read("evt_1");
    assert.equal(row.status, "processed");
    assert.equal(row.attempts, 2);
  });

  it("stops retrying a permanently failing event instead of looping forever", async () => {
    const { MAX_ATTEMPTS } = await load();
    const store = memoryStore();
    const handler = async () => {
      throw new Error("always broken");
    };

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      await assert.rejects(run(store, handler), /always broken/);
    }

    const outcome = await run(store, handler);
    assert.equal(outcome.status, "exhausted");
    assert.equal(outcome.attempts, MAX_ATTEMPTS);

    const row = await store.read("evt_1");
    assert.equal(row.status, "failed", "left failed for alerting, not deleted");
  });
});

describe("H-7: abandoned claim (crash) recovery", () => {
  it("recovers a claim whose owner died, once it is provably stale", async () => {
    const { STALE_CLAIM_MS } = await load();

    // A worker claimed this and was killed before completing.
    const crashedAt = new Date(Date.now() - STALE_CLAIM_MS - 60_000);
    const store = memoryStore([
      {
        eventId: "evt_crashed",
        status: "processing",
        attempts: 1,
        claimedAt: crashedAt,
        completedAt: null,
      },
    ]);

    let calls = 0;
    const outcome = await run(
      store,
      async () => {
        calls += 1;
        return "recovered";
      },
      { eventId: "evt_crashed" },
    );

    assert.equal(outcome.status, "processed");
    assert.equal(calls, 1);

    const row = await store.read("evt_crashed");
    assert.equal(row.status, "processed");
    assert.equal(row.attempts, 2);
  });

  it("does NOT steal a claim that is still within the stale window", async () => {
    const { STALE_CLAIM_MS } = await load();

    // Claimed one minute ago — could genuinely still be running.
    const recent = new Date(Date.now() - Math.min(60_000, STALE_CLAIM_MS / 2));
    const store = memoryStore([
      {
        eventId: "evt_inflight",
        status: "processing",
        attempts: 1,
        claimedAt: recent,
        completedAt: null,
      },
    ]);

    let calls = 0;
    const outcome = await run(store, async () => {
      calls += 1;
      return "should not run";
    }, { eventId: "evt_inflight" });

    assert.equal(outcome.status, "duplicate");
    assert.equal(outcome.reason, "in_flight");
    assert.equal(calls, 0, "must not run concurrently with a live worker");
  });
});

describe("H-7: existing historical receipts", () => {
  it("treats migration-backfilled rows as completed and never reprocesses them", async () => {
    // The migration backfills every pre-existing row to status='processed'
    // with NULL claimedAt. Those must never re-run.
    const store = memoryStore([
      {
        eventId: "evt_historical",
        status: "processed",
        attempts: 1,
        claimedAt: null,
        completedAt: null,
      },
    ]);

    let calls = 0;
    const outcome = await run(store, async () => {
      calls += 1;
      return "should not run";
    }, { eventId: "evt_historical" });

    assert.equal(outcome.status, "duplicate");
    assert.equal(outcome.reason, "already_processed");
    assert.equal(calls, 0);
  });

  it("a NULL claimedAt on a processed row is never treated as stale", async () => {
    const store = memoryStore([
      {
        eventId: "evt_hist2",
        status: "processed",
        attempts: 1,
        claimedAt: null,
        completedAt: null,
      },
    ]);

    // Even far in the future, a processed row stays processed.
    const outcome = await run(
      store,
      async () => "should not run",
      { eventId: "evt_hist2", now: new Date(Date.now() + 365 * 86_400_000) },
    );

    assert.equal(outcome.status, "duplicate");
    assert.equal(outcome.reason, "already_processed");
  });
});

describe("H-7: migration artefact safety", () => {
  it("backfills history as processed but defaults new claims to processing", async () => {
    const { readFile } = await import("node:fs/promises");
    const sql = await readFile(
      path.join(
        __dirname,
        "../packages/database/prisma/migrations/20260830_stripe_webhook_receipt_state/migration.sql",
      ),
      "utf8",
    );

    // Existing rows must land on 'processed' so nothing is reprocessed.
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'processed'/);
    // New rows are claims, so the ongoing default must change.
    assert.match(sql, /ALTER COLUMN "status" SET DEFAULT 'processing'/);
    // Idempotent.
    assert.match(sql, /ADD COLUMN IF NOT EXISTS "attempts"/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS/);
    // No destructive statements.
    assert.doesNotMatch(sql, /\bDROP TABLE\b/);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/);
    assert.doesNotMatch(sql, /\bDELETE FROM\b/);
    assert.doesNotMatch(sql, /\bALTER COLUMN "(?!status")[a-z_]+" (TYPE|SET NOT NULL)/);
  });

  it("is the single copy, so no second artefact can drift from it", async () => {
    const { readdir } = await import("node:fs/promises");
    const proposed = await readdir(
      path.join(__dirname, "../packages/database/prisma/baseline/proposed"),
    ).catch(() => []);

    assert.ok(
      !proposed.some((f) => f.includes("stripe_webhook_receipt")),
      "the migration must not also exist under baseline/proposed",
    );
  });

  it("agrees with the Prisma model it is applied for", async () => {
    const { readFile } = await import("node:fs/promises");
    const [sql, schema] = await Promise.all([
      readFile(
        path.join(
          __dirname,
          "../packages/database/prisma/migrations/20260830_stripe_webhook_receipt_state/migration.sql",
        ),
        "utf8",
      ),
      readFile(path.join(__dirname, "../packages/database/prisma/schema.prisma"), "utf8"),
    ]);

    const model = schema.slice(
      schema.indexOf("model StripeWebhookReceipt"),
      schema.indexOf("@@map(\"stripe_webhook_receipts\")"),
    );
    assert.ok(model.length > 0, "StripeWebhookReceipt model not found");

    // Deploying code against a migration that omits a column takes the webhook
    // endpoint down, so every mapped column must appear in the migration.
    for (const column of ["status", "attempts", "claimed_at", "completed_at", "last_error"]) {
      assert.match(sql, new RegExp(`ADD COLUMN IF NOT EXISTS "${column}"`));
    }
    assert.match(model, /status\s+String\s+@default\("processing"\)/);
    assert.match(model, /attempts\s+Int\s+@default\(1\)/);
    assert.match(model, /@@index\(\[status, claimedAt\]\)/);

    // Prisma generates this exact index name for that @@index, so the migration
    // and a future `migrate diff` cannot disagree.
    assert.match(sql, /"stripe_webhook_receipts_status_claimed_at_idx"/);
  });
});

/**
 * The migration flips the `status` default to 'processing' while the previously
 * deployed code is still running. That code inserts a receipt only AFTER a
 * successful handler run and specifies neither `status` nor `claimed_at`, so
 * every row written during the deployment window lands as 'processing' with a
 * NULL claim despite having completed. Re-running those events would duplicate
 * non-idempotent side effects (paid-stay marker, Connect account update).
 */
describe("Deployment window: 'processing' rows with no claim timestamp", () => {
  it("treats a NULL claim as already processed, never as a crash", async () => {
    const { claimWebhookEvent } = await load();
    const store = memoryStore();

    // Exactly what the pre-deployment code plus the new column default produce.
    store.rows.set("evt_window", {
      eventId: "evt_window",
      status: "processing",
      attempts: 1,
      claimedAt: null,
      completedAt: null,
    });

    const outcome = await claimWebhookEvent(store, {
      eventId: "evt_window",
      eventType: "checkout.session.completed",
    });

    assert.equal(outcome.kind, "duplicate");
    assert.equal(outcome.reason, "already_processed");
  });

  it("stays a duplicate long after any stale threshold would have expired", async () => {
    const { claimWebhookEvent, STALE_CLAIM_MS } = await load();
    const store = memoryStore();
    store.rows.set("evt_window_old", {
      eventId: "evt_window_old",
      status: "processing",
      attempts: 1,
      claimedAt: null,
      completedAt: null,
    });

    const outcome = await claimWebhookEvent(store, {
      eventId: "evt_window_old",
      eventType: "invoice.paid",
      now: new Date(Date.now() + STALE_CLAIM_MS * 100),
    });

    assert.equal(outcome.kind, "duplicate", "a NULL claim must never age into a reclaim");
  });

  it("does not rely on the store to reject a NULL claim", async () => {
    const { claimWebhookEvent } = await load();
    const store = memoryStore();
    store.rows.set("evt_permissive", {
      eventId: "evt_permissive",
      status: "processing",
      attempts: 1,
      claimedAt: null,
      completedAt: null,
    });
    // A store that would happily reclaim anything must still not be reached.
    let reclaimCalled = false;
    const permissive = {
      ...store,
      async reclaim() {
        reclaimCalled = true;
        return 2;
      },
    };

    const outcome = await claimWebhookEvent(permissive, {
      eventId: "evt_permissive",
      eventType: "invoice.paid",
    });

    assert.equal(outcome.kind, "duplicate");
    assert.equal(reclaimCalled, false, "must decide before attempting a reclaim");
  });
});
