import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { PrismaClient } from "@prisma/client";
import { handleReconcile991, handleReconcile991Action, RECONCILE_991_CONFIRMATION } from "../src/lib/reconcile-991.ts";

const prisma = new PrismaClient({ log: [] });
const control = new PrismaClient({ log: [] });
const migration = "20261007_ai_worker_provisioning_boundary";
const checksum = "55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d";
const ddl = readFileSync("packages/database/prisma/migrations/20261007_ai_worker_provisioning_boundary/migration.sql", "utf8");
const origin = "https://app.digitalgate.com.au";
let secret;
const request = (extra = {}) => new Request(`${origin}/api/admin/reconcile-991`, { method: "POST", headers: {
  Origin: origin, "X-DG-Operation": "reconcile_991", "X-DG-Reconcile-991-Secret": secret }, ...extra });
const invoke = (req = request(), userId = "user_operator", db = prisma) => handleReconcile991(req, {
  userId: async () => userId, database: () => db,
});
const invokeAction = (confirmation = RECONCILE_991_CONFIRMATION, options = {}) => handleReconcile991Action(confirmation, {
  userId: async () => typeof options.userId === "function"
    ? options.userId()
    : options.userId === undefined ? "user_operator" : options.userId,
  database: () => options.database ?? prisma,
  isCurrentPlatformOperator: options.isCurrentPlatformOperator ?? (async userId => userId === "user_operator"),
});
const history = async () => (await prisma.$queryRaw`SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY id)::text,'[]') AS snapshot FROM public._prisma_migrations m`)[0].snapshot;
const refused = async result => {
  assert.equal(result.status, 403);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal(result.headers.get("location"), null);
  assert.deepEqual(await result.json(), { ok: false, operation: "reconcile_991" });
};

before(async () => {
  // Cannot be run against an existing database, even if a URL is inherited.
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.pathname, "/dg_991_test");
  assert.notEqual(url.port, "5432");
  assert.match(process.env.DG_RECONCILE_TEST_MARKER, /^[a-f0-9-]{36}$/);
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS db, host(inet_server_addr()) AS host,
    current_setting('dg.reconcile_test_cluster',true) AS marker`;
  assert.equal(identity.db, "dg_991_test");
  assert.equal(identity.host, "127.0.0.1");
  assert.equal(identity.marker, process.env.DG_RECONCILE_TEST_MARKER);
  assert.equal(createHash("sha256").update(ddl).digest("hex"), checksum);
});
beforeEach(async () => {
  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";
  process.env.DG_RECONCILE_991_OPERATION = "reconcile_991";
  process.env.DG_COMMAND_CENTRE_ORG_IDS = "operator_org";
  delete process.env.AI_WORKER_PROVISIONING_ENABLED;
  secret = randomBytes(32).toString("hex");
  process.env.DG_RECONCILE_991_SECRET_SHA256 = createHash("sha256").update(secret).digest("hex");
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS public.ai_worker_provisioning_receipts CASCADE');
  await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS public.ai_worker_pinned_name_unique');
  await prisma.$executeRawUnsafe('ALTER TABLE public._prisma_migrations DROP CONSTRAINT IF EXISTS reject_zero');
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS history_mutator ON public._prisma_migrations');
  await prisma.$executeRawUnsafe('TRUNCATE public._prisma_migrations, public.memberships, public.ai_accounting_outbox, public.ai_worker_principals, public.ai_local_deployments, public.ai_local_recipient_approvals, public.ai_inference_jobs, public.ai_worker_claim_receipts');
  for (const sql of ddl.replace(/^--.*$/gm, "").split(";").map(x => x.trim()).filter(Boolean)) await prisma.$executeRawUnsafe(sql);
  await prisma.$executeRaw`INSERT INTO public.memberships VALUES ('member1','operator_org','user_operator','owner','active')`;
  await prisma.$executeRaw`INSERT INTO public._prisma_migrations VALUES
    ('2cfc11d5-22c2-4151-bba2-9b707b03219a','0e2376fdfb12b7b871f9dfc9177867d6fb7f674daf71a98d510d874edc19ebbc',
      '2026-10-07T01:27:01.271473Z','20261007_ai_gateway_slice3_local_routine','',NULL,'2026-10-07T01:27:01.271473Z',0),
    ('43598594-01bb-49dd-b47f-c3c813346670','unrelated-checksum','2026-08-30T22:42:11.602284Z',
      '20260819_add_partner_programme','',NULL,'2026-08-30T22:42:11.602284Z',0)`;
});
after(async () => { await Promise.all([prisma.$disconnect(), control.$disconnect()]); });

test("exact resolve semantics, original microsecond history unchanged, duplicate fails closed", async () => {
  const before = await history();
  const response = await invoke();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("location"), null);
  assert.deepEqual(await response.json(), { ok: true, operation: "reconcile_991" });
  const rows = await prisma.$queryRaw`SELECT *, started_at::text AS start, finished_at::text AS finish
    FROM public._prisma_migrations WHERE migration_name=${migration}`;
  assert.equal(rows.length, 1);
  assert.match(rows[0].id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(rows[0].checksum, checksum);
  assert.equal(rows[0].start, rows[0].finish);
  assert.ok(rows[0].finished_at);
  assert.equal(rows[0].rolled_back_at, null);
  assert.equal(rows[0].logs, "");
  assert.equal(rows[0].applied_steps_count, 0);
  const [old] = await prisma.$queryRaw`SELECT jsonb_agg(to_jsonb(m) ORDER BY id)::text AS snapshot
    FROM public._prisma_migrations m WHERE migration_name<>${migration}`;
  assert.equal(old.snapshot, before);
  const after = await history();
  await refused(await invoke());
  assert.equal(await history(), after);
});

test("environment, disabled activation and provisioning window fail before auth/database", async () => {
  for (const [key, value] of [["VERCEL_ENV","preview"],["VERCEL_ENV","development"],["NODE_ENV","development"],
    ["DG_RECONCILE_991_OPERATION","other"],["DG_RECONCILE_991_OPERATION",undefined],["AI_WORKER_PROVISIONING_ENABLED","true"]]) {
    const previous = process.env[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    await refused(await handleReconcile991(request(), { userId: () => assert.fail("auth called"), database: () => assert.fail("database called") }));
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
});

test("wrong/missing secret/hash, operation, method, origin, body and query fail before database", async () => {
  const base = Object.fromEntries(request().headers);
  const requests = [request({ method: "GET" }), request({ body: "{}" }),
    request({ headers: { ...base, "x-dg-operation": "arbitrary_sql" } }),
    request({ headers: { ...base, origin: "https://evil.example" } }),
    request({ headers: { ...base, "x-dg-reconcile-991-secret": "b".repeat(64) } }),
    request({ headers: { ...base, "x-dg-reconcile-991-secret": "" } }),
    new Request(`${origin}/api/admin/reconcile-991?migration=other`, { method: "POST", headers: base }),
    new Request("https://preview.vercel.app/api/admin/reconcile-991", { method: "POST", headers: base })];
  for (const req of requests) await refused(await invoke(req, "user_operator", { $transaction: () => assert.fail("database called") }));
  for (const hash of ["", "not-a-hash", "A".repeat(64)]) {
    process.env.DG_RECONCILE_991_SECRET_SHA256 = hash;
    await refused(await invoke());
  }
});

test("no identity, API key, ordinary admin, inactive owner and unallowlisted owner refused", async () => {
  const before = await history();
  for (const id of [null, "api_key:owner", "other_user"]) await refused(await invoke(request(), id));
  for (const [role, status, org] of [["admin","active","operator_org"],["owner","inactive","operator_org"],["owner","active","tenant"]]) {
    await prisma.$executeRaw`UPDATE public.memberships SET role=${role},status=${status},organisation_id=${org}`;
    await refused(await invoke());
  }
  assert.equal(await history(), before);
});

test("existing staff authority is accepted without organisation/session provisioning", async () => {
  await prisma.$executeRaw`UPDATE public.memberships SET role='dg:staff',organisation_id='staff_org'`;
  assert.equal((await invoke()).status, 200);
  assert.equal((await prisma.membership.count()), 1);
});

for (const sql of [
  'DROP TABLE public.ai_worker_provisioning_receipts',
  'ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN fingerprint DROP NOT NULL',
  'ALTER TABLE public.ai_worker_provisioning_receipts ALTER COLUMN created_at SET DEFAULT now()',
  'ALTER TABLE public.ai_worker_provisioning_receipts DROP CONSTRAINT ai_worker_provisioning_receipts_nonce_check',
  'DROP INDEX public.ai_worker_provisioning_window_idx',
  "DROP INDEX public.ai_worker_pinned_name_unique; CREATE UNIQUE INDEX ai_worker_pinned_name_unique ON public.ai_worker_principals(name) WHERE name='wrong-worker'",
  'ALTER TABLE public.ai_worker_provisioning_receipts ENABLE ROW LEVEL SECURITY',
]) test(`physical schema drift refuses: ${sql}`, async () => {
  const before = await history();
  for (const statement of sql.split(";")) await prisma.$executeRawUnsafe(statement);
  await refused(await invoke());
  assert.equal(await history(), before);
});

for (const older of ["20260901_stripe_connect_tenant_trust","20260904_business_brain_knowledge",
  "20260910_aida_public_conversations","20260913_ai_visibility_intelligence"]) test(`older history stays unresolved: ${older}`, async () => {
  await prisma.$executeRaw`INSERT INTO public._prisma_migrations (id,checksum,migration_name) VALUES ('older','older',${older})`;
  const before = await history();
  await refused(await invoke());
  assert.equal(await history(), before);
});

for (const table of ["ai_worker_principals","ai_local_deployments","ai_local_recipient_approvals","ai_inference_jobs",
  "ai_worker_claim_receipts","ai_worker_provisioning_receipts"]) test(`nonzero state refused: ${table}`, async () => {
  if (table === "ai_worker_principals") await prisma.$executeRaw`INSERT INTO public.ai_worker_principals VALUES ('worker','worker')`;
  else if (table === "ai_worker_provisioning_receipts") await prisma.$executeRaw`INSERT INTO public.ai_worker_provisioning_receipts
    (nonce,fingerprint,window_id,operation,outcome) VALUES (${"a".repeat(64)},${"b".repeat(64)},${"c".repeat(32)},'provision','attempt')`;
  else await prisma.$executeRawUnsafe(`INSERT INTO public.${table} VALUES ('fixture')`);
  const before = await history();
  await refused(await invoke());
  assert.equal(await history(), before);
});

test("accounting outbox activity refuses reconciliation", async () => {
  const before = await history();
  await prisma.$executeRaw`INSERT INTO public.ai_accounting_outbox (id) VALUES ('pending')`;
  await refused(await invoke());
  assert.equal(await history(), before);
});

test("outbox writes racing reconciliation are fenced by the table lock", async () => {
  let response;
  let waiting = false;
  await control.$transaction(async tx => {
    await tx.$executeRaw`LOCK TABLE public.ai_accounting_outbox IN SHARE ROW EXCLUSIVE MODE`;
    response = invoke();
    for (let i=0; i<200; i++) {
      const [lock] = await tx.$queryRaw`SELECT EXISTS (
        SELECT 1 FROM pg_locks WHERE relation='public.ai_accounting_outbox'::regclass
          AND mode='ShareLock' AND NOT granted) AS waiting`;
      if (lock.waiting) { waiting = true; break; }
      await delay(10);
    }
    assert.ok(waiting, "reconciliation must wait on the accounting outbox lock");
    await tx.$executeRaw`INSERT INTO public.ai_accounting_outbox (id) VALUES ('racing-write')`;
  }, { timeout: 10000 });
  await refused(await response);
  assert.equal((await prisma.$queryRaw`SELECT count(*)::int AS n FROM public._prisma_migrations WHERE migration_name=${migration}`)[0].n, 0);
});

test("unfinished and rolled-back migration rows refuse reconciliation", async () => {
  const before = await history();
  await prisma.$executeRaw`UPDATE public._prisma_migrations SET finished_at=NULL WHERE id='2cfc11d5-22c2-4151-bba2-9b707b03219a'`;
  await refused(await invoke());
  await prisma.$executeRaw`UPDATE public._prisma_migrations SET finished_at=started_at, rolled_back_at=started_at WHERE id='2cfc11d5-22c2-4151-bba2-9b707b03219a'`;
  await refused(await invoke());
  assert.notEqual(await history(), before);
  assert.equal((await prisma.$queryRaw`SELECT count(*)::int AS n FROM public._prisma_migrations WHERE migration_name=${migration}`)[0].n, 0);
});

test("concurrent invocations permit exactly one insert", async () => {
  const responses = await Promise.all([invoke(),invoke()]);
  assert.deepEqual(responses.map(x => x.status).sort(), [200,403]);
  assert.equal((await prisma.$queryRaw`SELECT count(*)::int AS n FROM public._prisma_migrations WHERE migration_name=${migration}`)[0].n, 1);
});

async function afterPrecheck(change) {
  let finish;
  let response;
  await control.$transaction(async tx => {
    await tx.$executeRaw`LOCK TABLE public._prisma_migrations IN SHARE ROW EXCLUSIVE MODE`;
    response = invoke();
    for (let i=0; i<200; i++) {
      const [lock] = await tx.$queryRaw`SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND classid=991 AND objid=20261007 AND granted) AS held`;
      if (lock.held) { finish=true; break; }
      await delay(10);
    }
    assert.ok(finish, "invocation reached advisory lock after successful prechecks");
    await change(tx);
  }, { timeout: 10000 });
  return response;
}
test("operator and state are rechecked after locking", async () => {
  const before = await history();
  await refused(await afterPrecheck(tx => tx.$executeRaw`UPDATE public.memberships SET status='inactive'`));
  assert.equal(await history(), before);
});

test("operator action refuses missing activation, invalid confirmation, unauthenticated and non-operator submissions before transaction", async () => {
  const noTransaction = { $transaction: () => assert.fail("transaction must not start") };
  assert.equal(await invokeAction(null, { database: noTransaction }), "refused");
  assert.equal(await invokeAction("", { database: noTransaction }), "refused");
  assert.equal(await invokeAction(RECONCILE_991_CONFIRMATION, { userId: null, database: noTransaction }), "refused");
  assert.equal(await invokeAction(RECONCILE_991_CONFIRMATION, { userId: "api_key:operator", database: noTransaction }), "refused");
  assert.equal(await invokeAction(RECONCILE_991_CONFIRMATION, {
    database: noTransaction, isCurrentPlatformOperator: async () => false,
  }), "refused");

  const previous = process.env.DG_RECONCILE_991_OPERATION;
  const previousVercel = process.env.VERCEL_ENV;
  const previousNode = process.env.NODE_ENV;
  const previousWorkers = process.env.AI_WORKER_PROVISIONING_ENABLED;
  for (const [key, value] of [["DG_RECONCILE_991_OPERATION", undefined], ["VERCEL_ENV", "preview"],
    ["NODE_ENV", "development"], ["AI_WORKER_PROVISIONING_ENABLED", "true"]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
    assert.equal(await invokeAction(RECONCILE_991_CONFIRMATION, {
      database: noTransaction, userId: async () => assert.fail("auth must not run when disabled"),
    }), "refused");
  }
  if (previous === undefined) delete process.env.DG_RECONCILE_991_OPERATION;
  else process.env.DG_RECONCILE_991_OPERATION = previous;
  process.env.VERCEL_ENV = previousVercel;
  process.env.NODE_ENV = previousNode;
  if (previousWorkers === undefined) delete process.env.AI_WORKER_PROVISIONING_ENABLED;
  else process.env.AI_WORKER_PROVISIONING_ENABLED = previousWorkers;
});

test("operator action rechecks revoked authority inside the transaction", async () => {
  const before = await history();
  const result = await invokeAction(RECONCILE_991_CONFIRMATION, {
    isCurrentPlatformOperator: async () => {
      await prisma.$executeRaw`UPDATE public.memberships SET status='inactive'`;
      return true;
    },
  });
  assert.equal(result, "refused");
  assert.equal(await history(), before);
  await prisma.$executeRaw`UPDATE public.memberships SET status='active'`;
});

test("operator action concurrency and replay permit one history insert only", async () => {
  const concurrent = await Promise.all([invokeAction(), invokeAction()]);
  assert.deepEqual(concurrent.sort(), ["refused", "success"]);
  assert.equal((await prisma.$queryRaw`SELECT count(*)::int AS n FROM public._prisma_migrations WHERE migration_name=${migration}`)[0].n, 1);
  const [protectedState] = await prisma.$queryRaw`SELECT
    (SELECT count(*) FROM public.ai_accounting_outbox) +
    (SELECT count(*) FROM public.ai_worker_principals) +
    (SELECT count(*) FROM public.ai_local_deployments) +
    (SELECT count(*) FROM public.ai_local_recipient_approvals) +
    (SELECT count(*) FROM public.ai_inference_jobs) +
    (SELECT count(*) FROM public.ai_worker_claim_receipts) +
    (SELECT count(*) FROM public.ai_worker_provisioning_receipts) AS protected_rows`;
  assert.equal(protectedState.protected_rows, 0n);
  assert.equal(await invokeAction(), "refused");
  assert.equal((await prisma.$queryRaw`SELECT count(*)::int AS n FROM public._prisma_migrations WHERE migration_name=${migration}`)[0].n, 1);
});

test("operator action surfaces ambiguous completion and never retries", async () => {
  let attempts = 0;
  const database = { $transaction: async () => { attempts++; throw new Error("simulated commit acknowledgement loss"); } };
  assert.equal(await invokeAction(RECONCILE_991_CONFIRMATION, { database }), "ambiguous");
  assert.equal(attempts, 1);
});

test("operator action keeps credentials server-side and does not call the HTTP route", async () => {
  const action = readFileSync("src/app/(shell)/command/reconcile-991/actions.ts", "utf8");
  const form = readFileSync("src/app/(shell)/command/reconcile-991/Reconcile991Form.tsx", "utf8");
  const page = readFileSync("src/app/(shell)/command/reconcile-991/page.tsx", "utf8");
  assert.match(action, /auth\(\{ acceptsToken: 'session_token' \}\)/);
  assert.match(action, /handleReconcile991Action/);
  assert.doesNotMatch(action, /fetch\s*\(|SECRET_SHA256|X-DG-Reconcile-991-Secret|process\.env\.DATABASE_URL/);
  assert.doesNotMatch(form, /SECRET|DATABASE_URL|fetch\s*\(/);
  assert.doesNotMatch(page, /runReconcile991Action\s*\(/);
});
test("schema is rechecked after locking", async () => {
  const before = await history();
  await refused(await afterPrecheck(tx => tx.$executeRaw`DROP INDEX public.ai_worker_provisioning_window_idx`));
  assert.equal(await history(), before);
});
test("changed unrelated history during lock acquisition prevents mutation", async () => {
  await refused(await afterPrecheck(tx => tx.$executeRaw`UPDATE public._prisma_migrations SET logs='external change'`));
  assert.equal((await prisma.$queryRaw`SELECT count(*)::int AS n FROM public._prisma_migrations WHERE migration_name=${migration}`)[0].n, 0);
});
test("insert failure rolls back and returns no driver error or credential", async () => {
  await prisma.$executeRaw`ALTER TABLE public._prisma_migrations ADD CONSTRAINT reject_zero CHECK (applied_steps_count<>0) NOT VALID`;
  const before = await history();
  await refused(await invoke());
  assert.equal(await history(), before);
});

test("route and middleware contain no redirect, logger, global database or session provisioning path", () => {
  const route = readFileSync("src/app/api/admin/reconcile-991/route.ts", "utf8");
  const core = readFileSync("src/lib/reconcile-991.ts", "utf8");
  const middleware = readFileSync("src/middleware.ts", "utf8");
  assert.match(route, /import "server-only"/);
  assert.match(core, /import "server-only"/);
  assert.doesNotMatch(route+core, /console\.|captureException|\$\w+RawUnsafe|child_process|resolveActivePlatformSession|requirePlatformAuth|@dg\/database|Response\.redirect/);
  assert.match(middleware, /req\.nextUrl\.pathname === "\/api\/admin\/reconcile-991" \|\| req\.nextUrl\.pathname === PHYSICAL_991_PATH/);
  assert.match(middleware, /if \(path === "\/api\/admin\/reconcile-991"\) \{\s*return \(await clerkHandler/);
});
