import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type AuthenticatedAiWorker = { id: string; name: string };
export type AiWorkerCredentialCandidate = { id: string; name: string; credentialHash: string; previousCredentialHash: string | null; previousCredentialExpiresAt: Date | null };
export type AiWorkerAuthRepository = {
  findCredentialCandidates(hash: string, now: Date): Promise<AiWorkerCredentialCandidate[]>;
  touch(workerId: string, now: Date): Promise<void>;
};
const tokenPrefix = "dgw_";
const tokenHash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
const equalHash = (a: string, b: string) => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

export function createAiWorkerCredential(): string {
  return `${tokenPrefix}${randomBytes(32).toString("base64url")}`;
}

export async function provisionAiWorker(input: { name: string }): Promise<{ id: string; credential: string }> {
  const credential = createAiWorkerCredential();
  const { prisma } = await import("@dg/database");
  const worker = await prisma.aiWorkerPrincipal.create({ data: {
    name: input.name.trim().slice(0, 100), credentialHash: tokenHash(credential), credentialPrefix: credential.slice(0, 12),
  }, select: { id: true } });
  return { id: worker.id, credential };
}

export async function rotateAiWorkerCredential(workerId: string): Promise<string> {
  const credential = createAiWorkerCredential();
  const { prisma } = await import("@dg/database");
  const worker = await prisma.aiWorkerPrincipal.findFirst({ where: { id: workerId, revokedAt: null } });
  if (!worker) throw new Error("Worker unavailable");
  await prisma.aiWorkerPrincipal.update({ where: { id: workerId }, data: {
    previousCredentialHash: worker.credentialHash,
    previousCredentialExpiresAt: new Date(Date.now() + 5 * 60_000),
    credentialHash: tokenHash(credential), credentialPrefix: credential.slice(0, 12),
  } });
  return credential;
}

export async function revokeAiWorker(workerId: string): Promise<void> {
  const { prisma } = await import("@dg/database");
  await prisma.aiWorkerPrincipal.updateMany({ where: { id: workerId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function registerAiLocalDeployment(input: { workerId: string; name: string; modelDigest: string }) {
  if (!/^(sha256:)?[a-f0-9]{64}$/i.test(input.modelDigest) || !input.name.trim()) throw new Error("Invalid approved deployment identity");
  const { prisma } = await import("@dg/database");
  const worker = await prisma.aiWorkerPrincipal.findFirst({ where: { id: input.workerId, revokedAt: null }, select: { id: true } });
  if (!worker) throw new Error("Worker unavailable");
  return prisma.aiLocalDeployment.create({ data: { name: input.name.trim().slice(0, 100), workerId: worker.id,
    endpointKind: "ollama_loopback", lane: "local_routine", modelId: "dg-fast:latest", modelDigest: input.modelDigest } });
}

export async function provisionAiLocalWorker(input: { name: string; modelDigest: string }) {
  if (!/^(sha256:)?[a-f0-9]{64}$/i.test(input.modelDigest) || !input.name.trim()) throw new Error("Invalid approved deployment identity");
  const credential = createAiWorkerCredential();
  const { prisma } = await import("@dg/database");
  const created = await prisma.$transaction(async (tx) => {
    const worker = await tx.aiWorkerPrincipal.create({ data: { name: input.name.trim().slice(0, 100),
      credentialHash: tokenHash(credential), credentialPrefix: credential.slice(0, 12) }, select: { id: true } });
    const deployment = await tx.aiLocalDeployment.create({ data: { name: input.name.trim().slice(0, 100),
      workerId: worker.id, endpointKind: "ollama_loopback", lane: "local_routine", modelId: "dg-fast:latest", modelDigest: input.modelDigest } });
    return { workerId: worker.id, deploymentId: deployment.id };
  });
  return { ...created, credential };
}

export async function authenticateAiWorker(request: Request, repository?: AiWorkerAuthRepository): Promise<AuthenticatedAiWorker | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer (dgw_[A-Za-z0-9_-]{43})$/.exec(authorization);
  if (!match) return null;
  const supplied = tokenHash(match[1]);
  const now = new Date();
  let repo = repository;
  if (!repo) {
    const { prisma } = await import("@dg/database");
    repo = {
      findCredentialCandidates: (hash, at) => prisma.aiWorkerPrincipal.findMany({
        where: { revokedAt: null, OR: [{ credentialHash: hash }, { previousCredentialHash: hash, previousCredentialExpiresAt: { gt: at } }] },
        select: { id: true, name: true, credentialHash: true, previousCredentialHash: true, previousCredentialExpiresAt: true }, take: 2,
      }),
      touch: async (workerId, at) => { await prisma.aiWorkerPrincipal.update({ where: { id: workerId }, data: { lastSeenAt: at } }); },
    };
  }
  const candidates = await repo.findCredentialCandidates(supplied, now);
  const worker = candidates.find((candidate) =>
    equalHash(candidate.credentialHash, supplied) || (candidate.previousCredentialHash &&
      candidate.previousCredentialExpiresAt && candidate.previousCredentialExpiresAt > now && equalHash(candidate.previousCredentialHash, supplied)));
  if (!worker) return null;
  await repo.touch(worker.id, now);
  return { id: worker.id, name: worker.name };
}
