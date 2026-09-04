import { randomUUID } from "node:crypto";
import { Prisma, prisma } from "@dg/database";

export const KNOWLEDGE_STATUSES = [
  "proposed",
  "approved",
  "superseded",
  "archived",
  "rejected",
] as const;

export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export type KnowledgeSourceType =
  | "conversation"
  | "conversation_summary"
  | "meeting"
  | "email"
  | "document"
  | "crm_activity"
  | "website"
  | "platform_event"
  | "integration"
  | "user_entry"
  | "research"
  | "legacy_import";

export type KnowledgeItem = {
  id: string;
  organisationId: string;
  knowledgeKey: string | null;
  type: string;
  title: string;
  statement: string;
  status: KnowledgeStatus;
  confidence: number | null;
  importance: string;
  scope: string[];
  sourceId: string | null;
  sourceRef: string | null;
  sourceExcerpt: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  supersedesId: string | null;
  effectiveFrom: Date | null;
  reviewAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type KnowledgeRow = {
  id: string;
  organisation_id: string;
  knowledge_key: string | null;
  type: string;
  title: string;
  statement: string;
  status: KnowledgeStatus;
  confidence: number | null;
  importance: string;
  scope: string[];
  source_id: string | null;
  source_ref: string | null;
  source_excerpt: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  supersedes_id: string | null;
  effective_from: Date | null;
  review_at: Date | null;
  metadata: unknown;
  created_at: Date;
  updated_at: Date;
};

function mapKnowledgeRow(row: KnowledgeRow): KnowledgeItem {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    knowledgeKey: row.knowledge_key,
    type: row.type,
    title: row.title,
    statement: row.statement,
    status: row.status,
    confidence: row.confidence,
    importance: row.importance,
    scope: row.scope ?? [],
    sourceId: row.source_id,
    sourceRef: row.source_ref,
    sourceExcerpt: row.source_excerpt,
    createdBy: row.created_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    supersedesId: row.supersedes_id,
    effectiveFrom: row.effective_from,
    reviewAt: row.review_at,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function scopeSql(scope: string[]) {
  if (scope.length === 0) return Prisma.sql`ARRAY[]::text[]`;
  return Prisma.sql`ARRAY[${Prisma.join(scope)}]::text[]`;
}

function metadataSql(metadata: unknown) {
  if (metadata === undefined || metadata === null) return Prisma.sql`NULL::jsonb`;
  return Prisma.sql`${JSON.stringify(metadata)}::jsonb`;
}

async function auditKnowledgeAction(input: {
  organisationId: string;
  actorId?: string | null;
  action: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      organisationId: input.organisationId,
      actorId: input.actorId ?? null,
      actorType: input.actorId ? "user" : "system",
      action: input.action,
      entityType: "business_knowledge_item",
      entityId: input.entityId,
      changes: input.changes,
    },
  });
}

export async function upsertKnowledgeSource(input: {
  organisationId: string;
  sourceType: KnowledgeSourceType | string;
  title?: string | null;
  sourceApp?: string | null;
  sourceRef: string;
  capturedAt?: Date | null;
  contentHash?: string | null;
  accessClassification?: string;
  metadata?: unknown;
}) {
  const existing = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM business_knowledge_sources
    WHERE organisation_id = ${input.organisationId}
      AND source_ref = ${input.sourceRef}
    LIMIT 1
  `);

  if (existing[0]) return existing[0].id;

  const id = randomUUID();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO business_knowledge_sources (
      id, organisation_id, source_type, title, source_app, source_ref,
      captured_at, content_hash, access_classification, metadata
    ) VALUES (
      ${id}, ${input.organisationId}, ${input.sourceType}, ${input.title ?? null},
      ${input.sourceApp ?? null}, ${input.sourceRef}, ${input.capturedAt ?? null},
      ${input.contentHash ?? null}, ${input.accessClassification ?? "internal"},
      ${metadataSql(input.metadata)}
    )
    ON CONFLICT DO NOTHING
  `);

  const resolved = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id
    FROM business_knowledge_sources
    WHERE organisation_id = ${input.organisationId}
      AND source_ref = ${input.sourceRef}
    LIMIT 1
  `);

  if (!resolved[0]) throw new Error("Knowledge source upsert did not resolve a source id");
  return resolved[0].id;
}

export async function proposeKnowledgeItem(input: {
  organisationId: string;
  knowledgeKey?: string | null;
  type: string;
  title: string;
  statement: string;
  confidence?: number | null;
  importance?: string;
  scope?: string[];
  sourceId?: string | null;
  sourceRef?: string | null;
  sourceExcerpt?: string | null;
  createdBy?: string | null;
  effectiveFrom?: Date | null;
  reviewAt?: Date | null;
  metadata?: unknown;
}): Promise<KnowledgeItem> {
  if (input.confidence != null && (input.confidence < 0 || input.confidence > 1)) {
    throw new Error("Knowledge confidence must be between 0 and 1");
  }

  if (input.sourceId) {
    const source = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM business_knowledge_sources
      WHERE id = ${input.sourceId} AND organisation_id = ${input.organisationId}
      LIMIT 1
    `);
    if (!source[0]) throw new Error("Knowledge source does not belong to organisation");
  }

  const id = randomUUID();
  const rows = await prisma.$queryRaw<KnowledgeRow[]>(Prisma.sql`
    INSERT INTO business_knowledge_items (
      id, organisation_id, knowledge_key, type, title, statement, status,
      confidence, importance, scope, source_id, source_ref, source_excerpt,
      created_by, effective_from, review_at, metadata
    ) VALUES (
      ${id}, ${input.organisationId}, ${input.knowledgeKey ?? null}, ${input.type},
      ${input.title}, ${input.statement}, 'proposed', ${input.confidence ?? null},
      ${input.importance ?? "medium"}, ${scopeSql(input.scope ?? [])},
      ${input.sourceId ?? null}, ${input.sourceRef ?? null}, ${input.sourceExcerpt ?? null},
      ${input.createdBy ?? null}, ${input.effectiveFrom ?? null}, ${input.reviewAt ?? null},
      ${metadataSql(input.metadata)}
    )
    RETURNING *
  `);

  await auditKnowledgeAction({
    organisationId: input.organisationId,
    actorId: input.createdBy,
    action: "knowledge.proposed",
    entityId: id,
  });

  return mapKnowledgeRow(rows[0]);
}

export async function listKnowledgeInbox(organisationId: string, limit = 100) {
  const safeLimit = Math.max(1, Math.min(limit, 250));
  const rows = await prisma.$queryRaw<KnowledgeRow[]>(Prisma.sql`
    SELECT *
    FROM business_knowledge_items
    WHERE organisation_id = ${organisationId}
      AND status = 'proposed'
    ORDER BY
      CASE importance WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC
    LIMIT ${safeLimit}
  `);
  return rows.map(mapKnowledgeRow);
}

/**
 * Default Business Brain retrieval: only human-approved, current knowledge.
 * Proposed, rejected, archived and superseded items are intentionally excluded.
 */
export async function listApprovedKnowledge(input: {
  organisationId: string;
  type?: string;
  scope?: string;
  limit?: number;
}) {
  const safeLimit = Math.max(1, Math.min(input.limit ?? 100, 500));
  const typeFilter = input.type
    ? Prisma.sql`AND type = ${input.type}`
    : Prisma.empty;
  const scopeFilter = input.scope
    ? Prisma.sql`AND ${input.scope} = ANY(scope)`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<KnowledgeRow[]>(Prisma.sql`
    SELECT *
    FROM business_knowledge_items
    WHERE organisation_id = ${input.organisationId}
      AND status = 'approved'
      ${typeFilter}
      ${scopeFilter}
    ORDER BY
      CASE importance WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      COALESCE(effective_from, approved_at, created_at) DESC
    LIMIT ${safeLimit}
  `);
  return rows.map(mapKnowledgeRow);
}

export async function approveKnowledgeItem(input: {
  organisationId: string;
  itemId: string;
  actorId: string;
}) {
  const rows = await prisma.$queryRaw<KnowledgeRow[]>(Prisma.sql`
    UPDATE business_knowledge_items
    SET status = 'approved', approved_by = ${input.actorId}, approved_at = NOW(), updated_at = NOW()
    WHERE id = ${input.itemId}
      AND organisation_id = ${input.organisationId}
      AND status = 'proposed'
    RETURNING *
  `);
  if (!rows[0]) throw new Error("Proposed knowledge item not found in organisation");

  await auditKnowledgeAction({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "knowledge.approved",
    entityId: input.itemId,
  });
  return mapKnowledgeRow(rows[0]);
}

export async function rejectKnowledgeItem(input: {
  organisationId: string;
  itemId: string;
  actorId: string;
  reason?: string;
}) {
  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE business_knowledge_items
    SET status = 'rejected', updated_at = NOW()
    WHERE id = ${input.itemId}
      AND organisation_id = ${input.organisationId}
      AND status = 'proposed'
  `);
  if (changed !== 1) throw new Error("Proposed knowledge item not found in organisation");
  await auditKnowledgeAction({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "knowledge.rejected",
    entityId: input.itemId,
    changes: input.reason ? { reason: input.reason } : undefined,
  });
}

export async function archiveKnowledgeItem(input: {
  organisationId: string;
  itemId: string;
  actorId: string;
  reason?: string;
}) {
  const changed = await prisma.$executeRaw(Prisma.sql`
    UPDATE business_knowledge_items
    SET status = 'archived', updated_at = NOW()
    WHERE id = ${input.itemId}
      AND organisation_id = ${input.organisationId}
      AND status IN ('approved', 'proposed')
  `);
  if (changed !== 1) throw new Error("Current knowledge item not found in organisation");
  await auditKnowledgeAction({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "knowledge.archived",
    entityId: input.itemId,
    changes: input.reason ? { reason: input.reason } : undefined,
  });
}

/** Explicitly replaces an approved item. Both rows must belong to the same organisation. */
export async function supersedeKnowledgeItem(input: {
  organisationId: string;
  existingItemId: string;
  replacementItemId: string;
  actorId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM business_knowledge_items
      WHERE id = ${input.existingItemId}
        AND organisation_id = ${input.organisationId}
        AND status = 'approved'
      FOR UPDATE
    `);
    const replacement = await tx.$queryRaw<Array<{ id: string; status: KnowledgeStatus }>>(Prisma.sql`
      SELECT id, status FROM business_knowledge_items
      WHERE id = ${input.replacementItemId}
        AND organisation_id = ${input.organisationId}
        AND status IN ('proposed', 'approved')
      FOR UPDATE
    `);
    if (!existing[0] || !replacement[0]) {
      throw new Error("Knowledge supersession requires two current items in the same organisation");
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE business_knowledge_items
      SET status = 'superseded', updated_at = NOW()
      WHERE id = ${input.existingItemId} AND organisation_id = ${input.organisationId}
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE business_knowledge_items
      SET status = 'approved', supersedes_id = ${input.existingItemId},
          approved_by = COALESCE(approved_by, ${input.actorId}),
          approved_at = COALESCE(approved_at, NOW()), updated_at = NOW()
      WHERE id = ${input.replacementItemId} AND organisation_id = ${input.organisationId}
    `);
    await tx.auditLog.create({
      data: {
        organisationId: input.organisationId,
        actorId: input.actorId,
        actorType: "user",
        action: "knowledge.superseded",
        entityType: "business_knowledge_item",
        entityId: input.existingItemId,
        changes: { replacementItemId: input.replacementItemId },
      },
    });
  });
}
