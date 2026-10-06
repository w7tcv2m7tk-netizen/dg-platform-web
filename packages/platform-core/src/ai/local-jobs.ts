import { createHash, randomBytes, randomUUID } from "node:crypto";
import { decryptAiJobContent, encryptAiJobContent, type AiJobAad } from "./local-crypto";
import { AI_TASK_DEFINITIONS, validateAiTextResult, type AiTask } from "./policy";
import type { AuthenticatedAiWorker } from "./local-worker-auth";

export const AI_LOCAL_LIMITS = Object.freeze({ submissionMs: 12_000, expiresMs: 5 * 60_000, inferenceMs: 90_000, leaseMs: 30_000, heartbeatMs: 10_000 });
const CLASSIFICATION_RANK: Record<string, number> = { public: 0, platform_internal: 1, tenant_confidential: 2, restricted: 3 };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

type LocalRequest = {
  organisationId: string; actorType: "user" | "system" | "connector"; actorId?: string;
  correlationId: string; task: AiTask; policyVersion: number; classification: string;
  deploymentId: string; approvalId?: string; idempotencyKey: string; contextBudgetTokens: number;
  maxOutputTokens: number; payload: { messages: Array<{ role: string; content: string }> };
};

function payloadAad(job: { id: string; organisationId: string; task: string; taskVersion: number; policyVersion: number; classification: string; deploymentId: string }, kind: AiJobAad["kind"]): AiJobAad {
  return { jobId: job.id, organisationId: job.organisationId, task: job.task, taskVersion: job.taskVersion,
    policyVersion: job.policyVersion, classification: job.classification, deploymentId: job.deploymentId, kind };
}

export class AiLocalJobError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.name = "AiLocalJobError"; this.code = code; }
}

export async function resolveApprovedAiLocalDeployment(input: { organisationId: string; classification: string }) {
  const { prisma } = await import("@dg/database");
  const approval = await prisma.aiLocalRecipientApproval.findFirst({
    where: { organisationId: input.organisationId, revokedAt: null,
      classificationCeiling: { in: Object.keys(CLASSIFICATION_RANK).filter((key) => CLASSIFICATION_RANK[key] >= (CLASSIFICATION_RANK[input.classification] ?? 99)) },
      deployment: { active: true, lane: "local_routine", modelId: "dg-fast:latest", endpointKind: "ollama_loopback", worker: { revokedAt: null } } },
    orderBy: { approvedAt: "desc" }, select: { deploymentId: true, policyVersion: true, classificationCeiling: true },
  });
  if (!approval) throw new AiLocalJobError("local_recipient_not_approved");
  return approval;
}

export async function approveAiLocalRecipient(input: { organisationId: string; deploymentId: string; actorType: "user" | "system" | "connector"; actorId?: string; classificationCeiling: string }) {
  if (!Object.hasOwn(CLASSIFICATION_RANK, input.classificationCeiling)) throw new AiLocalJobError("invalid_classification");
  const { prisma } = await import("@dg/database");
  const deployment = await prisma.aiLocalDeployment.findFirst({ where: { id: input.deploymentId, active: true,
    lane: "local_routine", modelId: "dg-fast:latest", endpointKind: "ollama_loopback", worker: { revokedAt: null } } });
  if (!deployment || !/^(sha256:)?[a-f0-9]{64}$/i.test(deployment.modelDigest)) throw new AiLocalJobError("deployment_unavailable");
  return prisma.aiLocalRecipientApproval.create({ data: { organisationId: input.organisationId, deploymentId: deployment.id,
    approvedByActorType: input.actorType, approvedByActorId: input.actorId, policyVersion: 1,
    classificationCeiling: input.classificationCeiling } });
}

export async function revokeAiLocalRecipient(input: { organisationId: string; approvalId: string }) {
  const { prisma } = await import("@dg/database");
  const now = new Date();
  const changed = await prisma.aiLocalRecipientApproval.updateMany({ where: { id: input.approvalId,
    organisationId: input.organisationId, revokedAt: null }, data: { revokedAt: now } });
  if (!changed.count) return null;
  return prisma.aiLocalRecipientApproval.findFirst({ where: { id: input.approvalId, organisationId: input.organisationId },
    select: { id: true, revokedAt: true } });
}

export async function enqueueAiLocalJob(input: LocalRequest) {
  const definition = AI_TASK_DEFINITIONS[input.task];
  if (!definition || input.maxOutputTokens < 1 || input.maxOutputTokens > definition.maxOutputTokens ||
      input.contextBudgetTokens < 1 || input.contextBudgetTokens > definition.requirements.contextBudgetTokens ||
      !input.idempotencyKey || input.idempotencyKey.length > 160 || !Object.hasOwn(CLASSIFICATION_RANK, input.classification)) {
    throw new AiLocalJobError("invalid_local_request");
  }
  const { prisma } = await import("@dg/database");
  const now = new Date();
  const payloadJson = JSON.stringify(input.payload);
  if (Buffer.byteLength(payloadJson, "utf8") > 65_536 || input.payload.messages.length < 1 || input.payload.messages.length > 16 ||
      input.payload.messages.some((message) => typeof message.content !== "string" || Buffer.byteLength(message.content, "utf8") > 32_768 ||
        !["system", "user", "assistant"].includes(message.role))) throw new AiLocalJobError("invalid_local_request");
  const requestHash = hash(JSON.stringify({ task: input.task, taskVersion: definition.version, policyVersion: input.policyVersion,
    classification: input.classification, deploymentId: input.deploymentId, contextBudgetTokens: input.contextBudgetTokens,
    maxOutputTokens: input.maxOutputTokens, payload: input.payload }));
  const id = randomUUID();
  const jobForAad = { id, organisationId: input.organisationId, task: input.task, taskVersion: definition.version,
    policyVersion: input.policyVersion, classification: input.classification, deploymentId: input.deploymentId };
  const encrypted = encryptAiJobContent(payloadJson, payloadAad(jobForAad, "payload"));
  const expiresAt = new Date(now.getTime() + AI_LOCAL_LIMITS.expiresMs);
  const deadlineAt = expiresAt;
  try {
    const job = await prisma.$transaction(async (tx) => {
      const approval = await tx.aiLocalRecipientApproval.findFirst({
        where: { organisationId: input.organisationId, deploymentId: input.deploymentId, revokedAt: null,
          ...(input.approvalId ? { id: input.approvalId } : {}) },
        include: { deployment: { include: { worker: true } } },
        orderBy: { approvedAt: "desc" },
      });
      if (!approval || approval.policyVersion !== input.policyVersion ||
          (CLASSIFICATION_RANK[input.classification] ?? 99) > (CLASSIFICATION_RANK[approval.classificationCeiling] ?? -1) ||
          !approval.deployment.active || approval.deployment.lane !== "local_routine" ||
          approval.deployment.modelId !== "dg-fast:latest" || !approval.deployment.modelDigest ||
          approval.deployment.endpointKind !== "ollama_loopback" || approval.deployment.worker.revokedAt) {
        throw new AiLocalJobError("local_recipient_not_approved");
      }
      const existing = await tx.aiInferenceJob.findFirst({ where: { organisationId: input.organisationId,
        actorType: input.actorType, actorId: input.actorId ?? null, idempotencyKey: input.idempotencyKey } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new AiLocalJobError("idempotency_conflict");
        return existing;
      }
      return tx.aiInferenceJob.create({ data: {
        id, organisationId: input.organisationId, actorType: input.actorType, actorId: input.actorId,
        correlationId: input.correlationId, task: input.task, taskVersion: definition.version,
        policyVersion: input.policyVersion, classification: input.classification, executionLane: "local_routine",
        deploymentId: input.deploymentId, approvalId: approval.id, idempotencyKey: input.idempotencyKey,
        requestHash, resultContract: definition.resultContract, resultContractVersion: 1,
        contextBudgetTokens: input.contextBudgetTokens, maxOutputTokens: input.maxOutputTokens,
        maxAttempts: 2, deadlineAt, expiresAt, payloadCiphertext: Buffer.from(encrypted.ciphertext),
        payloadNonce: Buffer.from(encrypted.nonce), payloadKeyVersion: encrypted.keyVersion,
      } });
    });
    return { id: job.id, status: job.status, statusUrl: `/api/v1/ai/jobs/${job.id}`, idempotent: job.id !== id };
  } catch (error) {
    if (error instanceof AiLocalJobError) throw error;
    if ((error as { code?: string })?.code === "P2002") {
      const existing = await prisma.aiInferenceJob.findFirst({ where: { organisationId: input.organisationId,
        actorType: input.actorType, actorId: input.actorId ?? null, idempotencyKey: input.idempotencyKey } });
      if (existing?.requestHash === requestHash) return { id: existing.id, status: existing.status, statusUrl: `/api/v1/ai/jobs/${existing.id}`, idempotent: true };
      throw new AiLocalJobError("idempotency_conflict");
    }
    throw error;
  }
}

export async function getAiLocalJob(input: { id: string; organisationId: string }) {
  const { prisma } = await import("@dg/database");
  return prisma.aiInferenceJob.findFirst({ where: { id: input.id, organisationId: input.organisationId }, select: {
      id: true, task: true, status: true, createdAt: true, completedAt: true, expiresAt: true,
      errorCode: true, resultCiphertext: true, resultNonce: true, resultKeyVersion: true,
      organisationId: true, taskVersion: true, policyVersion: true, classification: true, deploymentId: true,
    } });
}

export async function cancelAiLocalJob(input: { id: string; organisationId: string }) {
  const { prisma } = await import("@dg/database");
  return prisma.$transaction(async (tx) => {
    const row = await tx.aiInferenceJob.findFirst({ where: { id: input.id, organisationId: input.organisationId } });
    if (!row) return null;
    const now = new Date();
    if (row.status === "queued") {
      const changed = await tx.aiInferenceJob.updateMany({ where: { id: row.id, status: "queued" }, data: { status: "cancelled", cancelRequestedAt: now, completedAt: now, payloadPurgeAt: new Date(now.getTime() + 60 * 60_000), metadataPurgeAt: new Date(now.getTime() + 90 * 24 * 60 * 60_000) } });
      if (changed.count) return tx.aiInferenceJob.findUniqueOrThrow({ where: { id: row.id } });
    }
    const current = await tx.aiInferenceJob.findUnique({ where: { id: row.id } });
    if (current?.status === "leased" && !current.cancelRequestedAt) {
      await tx.aiInferenceJob.updateMany({ where: { id: row.id, status: "leased", cancelRequestedAt: null }, data: { cancelRequestedAt: now } });
      return tx.aiInferenceJob.findUniqueOrThrow({ where: { id: row.id } });
    }
    return current;
  });
}

export async function claimAiLocalJob(worker: AuthenticatedAiWorker, input: { operationId: string; requestTimestamp: number }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.operationId) || !Number.isSafeInteger(input.requestTimestamp) || Math.abs(Date.now() - input.requestTimestamp) > 60_000) throw new AiLocalJobError("invalid_worker_operation");
  const { prisma } = await import("@dg/database");
  const leaseToken = randomBytes(32).toString("base64url");
  const leaseTokenHash = hash(leaseToken);
  let result;
  try { result = await prisma.$transaction(async (tx) => {
    const principal = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ai_worker_principals" WHERE "id" = ${worker.id} AND "revoked_at" IS NULL FOR UPDATE`;
    if (!principal.length) throw new AiLocalJobError("worker_revoked");
    const receipt = await tx.aiWorkerClaimReceipt.findUnique({ where: { workerId_operationId: { workerId: worker.id, operationId: input.operationId } } });
    if (receipt) throw new AiLocalJobError("claim_operation_replayed");
    await tx.$executeRaw`UPDATE "ai_inference_jobs" j SET "status" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN 'cancelled' WHEN j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') THEN 'expired' WHEN j."attempt_count" >= j."max_attempts" THEN 'failed' ELSE 'queued' END, "completed_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL OR j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') OR j."attempt_count" >= j."max_attempts" THEN (NOW() AT TIME ZONE 'UTC') ELSE NULL END, "payload_purge_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL OR j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') OR j."attempt_count" >= j."max_attempts" THEN (NOW() AT TIME ZONE 'UTC') + INTERVAL '1 hour' ELSE j."payload_purge_at" END, "metadata_purge_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL OR j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') OR j."attempt_count" >= j."max_attempts" THEN (NOW() AT TIME ZONE 'UTC') + INTERVAL '90 days' ELSE j."metadata_purge_at" END, "lease_worker_id" = NULL, "lease_token_hash" = NULL, "claim_operation_id" = NULL, "lease_expires_at" = NULL, "last_heartbeat_at" = NULL, "updated_at" = (NOW() AT TIME ZONE 'UTC') WHERE j."status" = 'leased' AND j."lease_expires_at" <= (NOW() AT TIME ZONE 'UTC') AND EXISTS (SELECT 1 FROM "ai_local_deployments" d WHERE d."id" = j."deployment_id" AND d."worker_id" = ${worker.id})`;
    await tx.$executeRaw`UPDATE "ai_inference_jobs" SET "status" = 'expired', "completed_at" = (NOW() AT TIME ZONE 'UTC'), "payload_purge_at" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '1 hour', "metadata_purge_at" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '90 days', "updated_at" = (NOW() AT TIME ZONE 'UTC') WHERE "status" = 'queued' AND ("expires_at" <= (NOW() AT TIME ZONE 'UTC') OR "deadline_at" <= (NOW() AT TIME ZONE 'UTC')) AND EXISTS (SELECT 1 FROM "ai_local_deployments" d WHERE d."id" = "ai_inference_jobs"."deployment_id" AND d."worker_id" = ${worker.id})`;
    const claimed = await tx.$queryRaw<Array<{ id: string }>>`
      WITH candidate AS (
        SELECT j."id" FROM "ai_inference_jobs" j
        JOIN "ai_local_deployments" d ON d."id" = j."deployment_id" AND d."worker_id" = ${worker.id}
        JOIN "ai_worker_principals" w ON w."id" = d."worker_id" AND w."revoked_at" IS NULL
        JOIN "ai_local_recipient_approvals" a ON a."id" = j."approval_id" AND a."revoked_at" IS NULL
        WHERE j."status" = 'queued' AND j."expires_at" > (NOW() AT TIME ZONE 'UTC') AND j."deadline_at" > (NOW() AT TIME ZONE 'UTC')
          AND d."active" = true AND d."lane" = 'local_routine' AND d."model_id" = 'dg-fast:latest'
          AND a."organisation_id" = j."organisation_id" AND a."deployment_id" = j."deployment_id"
          AND a."policy_version" = j."policy_version"
          AND CASE a."classification_ceiling" WHEN 'public' THEN 0 WHEN 'platform_internal' THEN 1 WHEN 'tenant_confidential' THEN 2 WHEN 'restricted' THEN 3 ELSE -1 END
            >= CASE j."classification" WHEN 'public' THEN 0 WHEN 'platform_internal' THEN 1 WHEN 'tenant_confidential' THEN 2 WHEN 'restricted' THEN 3 ELSE 99 END
        ORDER BY j."created_at" ASC FOR UPDATE OF j SKIP LOCKED LIMIT 1
      )
      UPDATE "ai_inference_jobs" j SET "status" = 'leased', "lease_worker_id" = ${worker.id},
        "lease_token_hash" = ${leaseTokenHash}, "claim_operation_id" = ${input.operationId},
        "attempt_count" = j."attempt_count" + 1, "lease_generation" = j."lease_generation" + 1,
        "lease_expires_at" = LEAST((NOW() AT TIME ZONE 'UTC') + INTERVAL '30 seconds', j."deadline_at", j."expires_at"),
        "last_heartbeat_at" = (NOW() AT TIME ZONE 'UTC'), "last_heartbeat_operation_id" = NULL, "heartbeat_sequence" = 0, "updated_at" = (NOW() AT TIME ZONE 'UTC')
      FROM candidate c WHERE j."id" = c."id" RETURNING j."id"`;
    if (!claimed[0]) return null;
    await tx.aiWorkerClaimReceipt.create({ data: { id: randomUUID(), workerId: worker.id, operationId: input.operationId, jobId: claimed[0].id } });
    return tx.aiInferenceJob.findUniqueOrThrow({ where: { id: claimed[0].id }, include: { deployment: { include: { worker: true } }, approval: true } });
  }); } catch (error) {
    if ((error as { code?: string })?.code === "P2002") throw new AiLocalJobError("claim_operation_replayed");
    throw error;
  }
  if (!result) return null;
  const stillApproved = await prisma.aiInferenceJob.findFirst({ where: { id: result.id, status: "leased", leaseWorkerId: worker.id,
    leaseTokenHash, leaseGeneration: result.leaseGeneration, leaseExpiresAt: { gt: new Date() }, deadlineAt: { gt: new Date() },
    expiresAt: { gt: new Date() }, approval: { revokedAt: null, policyVersion: result.policyVersion,
      organisationId: result.organisationId, deploymentId: result.deploymentId },
    deployment: { active: true, modelId: "dg-fast:latest", lane: "local_routine", worker: { revokedAt: null } } }, select: { id: true } });
  if (!stillApproved || !result.payloadCiphertext || !result.payloadNonce || !result.payloadKeyVersion || result.leaseTokenHash !== leaseTokenHash || !result.leaseExpiresAt || result.leaseExpiresAt <= new Date() ||
      result.approval.revokedAt || !result.deployment.active || result.deployment.worker.revokedAt) throw new AiLocalJobError("lease_invalid");
  const payload = decryptAiJobContent({ ciphertext: Buffer.from(result.payloadCiphertext), nonce: Buffer.from(result.payloadNonce), keyVersion: result.payloadKeyVersion }, payloadAad(result, "payload"));
  return { id: result.id, task: result.task, taskVersion: result.taskVersion, policyVersion: result.policyVersion,
    classification: result.classification, resultContract: result.resultContract, resultContractVersion: result.resultContractVersion,
    contextBudgetTokens: result.contextBudgetTokens, maxOutputTokens: result.maxOutputTokens,
    deadlineAt: result.deadlineAt.toISOString(), deploymentId: result.deploymentId, modelId: result.deployment.modelId,
    modelDigest: result.deployment.modelDigest, leaseToken, leaseGeneration: result.leaseGeneration,
    leaseExpiresAt: result.leaseExpiresAt.toISOString(), payload: JSON.parse(payload) as LocalRequest["payload"] };
}

export async function heartbeatAiLocalJob(worker: AuthenticatedAiWorker, input: { jobId: string; leaseToken: string; generation: number; operationId: string; sequence: number }) {
  if (!tokenPattern.test(input.leaseToken) || !/^[0-9a-f-]{36}$/i.test(input.operationId) || !Number.isSafeInteger(input.sequence) || input.sequence < 1) throw new AiLocalJobError("invalid_worker_operation");
  const { prisma } = await import("@dg/database");
  const tokenHash = hash(input.leaseToken);
  const updated = await prisma.$queryRaw<Array<{ status: string; cancel_requested_at: Date | null; lease_expires_at: Date | null; deadline_at: Date }>>`
    UPDATE "ai_inference_jobs" j SET "last_heartbeat_at" = (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC'), "last_heartbeat_operation_id" = ${input.operationId},
      "heartbeat_sequence" = ${input.sequence},
      "status" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN 'cancelled' ELSE 'leased' END,
      "completed_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') ELSE j."completed_at" END,
      "payload_purge_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') + INTERVAL '1 hour' ELSE j."payload_purge_at" END,
      "metadata_purge_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') + INTERVAL '90 days' ELSE j."metadata_purge_at" END,
      "lease_worker_id" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN NULL ELSE j."lease_worker_id" END,
      "lease_token_hash" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN NULL ELSE j."lease_token_hash" END,
      "claim_operation_id" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN NULL ELSE j."claim_operation_id" END,
      "lease_expires_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN NULL ELSE LEAST((CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') + INTERVAL '30 seconds', j."deadline_at", j."expires_at") END,
      "updated_at" = (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC')
    WHERE j."id" = ${input.jobId} AND j."status" = 'leased' AND j."lease_worker_id" = ${worker.id}
      AND j."lease_token_hash" = ${tokenHash} AND j."lease_generation" = ${input.generation}
      AND j."lease_expires_at" > (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') AND j."deadline_at" > (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') AND j."expires_at" > (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC')
      AND j."heartbeat_sequence" + 1 = ${input.sequence}
      AND EXISTS (SELECT 1 FROM "ai_local_recipient_approvals" a JOIN "ai_local_deployments" d ON d."id" = a."deployment_id"
        JOIN "ai_worker_principals" w ON w."id" = d."worker_id"
        WHERE a."id" = j."approval_id" AND a."revoked_at" IS NULL AND a."organisation_id" = j."organisation_id"
          AND d."id" = j."deployment_id" AND d."active" = true AND d."worker_id" = ${worker.id} AND w."revoked_at" IS NULL)
    RETURNING j."status", j."cancel_requested_at", j."lease_expires_at", j."deadline_at"`;
  let lease = updated[0];
  if (!lease) {
    const replay = await prisma.aiInferenceJob.findFirst({ where: { id: input.jobId, status: "leased", leaseWorkerId: worker.id,
      leaseTokenHash: tokenHash, leaseGeneration: input.generation, heartbeatSequence: input.sequence, lastHeartbeatOperationId: input.operationId,
      leaseExpiresAt: { gt: new Date() }, approval: { revokedAt: null }, deployment: { active: true, worker: { revokedAt: null } } },
      select: { cancelRequestedAt: true, leaseExpiresAt: true, deadlineAt: true } });
    if (!replay || !replay.leaseExpiresAt) throw new AiLocalJobError("lease_invalid");
    return { cancelRequested: Boolean(replay.cancelRequestedAt), leaseExpiresAt: replay.leaseExpiresAt.toISOString(), deadlineAt: replay.deadlineAt.toISOString() };
  }
  return { cancelRequested: Boolean(lease.cancel_requested_at) || lease.status === "cancelled", leaseExpiresAt: lease.lease_expires_at?.toISOString() ?? null, deadlineAt: lease.deadline_at.toISOString() };
}

export async function completeAiLocalJob(worker: AuthenticatedAiWorker, input: {
  jobId: string; leaseToken: string; generation: number; operationId: string;
  outcome: "succeeded" | "failed"; text?: string; modelId?: string; modelDigest?: string;
  failureCode?: "ollama_unavailable" | "model_identity_mismatch" | "invalid_output" | "inference_timeout" | "inference_failed";
  tokensIn?: unknown; tokensOut?: unknown; retryable?: boolean;
}) {
  if (!tokenPattern.test(input.leaseToken) || !/^[0-9a-f-]{36}$/i.test(input.operationId) ||
      !Number.isSafeInteger(input.generation) || input.generation < 1 ||
      !["succeeded", "failed"].includes(input.outcome)) throw new AiLocalJobError("invalid_worker_operation");
  const { prisma } = await import("@dg/database");
  const tokenHash = hash(input.leaseToken);
  const requestHash = hash(JSON.stringify({ outcome: input.outcome, text: input.text ?? null, modelId: input.modelId ?? null,
    modelDigest: input.modelDigest ?? null, failureCode: input.failureCode ?? null, tokensIn: input.tokensIn ?? null,
    tokensOut: input.tokensOut ?? null, retryable: input.retryable === true }));
  return prisma.$transaction(async (tx) => {
    // This first read supplies lock addresses only; it is never an authority check.
    const address = await tx.aiInferenceJob.findUnique({ where: { id: input.jobId },
      select: { deploymentId: true, approvalId: true } });
    if (!address) throw new AiLocalJobError("lease_invalid");
    // Keep authority rows stable through commit. Worker-first agrees with claim's
    // lock order. Never hold any of these locks while the Mac performs inference.
    const principals = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ai_worker_principals"
      WHERE "id" = ${worker.id} AND "revoked_at" IS NULL FOR SHARE`;
    if (!principals.length) throw new AiLocalJobError("lease_invalid");
    const deployments = await tx.$queryRaw<Array<{ id: string; model_digest: string }>>`SELECT "id", "model_digest" FROM "ai_local_deployments"
      WHERE "id" = ${address.deploymentId} AND "worker_id" = ${worker.id} AND "active" = true
        AND "lane" = 'local_routine' AND "endpoint_kind" = 'ollama_loopback' AND "model_id" = 'dg-fast:latest' FOR SHARE`;
    if (!deployments.length) throw new AiLocalJobError("lease_invalid");
    const approvals = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ai_local_recipient_approvals"
      WHERE "id" = ${address.approvalId} AND "deployment_id" = ${address.deploymentId} AND "revoked_at" IS NULL FOR SHARE`;
    if (!approvals.length) throw new AiLocalJobError("lease_invalid");
    const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "ai_inference_jobs"
      WHERE "id" = ${input.jobId} FOR UPDATE`;
    if (!locked.length) throw new AiLocalJobError("lease_invalid");
    // Re-read after all lock waits, including concurrent identical completions.
    const job = await tx.aiInferenceJob.findUniqueOrThrow({ where: { id: input.jobId }, include: { approval: true } });
    if (job.deploymentId !== address.deploymentId || job.approvalId !== address.approvalId ||
        job.approval.organisationId !== job.organisationId || job.approval.deploymentId !== job.deploymentId ||
        job.approval.policyVersion !== job.policyVersion || job.approval.revokedAt ||
        (CLASSIFICATION_RANK[job.classification] ?? 99) > (CLASSIFICATION_RANK[job.approval.classificationCeiling] ?? -1) ||
        job.executionLane !== "local_routine" || !AI_TASK_DEFINITIONS[job.task as AiTask] || job.taskVersion !== 1 ||
        job.resultContract !== "crm_text_v1" || job.resultContractVersion !== 1) throw new AiLocalJobError("lease_invalid");
    if (job.completionOperationId === input.operationId) {
      // A completion receipt survives clearing the live lease, but cannot be
      // replayed by another worker, token, or a generation superseded by retry.
      if (job.completionWorkerId !== worker.id || job.completionLeaseTokenHash !== tokenHash ||
          job.completionLeaseGeneration !== input.generation || job.leaseGeneration !== input.generation ||
          job.status === "leased") throw new AiLocalJobError("lease_invalid");
      if (job.completionRequestHash !== requestHash) throw new AiLocalJobError("completion_conflict");
      return { status: job.status, duplicate: true };
    }
    if (input.outcome === "succeeded" && (deployments[0].model_digest !== input.modelDigest || input.modelId !== "dg-fast:latest")) {
      throw new AiLocalJobError("model_identity_mismatch");
    }
    if (input.outcome === "failed" && !["ollama_unavailable", "model_identity_mismatch", "invalid_output", "inference_timeout", "inference_failed"].includes(input.failureCode ?? "")) {
      throw new AiLocalJobError("invalid_worker_operation");
    }
    const succeeded = input.outcome === "succeeded";
    if (succeeded && (!validateAiTextResult(input.text) || input.text.length > 20_000 || Buffer.byteLength(input.text, "utf8") > 80_000)) {
      throw new AiLocalJobError("invalid_result");
    }
    const encrypted = succeeded ? encryptAiJobContent(input.text!, payloadAad(job, "result")) : null;
    const status = succeeded ? "succeeded" : input.retryable && job.attemptCount < job.maxAttempts ? "queued" : "failed";
    const tokensIn = succeeded ? safeCount(input.tokensIn) : null;
    const tokensOut = succeeded ? safeCount(input.tokensOut) : null;
    // NOW() is PostgreSQL's transaction-start time, so CLOCK_TIMESTAMP() is also
    // required: lock contention must not let a transaction retain an expired lease.
    // Authority rows and the job stay locked until the result + outbox commit.
    const updated = await tx.$executeRaw`
      UPDATE "ai_inference_jobs" j SET "status" = ${status},
        "result_ciphertext" = ${encrypted ? Buffer.from(encrypted.ciphertext) : null},
        "result_nonce" = ${encrypted ? Buffer.from(encrypted.nonce) : null}, "result_key_version" = ${encrypted?.keyVersion ?? null},
        "result_hash" = ${succeeded ? hash(input.text!) : null}, "result_model" = ${succeeded ? "dg-fast:latest" : null},
        "usage_input_tokens" = ${tokensIn}, "usage_output_tokens" = ${tokensOut},
        "completion_operation_id" = ${input.operationId}, "completion_request_hash" = ${requestHash},
        "completion_worker_id" = ${worker.id}, "completion_lease_token_hash" = ${tokenHash}, "completion_lease_generation" = ${input.generation},
        "completed_at" = CASE WHEN ${status} = 'queued' THEN NULL ELSE (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') END,
        "payload_purge_at" = CASE WHEN ${status} = 'queued' THEN NULL ELSE (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') + INTERVAL '1 hour' END,
        "result_purge_at" = CASE WHEN ${succeeded} THEN (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') + INTERVAL '24 hours' ELSE NULL END,
        "metadata_purge_at" = CASE WHEN ${status} = 'queued' THEN NULL ELSE (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') + INTERVAL '90 days' END,
        "error_code" = ${succeeded ? null : status === "queued" ? "inference_retryable" : input.failureCode!},
        "lease_worker_id" = NULL, "lease_token_hash" = NULL, "claim_operation_id" = NULL, "lease_expires_at" = NULL, "updated_at" = (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC')
      WHERE j."id" = ${job.id} AND j."status" = 'leased' AND j."lease_worker_id" = ${worker.id}
        AND j."lease_token_hash" = ${tokenHash} AND j."lease_generation" = ${input.generation} AND j."cancel_requested_at" IS NULL
        AND j."lease_expires_at" > (NOW() AT TIME ZONE 'UTC') AND j."deadline_at" > (NOW() AT TIME ZONE 'UTC') AND j."expires_at" > (NOW() AT TIME ZONE 'UTC')
        AND j."lease_expires_at" > (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') AND j."deadline_at" > (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC') AND j."expires_at" > (CLOCK_TIMESTAMP() AT TIME ZONE 'UTC')
        AND EXISTS (SELECT 1 FROM "ai_local_deployments" d JOIN "ai_worker_principals" w ON w."id" = d."worker_id"
          JOIN "ai_local_recipient_approvals" a ON a."deployment_id" = d."id"
          WHERE d."id" = j."deployment_id" AND d."active" = true AND d."worker_id" = ${worker.id} AND w."revoked_at" IS NULL
            AND d."model_id" = 'dg-fast:latest' AND d."model_digest" = ${deployments[0].model_digest}
            AND d."lane" = 'local_routine' AND d."endpoint_kind" = 'ollama_loopback'
            AND a."id" = j."approval_id" AND a."organisation_id" = j."organisation_id" AND a."revoked_at" IS NULL
            AND a."policy_version" = j."policy_version")`;
    if (!updated) throw new AiLocalJobError("lease_invalid");
    if (succeeded) await tx.aiAccountingOutbox.create({ data: {
      id: randomUUID(), jobId: job.id, organisationId: job.organisationId, eventType: "ai.assist_generated",
      eventKey: `ai-job:${job.id}:completed`, payload: { task: job.task, taskVersion: job.taskVersion,
        policyVersion: job.policyVersion, classification: job.classification, executionLane: job.executionLane,
        deploymentId: job.deploymentId, model: "dg-fast:latest", tokensIn, tokensOut, correlationId: job.correlationId },
    } });
    return { status, duplicate: false };
  });
}

function safeCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 ? value : null;
}

export async function readAiLocalJobForActor(input: { id: string; organisationId: string }) {
  const job = await getAiLocalJob(input);
  if (!job) return null;
  let result: string | null = null;
  if (job.status === "succeeded" && job.resultCiphertext && job.resultNonce && job.resultKeyVersion) {
    result = decryptAiJobContent({ ciphertext: Buffer.from(job.resultCiphertext), nonce: Buffer.from(job.resultNonce), keyVersion: job.resultKeyVersion }, payloadAad(job, "result"));
  }
  return { id: job.id, task: job.task, status: job.status, result, errorCode: job.errorCode,
    createdAt: job.createdAt, completedAt: job.completedAt, expiresAt: job.expiresAt };
}

export async function processAiLocalRetention() {
  const { prisma } = await import("@dg/database");
  const expired = await prisma.$executeRaw`UPDATE "ai_inference_jobs" SET "status" = 'expired', "completed_at" = (NOW() AT TIME ZONE 'UTC'),
    "payload_purge_at" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '1 hour', "metadata_purge_at" = (NOW() AT TIME ZONE 'UTC') + INTERVAL '90 days', "updated_at" = (NOW() AT TIME ZONE 'UTC')
    WHERE "status" = 'queued' AND ("expires_at" <= (NOW() AT TIME ZONE 'UTC') OR "deadline_at" <= (NOW() AT TIME ZONE 'UTC'))`;
  const recovered = await prisma.$executeRaw`UPDATE "ai_inference_jobs" j SET
    "status" = CASE WHEN j."cancel_requested_at" IS NOT NULL THEN 'cancelled' WHEN j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') THEN 'expired' WHEN j."attempt_count" >= j."max_attempts" THEN 'failed' ELSE 'queued' END,
    "completed_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL OR j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') OR j."attempt_count" >= j."max_attempts" THEN (NOW() AT TIME ZONE 'UTC') ELSE NULL END,
    "payload_purge_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL OR j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') OR j."attempt_count" >= j."max_attempts" THEN (NOW() AT TIME ZONE 'UTC') + INTERVAL '1 hour' ELSE j."payload_purge_at" END,
    "metadata_purge_at" = CASE WHEN j."cancel_requested_at" IS NOT NULL OR j."expires_at" <= (NOW() AT TIME ZONE 'UTC') OR j."deadline_at" <= (NOW() AT TIME ZONE 'UTC') OR j."attempt_count" >= j."max_attempts" THEN (NOW() AT TIME ZONE 'UTC') + INTERVAL '90 days' ELSE j."metadata_purge_at" END,
    "lease_worker_id" = NULL, "lease_token_hash" = NULL, "claim_operation_id" = NULL, "lease_expires_at" = NULL,
    "last_heartbeat_at" = NULL, "updated_at" = (NOW() AT TIME ZONE 'UTC') WHERE j."status" = 'leased' AND j."lease_expires_at" <= (NOW() AT TIME ZONE 'UTC')`;
  const purgedPayloads = await prisma.$executeRaw`UPDATE "ai_inference_jobs" SET "payload_ciphertext" = NULL, "payload_nonce" = NULL, "payload_key_version" = NULL, "updated_at" = (NOW() AT TIME ZONE 'UTC')
    WHERE "status" IN ('succeeded', 'failed', 'cancelled', 'expired') AND "payload_purge_at" <= (NOW() AT TIME ZONE 'UTC') AND "payload_ciphertext" IS NOT NULL`;
  const purgedResults = await prisma.$executeRaw`UPDATE "ai_inference_jobs" SET "result_ciphertext" = NULL, "result_nonce" = NULL, "result_key_version" = NULL, "updated_at" = (NOW() AT TIME ZONE 'UTC')
    WHERE "status" = 'succeeded' AND "result_purge_at" <= (NOW() AT TIME ZONE 'UTC') AND "result_ciphertext" IS NOT NULL`;
  const deletedJobs = await prisma.aiInferenceJob.deleteMany({ where: { status: { in: ["succeeded", "failed", "cancelled", "expired"] },
    metadataPurgeAt: { lte: new Date() }, payloadCiphertext: null, resultCiphertext: null } });
  const oldReceipts = new Date(Date.now() - 90 * 24 * 60 * 60_000);
  const deletedClaimReceipts = await prisma.aiWorkerClaimReceipt.deleteMany({ where: { createdAt: { lte: oldReceipts } } });
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 13);
  const deletedEvents = await prisma.aiAccountingOutbox.deleteMany({ where: { deliveredAt: { lte: cutoff } } });
  return { expired, recovered, purgedPayloads, purgedResults, deletedJobs: deletedJobs.count,
    deletedClaimReceipts: deletedClaimReceipts.count, deletedEvents: deletedEvents.count };
}
