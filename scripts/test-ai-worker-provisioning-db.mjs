import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, generateKeyPairSync, createHash } from "node:crypto";
import { prisma, PrismaClient } from "@dg/database";
import { executeProvision, provisioningConfig, PINNED_WORKER } from "../packages/platform-core/src/ai/local-worker-provisioning.ts";
const control = new PrismaClient();
const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = pair.publicKey.export({ format: "jwk" });
const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]);
let config;
const safeResult = result => ({ code: result.code }); // Never assert/render the one-time response object.
const request = (operation = "provision", workerId) => ({ operation, ...(workerId ? { workerId } : {}), nonce: randomBytes(32).toString("hex"), fingerprint: config.fingerprint, timestamp: Date.now() });
before(async () => {
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1"); assert.notEqual(url.port, "5432"); assert.equal(url.username, "slice3_test"); assert.equal(url.pathname, "/dg_slice3_test");
  assert.match(process.env.DG_SLICE3_DB_MARKER ?? "", /^[0-9a-f-]{36}$/);
  const [identity] = await prisma.$queryRaw`SELECT current_setting('dg.slice3_test_cluster', true) AS marker`;
  assert.equal(identity.marker, process.env.DG_SLICE3_DB_MARKER);
});
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE ai_worker_provisioning_receipts, ai_worker_principals, ai_local_deployments, ai_local_recipient_approvals, ai_inference_jobs CASCADE`;
  const now = Date.now();
  config = provisioningConfig({ VERCEL_ENV: "production", AI_WORKER_PROVISIONING_ENABLED: "true", AI_WORKER_PROVISIONING_START: new Date(now - 1000).toISOString(), AI_WORKER_PROVISIONING_END: new Date(now + 300000).toISOString(), AI_WORKER_PROVISIONING_WINDOW_ID: randomBytes(16).toString("hex"), AI_WORKER_PROVISIONING_PUBLIC_KEY: raw.toString("base64url"), AI_WORKER_PROVISIONING_FINGERPRINT: createHash("sha256").update(raw).digest("hex") });
  assert.ok(config);
});
after(async () => { await prisma.$disconnect(); await control.$disconnect(); });
const allowNext = async () => prisma.$executeRaw`UPDATE ai_worker_provisioning_receipts SET created_at = clock_timestamp() - interval '61 seconds'`;
test("canonical Slice 3 physical columns and boundary indexes match the deployed SQL contract", async () => {
  const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_worker_principals' ORDER BY ordinal_position`;
  assert.deepEqual(columns.map(row => row.column_name), ["id", "name", "credential_hash", "credential_prefix", "previous_credential_hash", "previous_credential_expires_at", "revoked_at", "last_seen_at", "created_at"]);
  const receipts = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_worker_provisioning_receipts' ORDER BY ordinal_position`;
  assert.deepEqual(receipts.map(row => row.column_name), ["nonce", "fingerprint", "window_id", "operation", "outcome", "worker_id", "deployment_id", "created_at", "completed_at"]);
  const indexes = await prisma.$queryRaw`SELECT c.relname AS name, i.indisunique AS unique, i.indisvalid AS valid, pg_get_expr(i.indpred, i.indrelid) AS predicate, pg_get_indexdef(i.indexrelid) AS definition FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relnamespace = 'public'::regnamespace AND c.relname IN ('ai_worker_pinned_name_unique', 'ai_worker_provisioning_window_idx') ORDER BY c.relname`;
  assert.equal(indexes.length, 2);
  const pinned = indexes.find(row => row.name === 'ai_worker_pinned_name_unique');
  assert.equal(pinned.unique, true); assert.equal(pinned.valid, true);
  assert.equal(pinned.predicate, "(name = 'dg-mac-1'::text)");
  assert.match(pinned.definition, /ON public\.ai_worker_principals USING btree \(name\)/);
  const window = indexes.find(row => row.name === 'ai_worker_provisioning_window_idx');
  assert.equal(window.unique, false); assert.equal(window.valid, true); assert.equal(window.predicate, null);
  assert.match(window.definition, /ON public\.ai_worker_provisioning_receipts USING btree \(window_id, created_at\)/);
  // A raw physical-column read catches accidental camelCase SQL independently of Prisma mappings.
  assert.deepEqual(await prisma.$queryRaw`SELECT revoked_at FROM public.ai_worker_principals`, []);
});
async function created() {
  const r = await executeProvision(request(), config, prisma); assert.ok(r.workerId); return r;
}
test("atomic provision pins all identity and audits never contain credential/hash/prefix", async () => {
  const r = await created();
  assert.equal(await prisma.aiWorkerPrincipal.count(), 1); assert.equal(await prisma.aiLocalDeployment.count(), 1);
  const worker = await prisma.aiWorkerPrincipal.findUniqueOrThrow({ where: { id: r.workerId } });
  assert.equal(worker.name, PINNED_WORKER.name); assert.equal(worker.revokedAt, null);
  const deployment = await prisma.aiLocalDeployment.findUniqueOrThrow({ where: { id: r.deploymentId } });
  for (const key of ["name", "modelId", "modelDigest", "lane", "endpointKind"]) assert.equal(deployment[key], PINNED_WORKER[key]);
  const receipts = await prisma.$queryRaw`SELECT * FROM ai_worker_provisioning_receipts`;
  const safe = JSON.stringify(receipts);
  assert.ok(!safe.includes(r.credential)); assert.ok(!safe.includes(worker.credentialHash)); assert.ok(!safe.includes(worker.credentialPrefix)); assert.equal(receipts[0].outcome, "succeeded");
  assert.equal(await prisma.aiLocalRecipientApproval.count(), 0); assert.equal(await prisma.aiInferenceJob.count(), 0);
});
test("durable replay rejects on another client and duplicate request creates nothing", async () => {
  const input = request(); const r = await executeProvision(input, config, prisma); assert.ok(r.workerId);
  assert.deepEqual(safeResult(await executeProvision(input, config, control)), { code: "replay" });
  await allowNext(); assert.deepEqual(safeResult(await executeProvision(request(), config, control)), { code: "duplicate" });
  assert.equal(await prisma.aiWorkerPrincipal.count(), 1); assert.equal(await prisma.aiLocalDeployment.count(), 1);
});
test("concurrent provision calls produce exactly one principal/deployment", async () => {
  const results = await Promise.all([executeProvision(request(), config, prisma), executeProvision(request(), config, control)]);
  assert.equal(results.filter(r => r.workerId).length, 1); assert.equal(results.filter(r => r.code === "rate_limited").length, 1);
  assert.equal(await prisma.aiWorkerPrincipal.count(), 1); assert.equal(await prisma.aiLocalDeployment.count(), 1);
});
test("recovery rotates exact worker, preserves five-minute overlap, never creates records", async () => {
  const first = await created(); await allowNext();
  const previous = await prisma.aiWorkerPrincipal.findUniqueOrThrow({ where: { id: first.workerId } });
  const r = await executeProvision(request("recover", first.workerId), config, prisma); assert.ok(r.credential); assert.equal(r.deploymentId, first.deploymentId);
  const worker = await prisma.aiWorkerPrincipal.findUniqueOrThrow({ where: { id: first.workerId } });
  assert.equal(worker.previousCredentialHash, previous.credentialHash); assert.ok(Math.abs(worker.previousCredentialExpiresAt.getTime() - Date.now() - 300000) < 2000);
  assert.equal(await prisma.aiWorkerPrincipal.count(), 1); assert.equal(await prisma.aiLocalDeployment.count(), 1);
});
test("wrong identity, revoked worker, altered/inactive deployment cannot rotate", async () => {
  for (const change of ["wrong-id", "revoked", "model", "digest", "lane", "endpoint", "inactive"]) {
    await prisma.$executeRaw`TRUNCATE ai_worker_provisioning_receipts, ai_worker_principals CASCADE`;
    const r = await created(); await allowNext();
    if (change === "revoked") await prisma.aiWorkerPrincipal.update({ where: { id: r.workerId }, data: { revokedAt: new Date() } });
    const fields = { model: { modelId: "other" }, digest: { modelDigest: "a".repeat(64) }, lane: { lane: "other" }, endpoint: { endpointKind: "remote" }, inactive: { active: false } };
    if (["model", "lane", "endpoint"].includes(change)) {
      await assert.rejects(prisma.aiLocalDeployment.update({ where: { id: r.deploymentId }, data: fields[change] }));
      continue; // Existing schema forbids these identities before the endpoint can see them.
    }
    if (fields[change]) await prisma.aiLocalDeployment.update({ where: { id: r.deploymentId }, data: fields[change] });
    const before = await prisma.aiWorkerPrincipal.findUniqueOrThrow({ where: { id: r.workerId } });
    assert.deepEqual(safeResult(await executeProvision(request("recover", change === "wrong-id" ? "wrong-worker" : r.workerId), config, prisma)), { code: "identity_mismatch" });
    const after = await prisma.aiWorkerPrincipal.findUniqueOrThrow({ where: { id: r.workerId } }); assert.equal(before.credentialHash, after.credentialHash);
  }
});
test("durable cooldown and three-attempt budget survive new process/client", async () => {
  const r = await created(); assert.deepEqual(safeResult(await executeProvision(request("recover", r.workerId), config, control)), { code: "rate_limited" });
  for (let i = 0; i < 2; i++) { await allowNext(); assert.deepEqual(safeResult(await executeProvision(request(), config, control)), { code: "duplicate" }); }
  await allowNext(); assert.deepEqual(safeResult(await executeProvision(request("recover", r.workerId), config, control)), { code: "rate_limited" });
});
test("transaction rechecks window/timestamp after lock; no nonce/mutation on stale input", async () => {
  const stale = { ...request(), timestamp: Date.now() - 31000 };
  assert.deepEqual(safeResult(await executeProvision(stale, config, prisma)), { code: "window_closed" });
  assert.equal((await prisma.$queryRaw`SELECT count(*) AS count FROM ai_worker_provisioning_receipts`)[0].count, BigInt(0));
});
test("DB constraint rejects pinned duplicates even outside provisioner", async () => {
  await created();
  await assert.rejects(prisma.aiWorkerPrincipal.create({ data: { name: PINNED_WORKER.name, credentialHash: randomBytes(32).toString("hex"), credentialPrefix: "synthetic" } }));
});

test("mutation failure rolls worker/deployment back but durably consumes nonce with safe outcome", async () => {
  await prisma.$executeRawUnsafe("CREATE FUNCTION dg_test_provision_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic fixed failure'; END $$");
  await prisma.$executeRawUnsafe("CREATE TRIGGER dg_test_provision_failure BEFORE INSERT ON ai_local_deployments FOR EACH ROW EXECUTE FUNCTION dg_test_provision_failure()");
  try {
    const input = request();
    assert.deepEqual(safeResult(await executeProvision(input, config, prisma)), { code: "mutation_failed" });
    assert.equal(await prisma.aiWorkerPrincipal.count(), 0); assert.equal(await prisma.aiLocalDeployment.count(), 0);
    assert.deepEqual(safeResult(await executeProvision(input, config, control)), { code: "replay" });
    const receipts = await prisma.$queryRaw`SELECT outcome, worker_id, deployment_id FROM ai_worker_provisioning_receipts`;
    assert.deepEqual(receipts, [{ outcome: "mutation_failed", worker_id: null, deployment_id: null }]);
  } finally {
    await prisma.$executeRawUnsafe("DROP TRIGGER dg_test_provision_failure ON ai_local_deployments");
    await prisma.$executeRawUnsafe("DROP FUNCTION dg_test_provision_failure()");
  }
});
test("concurrent same nonce is single-use even when operations race", async () => {
  const input = request(); const results = await Promise.all([executeProvision(input, config, prisma), executeProvision(input, config, control)]);
  assert.equal(results.filter(x => x.workerId).length, 1); assert.equal(results.filter(x => x.code === "replay").length, 1);
});

test("window expires while request waits for the transaction lock: no mutation/receipt", async () => {
  let release, locked;
  const ready = new Promise(resolve => { locked = resolve; });
  const barrier = new Promise(resolve => { release = resolve; });
  let pid;
  const holder = control.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('dg-pinned-worker-provisioning-v1'))`;
    const [row] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`; pid = row.pid;
    locked(); await barrier;
  });
  await ready;
  const pending = executeProvision(request(), config, prisma);
  try {
    let blocked = false;
    const until = Date.now() + 2000;
    while (Date.now() < until) {
      const [row] = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE ${pid}::int = ANY(pg_blocking_pids(pid))) AS blocked`;
      if (row.blocked) { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(blocked, true);
    config.end = Date.now() - 1;
  } finally { release(); }
  await holder;
  assert.deepEqual(safeResult(await pending), { code: "window_closed" });
  assert.equal(await prisma.aiWorkerPrincipal.count(), 0);
});
