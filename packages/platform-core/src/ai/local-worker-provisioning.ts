import { createHash, createPublicKey, verify, type KeyObject } from "node:crypto";
import type { Prisma, PrismaClient } from "@dg/database";
import { provisionAiLocalWorker, rotateAiWorkerCredential } from "./local-worker-auth";

export const PROVISION_ORIGIN = "https://app.digitalgate.com.au";
export const PROVISION_PATH = "/api/internal/ai-worker/provisioning";
export const PROVISION_PROTOCOL = "dg-worker-provisioning-v1";
export const PINNED_WORKER = Object.freeze({ name: "dg-mac-1", modelId: "dg-fast:latest",
  modelDigest: "bb416f08ee253472fdb015ecc32db5ad8fbf0baf76226781fb62b711835c0f7d",
  lane: "local_routine", endpointKind: "ollama_loopback" });
const sha = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");
type Operation = { operation: "provision" } | { operation: "recover"; workerId: string };
export type ProvisionConfig = { key: KeyObject; fingerprint: string; windowId: string; start: number; end: number };
export type VerifiedProvision = Operation & { nonce: string; fingerprint: string; timestamp: number };

// Cloud-only inspection of existing runtime configuration; never returns URL/password.
export function productionDatabaseConfigured(env: NodeJS.ProcessEnv): boolean {
  try {
    const db = new URL(env.DATABASE_URL ?? "");
    return env.DG_NEON_ENV === "production" && ["postgres:", "postgresql:"].includes(db.protocol) && db.username === "neondb_owner" && db.pathname === "/neondb" && /^ep-bold-tree-a7bny92m(-pooler)?\.[a-z0-9.-]+\.neon\.tech$/.test(db.hostname) && ["require", "verify-full"].includes(db.searchParams.get("sslmode") ?? "");
  } catch { return false; }
}

export function provisioningConfig(env: NodeJS.ProcessEnv, now = Date.now()): ProvisionConfig | null {
  try {
    if (env.VERCEL_ENV !== "production" || env.AI_WORKER_PROVISIONING_ENABLED !== "true") return null;
    const start = Date.parse(env.AI_WORKER_PROVISIONING_START ?? "");
    const end = Date.parse(env.AI_WORKER_PROVISIONING_END ?? "");
    const windowId = env.AI_WORKER_PROVISIONING_WINDOW_ID ?? "";
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 900_000 || now < start || now >= end || !/^[a-f0-9]{32}$/.test(windowId)) return null;
    const encoded = env.AI_WORKER_PROVISIONING_PUBLIC_KEY ?? "";
    const raw = Buffer.from(encoded, "base64url");
    if (raw.length !== 65 || raw[0] !== 4 || raw.toString("base64url") !== encoded) return null;
    const fingerprint = sha(raw);
    if (fingerprint !== env.AI_WORKER_PROVISIONING_FINGERPRINT) return null;
    const key = createPublicKey({ key: { kty: "EC", crv: "P-256", x: raw.subarray(1, 33).toString("base64url"), y: raw.subarray(33).toString("base64url") }, format: "jwk" });
    return { key, fingerprint, windowId, start, end };
  } catch { return null; }
}

export function signingMessage(operation: string, body: Uint8Array, timestamp: string, nonce: string): string {
  return JSON.stringify([PROVISION_PROTOCOL, PROVISION_ORIGIN, "POST", PROVISION_PATH, operation, sha(body), timestamp, nonce]);
}

export function verifyProvisionRequest(req: Request, bytes: Uint8Array, config: ProvisionConfig, now = Date.now()): VerifiedProvision | null {
  try {
    const url = new URL(req.url);
    if (url.origin !== PROVISION_ORIGIN || url.pathname !== PROVISION_PATH || url.search || url.hash || req.method !== "POST" || bytes.length > 512 || req.headers.get("content-type") !== "application/json") return null;
    if (now < config.start || now >= config.end) return null;
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const keys = Object.keys(body).sort().join(",");
    if (!(body.operation === "provision" && keys === "operation") && !(body.operation === "recover" && keys === "operation,workerId" && typeof body.workerId === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(body.workerId))) return null;
    const timestamp = req.headers.get("x-dg-timestamp") ?? "";
    const nonce = req.headers.get("x-dg-nonce") ?? "";
    const signature = req.headers.get("x-dg-signature") ?? "";
    if (!/^[0-9]{13}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 30_000 || !/^[a-f0-9]{64}$/.test(nonce) || !/^[A-Za-z0-9_-]{8,96}$/.test(signature)) return null;
    const sig = Buffer.from(signature, "base64url");
    if (sig.toString("base64url") !== signature || !verify("sha256", Buffer.from(signingMessage(body.operation, bytes, timestamp, nonce)), config.key, sig)) return null;
    return { ...body, nonce, fingerprint: config.fingerprint, timestamp: Number(timestamp) };
  } catch { return null; }
}

// Dedicated ledger is the audit of authenticated attempts/outcomes AND durable replay/budget state.
// Never store request bodies, signatures, errors, hashes/prefixes of worker credentials.
export async function executeProvision(request: VerifiedProvision, config: ProvisionConfig, db: PrismaClient) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('dg-pinned-worker-provisioning-v1'))`;
    const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const now = clock.now.getTime();
    if (now < config.start || now >= config.end || Math.abs(now - request.timestamp) > 30_000) return { code: "window_closed" } as const;
    const replay = await tx.$queryRaw<{ nonce: string }[]>`SELECT nonce FROM ai_worker_provisioning_receipts WHERE nonce = ${request.nonce}`;
    if (replay.length) return { code: "replay" } as const;
    const [budget] = await tx.$queryRaw<{ count: bigint; latest: Date | null }[]>`SELECT count(*) AS count, max(created_at) AS latest FROM ai_worker_provisioning_receipts WHERE window_id = ${config.windowId}`;
    if (budget.count >= BigInt(3) || (budget.latest && now - budget.latest.getTime() < 60_000)) return { code: "rate_limited" } as const;
    await tx.$executeRaw`INSERT INTO ai_worker_provisioning_receipts (nonce, fingerprint, window_id, operation, outcome) VALUES (${request.nonce}, ${request.fingerprint}, ${config.windowId}, ${request.operation}, 'attempt')`;
    let result: { workerId: string; deploymentId: string; credential: string } | undefined;
    let outcome = "mutation_failed";
    let windowClosed = false;
    const requireLiveWindow = async () => {
      const [time] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const tick = time.now.getTime();
      if (tick < config.start || tick >= config.end || Math.abs(tick - request.timestamp) > 30_000) { windowClosed = true; throw new Error("window_closed"); }
    };
    await tx.$executeRawUnsafe("SAVEPOINT pinned_worker_mutation");
    try {
      await tx.$queryRaw`SELECT id FROM ai_worker_principals WHERE name = ${PINNED_WORKER.name} FOR UPDATE`;
      if (request.operation === "recover") await tx.$queryRaw`SELECT id FROM ai_local_deployments WHERE worker_id = ${request.workerId} FOR UPDATE`;
      await requireLiveWindow();
      const workers = await tx.aiWorkerPrincipal.findMany({ where: { name: PINNED_WORKER.name }, select: { id: true, revokedAt: true }, take: 2 });
      if (request.operation === "provision") {
        // Activation precondition is enforced in the same transaction as creation.
        const counts = await Promise.all([tx.aiWorkerPrincipal.count(), tx.aiLocalDeployment.count(), tx.aiLocalRecipientApproval.count(), tx.aiInferenceJob.count()]);
        if (workers.length || counts.some(Boolean)) outcome = "duplicate";
        else { await requireLiveWindow(); result = await provisionAiLocalWorker({ name: PINNED_WORKER.name, modelDigest: PINNED_WORKER.modelDigest }, tx); outcome = "succeeded"; }
      } else {
        const deployments = await tx.aiLocalDeployment.findMany({ where: { workerId: request.workerId, name: PINNED_WORKER.name, modelId: PINNED_WORKER.modelId, modelDigest: PINNED_WORKER.modelDigest, lane: PINNED_WORKER.lane, endpointKind: PINNED_WORKER.endpointKind, active: true }, select: { id: true }, take: 2 });
        if (workers.length !== 1 || workers[0].id !== request.workerId || workers[0].revokedAt || deployments.length !== 1 || await tx.aiLocalDeployment.count({ where: { workerId: request.workerId } }) !== 1) outcome = "identity_mismatch";
        else {
          // Fence concurrent revocation/rotation while the authoritative rotator reads/writes.
          await tx.$queryRaw`SELECT id FROM ai_worker_principals WHERE id = ${request.workerId} FOR UPDATE`;
          await requireLiveWindow();
          result = { workerId: request.workerId, deploymentId: deployments[0].id, credential: await rotateAiWorkerCredential(request.workerId, tx) };
          outcome = "succeeded";
        }
      }
      await requireLiveWindow();
    } catch {
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT pinned_worker_mutation");
      result = undefined;
      outcome = windowClosed ? "window_closed" : "mutation_failed";
    }
    await tx.$executeRaw`UPDATE ai_worker_provisioning_receipts SET outcome = ${outcome}, worker_id = ${result?.workerId ?? null}, deployment_id = ${result?.deploymentId ?? null}, completed_at = clock_timestamp() WHERE nonce = ${request.nonce}`;
    return result ? { ...result, ...PINNED_WORKER, requestId: request.nonce } : { code: outcome };
  }, { timeout: 10_000 });
}

export async function readProvisionBody(req: Request): Promise<Uint8Array | null> {
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      count += part.value.length;
      if (count > 512) { await reader.cancel(); return null; }
      chunks.push(part.value);
    }
    return Buffer.concat(chunks);
  } catch { return null; }
  finally { reader.releaseLock(); }
}
