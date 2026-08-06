import { createHash, randomBytes } from "node:crypto";

import { writeAuditLog } from "../audit";
import type { PlatformSession } from "../session";

export const PLATFORM_API_KEY_PREFIX = "dg_live_";

export interface PlatformApiKeyRecord {
  id: string;
  organisationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreatePlatformApiKeyInput {
  organisationId: string;
  name: string;
  actorId?: string;
  scopes?: string[];
  expiresAt?: Date;
}

export interface CreatePlatformApiKeyResult {
  key: PlatformApiKeyRecord;
  /** Full secret — shown once at creation */
  secret: string;
}

function hashKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function serializeKey(row: {
  id: string;
  organisationId: string;
  name: string;
  keyPrefix: string;
  scopes: unknown;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): PlatformApiKeyRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    revokedAt: row.revokedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createPlatformApiKey(
  input: CreatePlatformApiKeyInput,
): Promise<CreatePlatformApiKeyResult> {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const secret = `${PLATFORM_API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  const keyPrefix = secret.slice(0, 16);
  const keyHash = hashKey(secret);

  const row = await prisma.platformApiKey.create({
    data: {
      organisationId: input.organisationId,
      name: input.name.trim(),
      keyPrefix,
      keyHash,
      scopes: (input.scopes ?? ["*"]) as InputJsonValue,
      expiresAt: input.expiresAt,
      createdBy: input.actorId,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "platform_api_key",
    entityId: row.id,
    changes: { name: row.name, keyPrefix },
  });

  return { key: serializeKey(row), secret };
}

export async function listPlatformApiKeys(organisationId: string) {
  const { prisma } = await import("@dg/database");

  const rows = await prisma.platformApiKey.findMany({
    where: { organisationId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(serializeKey);
}

export async function revokePlatformApiKey(input: {
  organisationId: string;
  keyId: string;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.platformApiKey.findFirst({
    where: {
      id: input.keyId,
      organisationId: input.organisationId,
      revokedAt: null,
    },
  });

  if (!existing) return null;

  const row = await prisma.platformApiKey.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "delete",
    entityType: "platform_api_key",
    entityId: row.id,
    changes: { name: row.name },
  });

  return serializeKey(row);
}

export interface VerifiedApiKey {
  keyId: string;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  keyName: string;
  scopes: string[];
}

/** Verify a platform API key and return org context. Updates lastUsedAt. */
export async function verifyPlatformApiKey(
  secret: string,
): Promise<VerifiedApiKey | null> {
  if (!secret.startsWith(PLATFORM_API_KEY_PREFIX)) return null;

  const { prisma } = await import("@dg/database");
  const keyHash = hashKey(secret);
  const now = new Date();

  const row = await prisma.platformApiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { organisation: true },
  });

  if (!row) return null;

  await prisma.platformApiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: now },
  });

  return {
    keyId: row.id,
    organisationId: row.organisationId,
    organisationName: row.organisation.name,
    organisationSlug: row.organisation.slug,
    keyName: row.name,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : ["*"],
  };
}

/** Map verified API key to a PlatformSession for Core services. */
export function apiKeyToPlatformSession(verified: VerifiedApiKey): PlatformSession {
  return {
    clerkUserId: `api_key:${verified.keyId}`,
    email: "",
    name: verified.keyName,
    organisationId: verified.organisationId,
    organisationName: verified.organisationName,
    organisationSlug: verified.organisationSlug,
    membershipId: `api_key:${verified.keyId}`,
    role: "admin",
    dbConfigured: true,
    organisations: [
      {
        organisationId: verified.organisationId,
        organisationName: verified.organisationName,
        organisationSlug: verified.organisationSlug,
        membershipId: `api_key:${verified.keyId}`,
        role: "admin",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function isApiKeySession(session: PlatformSession) {
  return session.clerkUserId.startsWith("api_key:");
}
