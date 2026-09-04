#!/usr/bin/env node

/**
 * Import governed Business Brain knowledge seeds as PROPOSED items.
 *
 * Safety properties:
 * - requires an explicit target organisation id
 * - verifies the organisation exists
 * - never auto-approves knowledge
 * - never overwrites an existing knowledge_key
 * - source records are de-duplicated per organisation/source_ref
 * - all inserts are parameterised
 *
 * Usage:
 *   DG_KNOWLEDGE_ORG_ID=<org-id> DATABASE_URL=... node scripts/import-business-brain-knowledge.mjs
 *
 * Add --dry-run to inspect what would be created without writes.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = process.env.DG_KNOWLEDGE_SEED_PATH
  ? path.resolve(process.env.DG_KNOWLEDGE_SEED_PATH)
  : path.join(__dirname, "../docs/business-brain/digitalgate-knowledge-seed.json");
const organisationId = process.env.DG_KNOWLEDGE_ORG_ID?.trim();
const dryRun = process.argv.includes("--dry-run");

function scopeSql(scope) {
  if (!Array.isArray(scope) || scope.length === 0) return Prisma.sql`ARRAY[]::text[]`;
  return Prisma.sql`ARRAY[${Prisma.join(scope)}]::text[]`;
}

async function main() {
  if (!organisationId) {
    throw new Error("DG_KNOWLEDGE_ORG_ID is required; refusing an unscoped import");
  }

  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { id: true, name: true, slug: true },
  });
  if (!organisation) throw new Error(`Organisation not found: ${organisationId}`);

  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  if (!Array.isArray(seed.items)) throw new Error("Knowledge seed must contain an items array");
  if (seed.defaultStatus && seed.defaultStatus !== "proposed") {
    throw new Error("Seed defaultStatus must be proposed; automatic approval is forbidden");
  }

  const sourceRefs = new Map();
  for (const item of seed.items) {
    if (!item.key || !item.type || !item.title || !item.statement) {
      throw new Error("Every seed item requires key, type, title and statement");
    }
    const ref = item.sourceRef ?? "seed:unknown";
    if (!sourceRefs.has(ref)) sourceRefs.set(ref, item.sourceType ?? "legacy_import");
  }

  const existingRows = await prisma.$queryRaw(Prisma.sql`
    SELECT knowledge_key
    FROM business_knowledge_items
    WHERE organisation_id = ${organisationId}
      AND knowledge_key IS NOT NULL
  `);
  const existingKeys = new Set(existingRows.map((row) => row.knowledge_key));
  const pending = seed.items.filter((item) => !existingKeys.has(item.key));

  console.log(JSON.stringify({
    organisation,
    seed: path.relative(process.cwd(), seedPath),
    totalSeedItems: seed.items.length,
    existing: seed.items.length - pending.length,
    toCreate: pending.length,
    dryRun,
  }, null, 2));

  if (dryRun || pending.length === 0) return;

  const sourceIds = new Map();
  for (const [sourceRef, sourceType] of sourceRefs) {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT id
      FROM business_knowledge_sources
      WHERE organisation_id = ${organisationId}
        AND source_ref = ${sourceRef}
      LIMIT 1
    `);
    if (rows[0]) {
      sourceIds.set(sourceRef, rows[0].id);
      continue;
    }

    const id = crypto.randomUUID();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO business_knowledge_sources (
        id, organisation_id, source_type, title, source_app, source_ref,
        access_classification, metadata
      ) VALUES (
        ${id}, ${organisationId}, ${sourceType},
        ${`DigitalGate knowledge source — ${sourceRef}`}, 'chatgpt-project', ${sourceRef},
        'internal', ${JSON.stringify({ importedFrom: path.basename(seedPath) })}::jsonb
      )
      ON CONFLICT DO NOTHING
    `);

    const resolved = await prisma.$queryRaw(Prisma.sql`
      SELECT id FROM business_knowledge_sources
      WHERE organisation_id = ${organisationId} AND source_ref = ${sourceRef}
      LIMIT 1
    `);
    if (!resolved[0]) throw new Error(`Could not resolve knowledge source ${sourceRef}`);
    sourceIds.set(sourceRef, resolved[0].id);
  }

  let created = 0;
  for (const item of pending) {
    const sourceRef = item.sourceRef ?? "seed:unknown";
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO business_knowledge_items (
        id, organisation_id, knowledge_key, type, title, statement, status,
        confidence, importance, scope, source_id, source_ref, created_by, metadata
      ) VALUES (
        ${crypto.randomUUID()}, ${organisationId}, ${item.key}, ${item.type},
        ${item.title}, ${item.statement}, 'proposed', ${item.confidence ?? null},
        ${item.importance ?? "medium"}, ${scopeSql(item.scope)},
        ${sourceIds.get(sourceRef) ?? null}, ${sourceRef}, 'historical-backfill',
        ${JSON.stringify({ seedSchemaVersion: seed.schemaVersion ?? null })}::jsonb
      )
      ON CONFLICT DO NOTHING
    `);
    created += 1;
  }

  await prisma.auditLog.create({
    data: {
      organisationId,
      actorType: "system",
      action: "knowledge.backfill_imported",
      entityType: "organisation",
      entityId: organisationId,
      changes: {
        seed: path.basename(seedPath),
        requested: pending.length,
        created,
        status: "proposed",
      },
    },
  });

  const counts = await prisma.$queryRaw(Prisma.sql`
    SELECT status, COUNT(*)::int AS count
    FROM business_knowledge_items
    WHERE organisation_id = ${organisationId}
    GROUP BY status
    ORDER BY status
  `);
  console.log(JSON.stringify({ imported: created, counts }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
