import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { prisma, PrismaClient } from "@dg/database";
import { enqueueAiLocalJob, approveAiLocalRecipient, revokeAiLocalRecipient, claimAiLocalJob,
  heartbeatAiLocalJob, completeAiLocalJob, cancelAiLocalJob, getAiLocalJob,
  readAiLocalJobForActor, processAiLocalRetention } from "../packages/platform-core/src/ai/local-jobs.ts";
import { revokeAiWorker } from "../packages/platform-core/src/ai/local-worker-auth.ts";
import { deliverAiAccountingOutbox } from "../packages/platform-core/src/ai/usage.ts";

const digest = "a".repeat(64);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const control = new PrismaClient();
let f;
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
};
before(async () => {
  // Refuse unknown URLs before any mutation, even if someone invokes this file
  // directly. The per-cluster nonce must come from the owning disposable runner.
  const url = new URL(process.env.DATABASE_URL ?? "");
  assert.equal(url.hostname, "127.0.0.1");
  assert.notEqual(url.port, "5432");
  assert.ok(url.port);
  assert.equal(url.username, "slice3_test");
  assert.equal(url.pathname, "/dg_slice3_test");
  assert.match(process.env.DG_SLICE3_DB_MARKER ?? "", /^[0-9a-f-]{36}$/);
  const [identity] = await prisma.$queryRaw`SELECT current_database() AS db,
    current_setting('dg.slice3_test_cluster', true) AS marker, host(inet_server_addr()) AS host`;
  assert.equal(identity.db, "dg_slice3_test");
  assert.equal(identity.marker, process.env.DG_SLICE3_DB_MARKER);
  assert.equal(identity.host, "127.0.0.1");
});
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE "ai_accounting_outbox", "ai_worker_claim_receipts", "ai_inference_jobs",
    "ai_local_recipient_approvals", "ai_local_deployments", "ai_worker_principals", "organisations" CASCADE`;
  const orgA = await prisma.organisation.create({ data: { name: "Slice 3 tenant A", slug: "slice3-a" } });
  const orgB = await prisma.organisation.create({ data: { name: "Slice 3 tenant B", slug: "slice3-b" } });
  const worker = async (name) => prisma.aiWorkerPrincipal.create({ data: { name,
    credentialHash: sha(randomBytes(32).toString("hex")), credentialPrefix: "test-only" } });
  const workerA = await worker("worker A");
  const workerB = await worker("worker B");
  const deployment = async (w) => prisma.aiLocalDeployment.create({ data: { name: "dg-fast", workerId: w.id, modelDigest: digest } });
  const depA = await deployment(workerA);
  const depB = await deployment(workerB);
  const approve = (org, dep) => approveAiLocalRecipient({ organisationId: org.id, deploymentId: dep.id,
    actorType: "user", actorId: "owner", classificationCeiling: "restricted" });
  const approvalA = await approve(orgA, depA);
  const approvalB = await approve(orgB, depB);
  f = { orgA, orgB, workerA, workerB, depA, depB, approvalA, approvalB };
});
after(async () => { await Promise.all([prisma.$disconnect(), control.$disconnect()]); });

const request = (extra = {}) => ({ organisationId: f.orgA.id, actorType: "user", actorId: "actor-a",
  correlationId: randomUUID(), task: "lead_summary", policyVersion: 1, classification: "tenant_confidential",
  deploymentId: f.depA.id, idempotencyKey: randomUUID(), contextBudgetTokens: 4096, maxOutputTokens: 1200,
  payload: { messages: [{ role: "user", content: "PRIVATE CRM PROMPT SENTINEL" }] }, ...extra });
const enqueue = (extra = {}) => enqueueAiLocalJob(request(extra));
const claim = (worker = f.workerA) => claimAiLocalJob(worker, { operationId: randomUUID(), requestTimestamp: Date.now() });
const lease = async () => { await enqueue(); const j = await claim(); assert.ok(j, "Expected a claimed fixture job"); return j; };
const heartbeat = (j, extra = {}, worker = f.workerA) => heartbeatAiLocalJob(worker, {
  jobId: j.id, leaseToken: j.leaseToken, generation: j.leaseGeneration, operationId: randomUUID(), sequence: 1, ...extra });
const completion = (j, extra = {}) => ({ jobId: j.id, leaseToken: j.leaseToken, generation: j.leaseGeneration,
  operationId: randomUUID(), outcome: "succeeded", text: "PRIVATE RESULT SENTINEL", modelId: "dg-fast:latest", modelDigest: digest,
  tokensIn: 10, tokensOut: 5, ...extra });
const complete = (j, extra = {}, worker = f.workerA) => completeAiLocalJob(worker, completion(j, extra));
const row = (id) => prisma.aiInferenceJob.findUniqueOrThrow({ where: { id } });
const rejected = (promise, code = "lease_invalid") => assert.rejects(promise, { code });

async function waitBlocked(pid) {
  const until = Date.now() + 3000;
  while (Date.now() < until) {
    const [r] = await prisma.$queryRaw`SELECT EXISTS (SELECT 1 FROM pg_stat_activity
      WHERE ${pid}::int = ANY(pg_blocking_pids(pid))) AS blocked`;
    if (r.blocked) return;
    await delay(10);
  }
  throw new Error("Expected completion to block on the controlled PostgreSQL row lock");
}
// Database-visible barriers, rather than sleeps, establish each racing order.
async function raceAgainstCompletion(lockAndChange, action, whileBlocked) {
  const ready = deferred();
  const release = deferred();
  let pid;
  let metadata;
  const hold = control.$transaction(async (tx) => {
    [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
    metadata = await lockAndChange(tx);
    ready.resolve();
    await release.promise;
  }, { timeout: 10000 });
  hold.catch(ready.reject);
  await ready.promise;
  const pending = action();
  pending.catch(() => {});
  try {
    await waitBlocked(pid);
    if (whileBlocked) await whileBlocked(metadata);
  } finally { release.resolve(); await hold; }
  return pending;
}
async function expireLease(id) {
  await prisma.$executeRaw`UPDATE "ai_inference_jobs" SET "lease_expires_at" = CLOCK_TIMESTAMP() - INTERVAL '1 second' WHERE "id" = ${id}`;
}
async function expireJob(tx, id) {
  await tx.$executeRaw`UPDATE "ai_inference_jobs" SET "created_at" = CLOCK_TIMESTAMP() - INTERVAL '2 minutes',
    "deadline_at" = CLOCK_TIMESTAMP() - INTERVAL '1 second', "expires_at" = CLOCK_TIMESTAMP() - INTERVAL '1 second'
    WHERE "id" = ${id}`;
}

// Pause an actual completion after its result write and before outbox commit.
// The test trigger runs only in the nonce-verified disposable database.
async function pausedCompletion(j, during) {
  await prisma.$executeRawUnsafe(`CREATE FUNCTION slice3_test_pause_outbox() RETURNS trigger AS $$
    BEGIN PERFORM pg_advisory_xact_lock(884433); RETURN NEW; END; $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER slice3_test_pause_outbox BEFORE INSERT ON ai_accounting_outbox
    FOR EACH ROW EXECUTE FUNCTION slice3_test_pause_outbox()`);
  const ready = deferred(); const release = deferred(); let blockerPid; let pending;
  const hold = control.$transaction(async (tx) => {
    [{ pid: blockerPid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(884433)::text`;
    ready.resolve(); await release.promise;
  }, { timeout: 10000 });
  hold.catch(ready.reject);
  try {
    await ready.promise;
    pending = complete(j); pending.catch(() => {});
    await waitBlocked(blockerPid);
    const [completer] = await prisma.$queryRaw`SELECT pid FROM pg_stat_activity
      WHERE ${blockerPid}::int = ANY(pg_blocking_pids(pid))`;
    const change = await during(completer.pid);
    release.resolve(); await hold;
    const [completionResult] = await Promise.allSettled([pending]);
    if (change?.pending) await change.pending;
    return completionResult;
  } finally {
    release.resolve(); await hold;
    if (pending) await Promise.allSettled([pending]);
    await prisma.$executeRawUnsafe(`DROP TRIGGER slice3_test_pause_outbox ON ai_accounting_outbox`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION slice3_test_pause_outbox()`);
  }
}

for (const [name, mutation] of [
  ["worker revocation", () => revokeAiWorker(f.workerA.id)],
  ["deployment disable", () => prisma.aiLocalDeployment.update({ where: { id: f.depA.id }, data: { active: false } })],
  ["approval revocation", () => revokeAiLocalRecipient({ organisationId: f.orgA.id, approvalId: f.approvalA.id })],
  ["cancellation", (j) => cancelAiLocalJob({ id: j.id, organisationId: f.orgA.id })],
]) {
  test(`completion holds authority locks through commit against later ${name}`, async () => {
    const j = await lease();
    const result = await pausedCompletion(j, async (pid) => {
      const pending = mutation(j); pending.catch(() => {});
      await waitBlocked(pid);
      return { pending };
    });
    assert.equal(result.status, "fulfilled");
    assert.equal((await row(j.id)).status, "succeeded");
    assert.equal(await prisma.aiAccountingOutbox.count(), 1);
  });
}
test("expiry after the result write but before commit rolls back result and outbox", async () => {
  const j = await lease();
  const [expiry] = await prisma.$queryRaw`UPDATE ai_inference_jobs SET lease_expires_at = CLOCK_TIMESTAMP() + INTERVAL '2 seconds'
    WHERE id = ${j.id} RETURNING lease_expires_at`;
  const result = await pausedCompletion(j, async () => {
    while (!(await prisma.$queryRaw`SELECT CLOCK_TIMESTAMP() > ${expiry.lease_expires_at}::timestamp AS expired`)[0].expired) await delay(10);
  });
  assert.equal(result.status, "rejected");
  assert.equal((await row(j.id)).status, "leased");
  assert.equal((await row(j.id)).resultCiphertext, null);
  assert.equal(await prisma.aiAccountingOutbox.count(), 0);
});

test("identical concurrent enqueue is idempotent", async () => {
  const r = request();
  const jobs = await Promise.all(Array.from({ length: 8 }, () => enqueueAiLocalJob(r)));
  assert.equal(new Set(jobs.map((j) => j.id)).size, 1);
  assert.equal(await prisma.aiInferenceJob.count(), 1);
});
test("conflicting request hash with the same idempotency key is rejected", async () => {
  const r = request();
  await enqueueAiLocalJob(r);
  await rejected(enqueueAiLocalJob({ ...r, payload: { messages: [{ role: "user", content: "different" }] } }), "idempotency_conflict");
});
test("concurrent conflicting enqueue commits exactly one request", async () => {
  const r = request();
  const results = await Promise.allSettled([enqueueAiLocalJob(r), enqueueAiLocalJob({ ...r, maxOutputTokens: 1000 })]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.code, "idempotency_conflict");
  assert.equal(await prisma.aiInferenceJob.count(), 1);
});
test("nullable system actor idempotency has database uniqueness", async () => {
  const r = request({ actorType: "system", actorId: undefined });
  const jobs = await Promise.all(Array.from({ length: 6 }, () => enqueueAiLocalJob(r)));
  assert.equal(new Set(jobs.map((j) => j.id)).size, 1);
  await rejected(enqueueAiLocalJob({ ...r, maxOutputTokens: 1000 }), "idempotency_conflict");
});
test("tenant isolation scopes identical idempotency keys", async () => {
  const r = request();
  const a = await enqueueAiLocalJob(r);
  const b = await enqueueAiLocalJob({ ...r, organisationId: f.orgB.id, deploymentId: f.depB.id });
  assert.notEqual(a.id, b.id);
});
test("recipient approval isolation rejects another tenant's deployment/approval", async () => {
  await rejected(enqueue({ organisationId: f.orgB.id }), "local_recipient_not_approved");
  await rejected(enqueue({ approvalId: f.approvalB.id }), "local_recipient_not_approved");
});
test("classification ceiling is enforced before enqueue", async () => {
  await prisma.aiLocalRecipientApproval.update({ where: { id: f.approvalA.id }, data: { classificationCeiling: "public" } });
  await rejected(enqueue(), "local_recipient_not_approved");
});
test("revoked recipient cannot be newly claimed", async () => {
  await enqueue();
  await revokeAiLocalRecipient({ organisationId: f.orgA.id, approvalId: f.approvalA.id });
  assert.equal(await claim(), null);
});
test("revoked recipient cannot heartbeat", async () => {
  const j = await lease();
  await revokeAiLocalRecipient({ organisationId: f.orgA.id, approvalId: f.approvalA.id });
  await rejected(heartbeat(j));
});
test("revoked recipient cannot complete", async () => {
  const j = await lease();
  await revokeAiLocalRecipient({ organisationId: f.orgA.id, approvalId: f.approvalA.id });
  await rejected(complete(j));
});
test("revoked worker cannot claim", async () => {
  await enqueue(); await revokeAiWorker(f.workerA.id);
  await rejected(claim(), "worker_revoked");
});
test("revoked worker cannot heartbeat", async () => {
  const j = await lease(); await revokeAiWorker(f.workerA.id); await rejected(heartbeat(j));
});
test("revoked worker cannot complete", async () => {
  const j = await lease(); await revokeAiWorker(f.workerA.id); await rejected(complete(j));
});
test("disabled deployment cannot claim", async () => {
  await enqueue(); await prisma.aiLocalDeployment.update({ where: { id: f.depA.id }, data: { active: false } });
  assert.equal(await claim(), null);
});
test("disabled deployment cannot complete", async () => {
  const j = await lease(); await prisma.aiLocalDeployment.update({ where: { id: f.depA.id }, data: { active: false } });
  await rejected(complete(j));
});
test("concurrent claim returns a job to exactly one caller", async () => {
  await enqueue();
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => claim()));
  assert.equal(results.filter((r) => r.status === "fulfilled" && r.value).length, 1);
  assert.equal(await prisma.aiInferenceJob.count({ where: { status: "leased" } }), 1);
});
test("another worker cannot receive an assigned deployment's job", async () => {
  await enqueue();
  const results = await Promise.all([claim(), claim(f.workerB)]);
  assert.ok(results[0]); assert.equal(results[1], null);
});
test("one-live-lease-per-worker invariant survives concurrent claims for multiple jobs", async () => {
  await enqueue(); await enqueue();
  const results = await Promise.allSettled([claim(), claim()]);
  assert.equal(results.filter((r) => r.status === "fulfilled" && r.value).length, 1);
  assert.equal(await prisma.aiInferenceJob.count({ where: { leaseWorkerId: f.workerA.id, status: "leased" } }), 1);
  assert.equal(await prisma.aiInferenceJob.count({ where: { status: "queued" } }), 1);
});
test("lease recovery increments generation and fences the previous lease", async () => {
  const old = await lease(); await expireLease(old.id);
  const next = await claim();
  assert.equal(next.id, old.id); assert.equal(next.leaseGeneration, old.leaseGeneration + 1);
  await rejected(complete(old));
  await rejected(heartbeat(old));
});
test("heartbeat sequence fencing and exact replay", async () => {
  const j = await lease(); const operationId = randomUUID();
  const first = await heartbeat(j, { operationId });
  assert.deepEqual(await heartbeat(j, { operationId }), first);
  await rejected(heartbeat(j));
  await rejected(heartbeat(j, { sequence: 3 }));
  assert.ok(await heartbeat(j, { sequence: 2 }));
});
test("heartbeat cannot extend beyond deadline or expiry", async () => {
  const j = await lease();
  await prisma.$executeRaw`UPDATE "ai_inference_jobs" SET "deadline_at" = CLOCK_TIMESTAMP() + INTERVAL '15 seconds',
    "expires_at" = CLOCK_TIMESTAMP() + INTERVAL '20 seconds' WHERE "id" = ${j.id}`;
  const h = await heartbeat(j); const stored = await row(j.id);
  assert.ok(new Date(h.leaseExpiresAt) <= stored.deadlineAt);
  assert.ok(new Date(h.leaseExpiresAt) <= stored.expiresAt);
});
test("expired lease cannot complete", async () => {
  const j = await lease(); await expireLease(j.id); await rejected(complete(j));
});
test("stale generation cannot complete", async () => {
  const j = await lease(); await rejected(complete(j, { generation: j.leaseGeneration + 1 }));
});
test("wrong lease token cannot complete", async () => {
  const j = await lease(); await rejected(complete(j, { leaseToken: randomBytes(32).toString("base64url") }));
});
test("wrong worker cannot complete", async () => {
  const j = await lease(); await rejected(complete(j, {}, f.workerB));
});
test("model/digest contract mismatch cannot complete", async () => {
  const j = await lease();
  await rejected(complete(j, { modelDigest: "b".repeat(64) }), "model_identity_mismatch");
  await rejected(complete(j, { modelId: "dg-coder:latest" }), "model_identity_mismatch");
});
test("cancellation wins a controlled race with completion", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion((tx) => tx.aiInferenceJob.update({ where: { id: j.id }, data: { cancelRequestedAt: new Date() } }), () => complete(j)));
  assert.equal((await row(j.id)).status, "leased");
  assert.equal((await heartbeat(j)).cancelRequested, true);
  assert.equal((await row(j.id)).status, "cancelled");
});
test("deadline changed during the completion lock wait is authoritative", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion((tx) => expireJob(tx, j.id), () => complete(j)));
  assert.equal(await prisma.aiAccountingOutbox.count(), 0);
});
test("database wall time defeats transaction-start time after a lock wait", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "ai_inference_jobs" WHERE "id" = ${j.id} FOR UPDATE`;
    const [deadline] = await tx.$queryRaw`UPDATE "ai_inference_jobs" SET "lease_expires_at" = CLOCK_TIMESTAMP() + INTERVAL '1 second' WHERE "id" = ${j.id} RETURNING "lease_expires_at"`;
    return deadline.lease_expires_at;
  }, () => complete(j), async (expiresAt) => {
    while (!(await prisma.$queryRaw`SELECT CLOCK_TIMESTAMP() > ${expiresAt}::timestamp AS expired`)[0].expired) await delay(10);
  }));
});
test("heartbeat cannot resurrect a lease that expired during its row-lock wait", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion(async (tx) => {
    const [deadline] = await tx.$queryRaw`UPDATE "ai_inference_jobs" SET "lease_expires_at" = CLOCK_TIMESTAMP() + INTERVAL '1 second'
      WHERE "id" = ${j.id} RETURNING "lease_expires_at"`;
    return deadline.lease_expires_at;
  }, () => heartbeat(j), async (expiresAt) => {
    while (!(await prisma.$queryRaw`SELECT CLOCK_TIMESTAMP() > ${expiresAt}::timestamp AS expired`)[0].expired) await delay(10);
  }));
});
test("approval revocation wins a controlled race with completion", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion((tx) => tx.aiLocalRecipientApproval.update({ where: { id: f.approvalA.id }, data: { revokedAt: new Date() } }), () => complete(j)));
});
test("worker revocation wins a controlled race with completion", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion((tx) => tx.aiWorkerPrincipal.update({ where: { id: f.workerA.id }, data: { revokedAt: new Date() } }), () => complete(j)));
});
test("deployment disable wins a controlled race with completion", async () => {
  const j = await lease();
  await rejected(raceAgainstCompletion((tx) => tx.aiLocalDeployment.update({ where: { id: f.depA.id }, data: { active: false } }), () => complete(j)));
});
test("legitimate duplicate completion is idempotent", async () => {
  const j = await lease(); const c = completion(j);
  assert.deepEqual(await completeAiLocalJob(f.workerA, c), { status: "succeeded", duplicate: false });
  assert.deepEqual(await completeAiLocalJob(f.workerA, c), { status: "succeeded", duplicate: true });
  assert.equal(await prisma.aiAccountingOutbox.count(), 1);
});
test("simultaneous legitimate completions are idempotent", async () => {
  const j = await lease(); const c = completion(j);
  const r = await Promise.all([completeAiLocalJob(f.workerA, c), completeAiLocalJob(f.workerA, c)]);
  assert.equal(r.filter((v) => v.duplicate).length, 1);
  assert.equal(await prisma.aiAccountingOutbox.count(), 1);
});
test("duplicate completion rejects another worker, wrong token, stale generation and changed body", async () => {
  const j = await lease(); const c = completion(j); await completeAiLocalJob(f.workerA, c);
  await rejected(completeAiLocalJob(f.workerB, c));
  await rejected(completeAiLocalJob(f.workerA, { ...c, leaseToken: randomBytes(32).toString("base64url") }));
  await rejected(completeAiLocalJob(f.workerA, { ...c, generation: c.generation + 1 }));
  await rejected(completeAiLocalJob(f.workerA, { ...c, text: "changed result" }), "completion_conflict");
});
test("duplicate completion rejects revoked worker/recipient and disabled deployment", async () => {
  const j = await lease(); const c = completion(j); await completeAiLocalJob(f.workerA, c);
  await revokeAiWorker(f.workerA.id); await rejected(completeAiLocalJob(f.workerA, c));
  await prisma.aiWorkerPrincipal.update({ where: { id: f.workerA.id }, data: { revokedAt: null } });
  await revokeAiLocalRecipient({ organisationId: f.orgA.id, approvalId: f.approvalA.id });
  await rejected(completeAiLocalJob(f.workerA, c));
  await prisma.aiLocalRecipientApproval.update({ where: { id: f.approvalA.id }, data: { revokedAt: null } });
  await prisma.aiLocalDeployment.update({ where: { id: f.depA.id }, data: { active: false } });
  await rejected(completeAiLocalJob(f.workerA, c));
});
test("old retry completion cannot be replayed after a new generation", async () => {
  const j = await lease(); const c = completion(j, { outcome: "failed", failureCode: "ollama_unavailable", retryable: true });
  assert.equal((await completeAiLocalJob(f.workerA, c)).status, "queued");
  assert.equal((await completeAiLocalJob(f.workerA, c)).duplicate, true);
  await claim(); await rejected(completeAiLocalJob(f.workerA, c));
});
test("retry limit makes the second retryable failure terminal", async () => {
  const first = await lease();
  assert.equal((await complete(first, { outcome: "failed", failureCode: "ollama_unavailable", retryable: true })).status, "queued");
  const second = await claim();
  assert.equal(second.leaseGeneration, 2);
  assert.equal((await complete(second, { outcome: "failed", failureCode: "ollama_unavailable", retryable: true })).status, "failed");
  assert.equal(await claim(), null);
});
test("expired queued job recovery schedules retention", async () => {
  const j = await enqueue(); await expireJob(prisma, j.id); await processAiLocalRetention();
  const stored = await row(j.id); assert.equal(stored.status, "expired");
  assert.ok(stored.payloadPurgeAt); assert.ok(stored.metadataPurgeAt);
});
test("expired lease recovery queues a retry then reaches retry limit", async () => {
  const first = await lease(); await expireLease(first.id); await processAiLocalRetention();
  assert.equal((await row(first.id)).status, "queued");
  const next = await claim(); await expireLease(next.id); await processAiLocalRetention();
  assert.equal((await row(next.id)).status, "failed");
});
test("completion atomically commits encrypted result and scoped accounting outbox", async () => {
  const j = await lease(); await complete(j);
  const stored = await row(j.id); const event = await prisma.aiAccountingOutbox.findUnique({ where: { jobId: j.id } });
  assert.equal(stored.status, "succeeded"); assert.ok(stored.resultCiphertext);
  assert.equal(event.organisationId, f.orgA.id); assert.equal(event.eventKey, `ai-job:${j.id}:completed`);
  assert.equal(event.payload.tokensIn, 10);
});
test("failed completion cannot leave partial result or outbox state", async () => {
  const j = await lease(); await rejected(complete(j, { text: "" }), "invalid_result");
  const stored = await row(j.id); assert.equal(stored.status, "leased"); assert.equal(stored.resultCiphertext, null);
  assert.equal(await prisma.aiAccountingOutbox.count(), 0);
});
test("outbox insertion failure rolls back the preceding result mutation", async () => {
  const j = await lease();
  await prisma.$executeRawUnsafe(`CREATE FUNCTION slice3_test_reject_outbox() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'test outbox failure'; END; $$ LANGUAGE plpgsql`);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER slice3_test_reject_outbox BEFORE INSERT ON ai_accounting_outbox FOR EACH ROW EXECUTE FUNCTION slice3_test_reject_outbox()`);
  try { await assert.rejects(complete(j)); }
  finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER slice3_test_reject_outbox ON ai_accounting_outbox`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION slice3_test_reject_outbox()`);
  }
  assert.equal((await row(j.id)).status, "leased"); assert.equal((await row(j.id)).resultCiphertext, null);
  assert.equal(await prisma.aiAccountingOutbox.count(), 0);
});
test("encrypted payload is persisted without plaintext", async () => {
  const j = await enqueue(); const stored = await row(j.id);
  assert.ok(stored.payloadCiphertext); assert.equal(stored.payloadNonce.length, 12);
  assert.equal(JSON.stringify(stored).includes("PRIVATE CRM PROMPT SENTINEL"), false);
  assert.equal(Buffer.from(stored.payloadCiphertext).includes(Buffer.from("PRIVATE CRM PROMPT SENTINEL")), false);
  assert.equal((await claim()).payload.messages[0].content, "PRIVATE CRM PROMPT SENTINEL");
});
test("encrypted result persists without plaintext and decrypts only through tenant-scoped read", async () => {
  const j = await lease(); await complete(j); const stored = await row(j.id);
  assert.equal(Buffer.from(stored.resultCiphertext).includes(Buffer.from("PRIVATE RESULT SENTINEL")), false);
  assert.equal((await readAiLocalJobForActor({ id: j.id, organisationId: f.orgA.id })).result, "PRIVATE RESULT SENTINEL");
  assert.equal((await prisma.aiAccountingOutbox.findUnique({ where: { jobId: j.id } })).payload.text, undefined);
});
test("purge before retention time is rejected by database triggers", async () => {
  const j = await lease(); await complete(j);
  await assert.rejects(prisma.aiInferenceJob.update({ where: { id: j.id }, data: { payloadCiphertext: null, payloadNonce: null, payloadKeyVersion: null } }));
  await assert.rejects(prisma.aiInferenceJob.update({ where: { id: j.id }, data: { resultCiphertext: null, resultNonce: null, resultKeyVersion: null } }));
});
test("purge after retention is allowed and purged ciphertext cannot be restored", async () => {
  const j = await lease();
  // Seed an already-terminal historical fixture with elapsed retention. The
  // normal completion and production immutability trigger remain unchanged.
  await complete(j); const original = await row(j.id);
  const historical = { ...original, id: randomUUID(), idempotencyKey: randomUUID(), payloadPurgeAt: new Date(0), resultPurgeAt: new Date(0) };
  await prisma.aiInferenceJob.create({ data: historical });
  await processAiLocalRetention();
  const purged = await row(historical.id);
  assert.equal(purged.payloadCiphertext, null); assert.equal(purged.resultCiphertext, null);
  await assert.rejects(prisma.aiInferenceJob.update({ where: { id: historical.id }, data: {
    payloadCiphertext: original.payloadCiphertext, payloadNonce: original.payloadNonce, payloadKeyVersion: original.payloadKeyVersion } }));
  await assert.rejects(prisma.aiInferenceJob.update({ where: { id: historical.id }, data: {
    resultCiphertext: original.resultCiphertext, resultNonce: original.resultNonce, resultKeyVersion: original.resultKeyVersion } }));
});
test("terminal state and completion receipt cannot be mutated illegally", async () => {
  const j = await lease(); await complete(j);
  for (const data of [{ status: "queued" }, { organisationId: f.orgB.id }, { resultHash: "changed" },
    { completionWorkerId: f.workerB.id }, { completionLeaseGeneration: 123 }, { completionLeaseTokenHash: "a".repeat(64) }]) {
    await assert.rejects(prisma.aiInferenceJob.update({ where: { id: j.id }, data }));
  }
});
test("cross-tenant job/result access and cancellation are rejected", async () => {
  const j = await lease(); await complete(j);
  assert.equal(await getAiLocalJob({ id: j.id, organisationId: f.orgB.id }), null);
  assert.equal(await readAiLocalJobForActor({ id: j.id, organisationId: f.orgB.id }), null);
  assert.equal(await cancelAiLocalJob({ id: j.id, organisationId: f.orgB.id }), null);
});
test("cross-tenant approval relationship is rejected by the database", async () => {
  const j = await enqueue();
  await assert.rejects(prisma.aiInferenceJob.update({ where: { id: j.id }, data: { approvalId: f.approvalB.id } }));
});
test("accounting outbox delivery is idempotent under concurrent maintenance", async () => {
  const j = await lease(); await complete(j);
  const results = await Promise.all([deliverAiAccountingOutbox(), deliverAiAccountingOutbox()]);
  assert.equal(results.reduce((n, r) => n + r.delivered, 0), 1);
  assert.equal(await prisma.activity.count({ where: { organisationId: f.orgA.id, entityType: "AiInteraction" } }), 1);
  assert.equal(await prisma.auditLog.count({ where: { organisationId: f.orgA.id, entityType: "AiInteraction" } }), 1);
});
