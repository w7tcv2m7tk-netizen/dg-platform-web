import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

async function text(rel) {
  return readFile(path.join(root, rel), "utf8");
}

async function json(rel) {
  return JSON.parse(await text(rel));
}

describe("Business Brain governed knowledge contract", () => {
  it("keeps normal Brain retrieval approved-only and organisation-scoped", async () => {
    const source = await text("packages/platform-core/src/knowledge/index.ts");
    const retrieval = source.slice(source.indexOf("export async function listApprovedKnowledge"));
    assert.match(retrieval, /organisation_id = \$\{input\.organisationId\}/);
    assert.match(retrieval, /status = 'approved'/);
    assert.doesNotMatch(retrieval.split("export async function approveKnowledgeItem")[0], /status IN \('approved', 'proposed'\)/);
  });

  it("creates extracted knowledge as proposed, never auto-approved", async () => {
    const source = await text("packages/platform-core/src/knowledge/index.ts");
    const propose = source.slice(
      source.indexOf("export async function proposeKnowledgeItem"),
      source.indexOf("export async function listKnowledgeInbox"),
    );
    assert.match(propose, /'proposed'/);
    assert.doesNotMatch(propose, /'approved'/);
  });

  it("requires same-organisation records for explicit supersession", async () => {
    const source = await text("packages/platform-core/src/knowledge/index.ts");
    const supersede = source.slice(source.indexOf("export async function supersedeKnowledgeItem"));
    const organisationGuards = supersede.match(/organisation_id = \$\{input\.organisationId\}/g) ?? [];
    assert.ok(organisationGuards.length >= 4, "supersession must keep every read/write tenant-scoped");
    assert.match(supersede, /status = 'superseded'/);
    assert.match(supersede, /supersedes_id/);
  });

  it("requires an explicit organisation for imports and forbids automatic approval", async () => {
    const importer = await text("scripts/import-business-brain-knowledge.mjs");
    assert.match(importer, /DG_KNOWLEDGE_ORG_ID is required/);
    assert.match(importer, /automatic approval is forbidden/);
    assert.match(importer, /'proposed'/);
    assert.match(importer, /ON CONFLICT DO NOTHING/);
  });

  it("maps the production knowledge schema into the generated Prisma client", async () => {
    const models = await text("packages/database/prisma/models/business-brain.prisma");
    assert.match(models, /model BusinessKnowledgeSource/);
    assert.match(models, /model BusinessKnowledgeItem/);
    assert.match(models, /model BusinessKnowledgeLink/);
    assert.match(models, /@@map\("business_knowledge_sources"\)/);
    assert.match(models, /@@map\("business_knowledge_items"\)/);
    assert.match(models, /@@map\("business_knowledge_links"\)/);

    const pkg = await json("package.json");
    assert.match(pkg.scripts["db:generate"], /--schema=packages\/database\/prisma$/);
    assert.match(pkg.scripts["db:push"], /--schema=packages\/database\/prisma$/);
    assert.match(pkg.scripts["db:studio"], /--schema=packages\/database\/prisma$/);
  });

  for (const seedPath of [
    "docs/business-brain/digitalgate-knowledge-seed.json",
    "docs/business-brain/digitalgate-historical-context-seed.json",
  ]) {
    it(`${seedPath} is review-only and has unique durable keys`, async () => {
      const seed = await json(seedPath);
      assert.equal(seed.defaultStatus, "proposed");
      assert.ok(seed.limitations);
      assert.ok(Array.isArray(seed.items) && seed.items.length > 0);
      const keys = seed.items.map((item) => item.key);
      assert.equal(new Set(keys).size, keys.length, "knowledge keys must be unique inside a seed");
      for (const item of seed.items) {
        assert.ok(item.key && item.type && item.title && item.statement);
        assert.ok(Array.isArray(item.scope));
        assert.ok(item.sourceRef);
      }
    });
  }

  it("documents lifecycle, provenance and the Documents boundary", async () => {
    const docs = await text("docs/foundations/BUSINESS-BRAIN-KNOWLEDGE.md");
    assert.match(docs, /PROPOSED → APPROVED → SUPERSEDED → ARCHIVED/);
    assert.match(docs, /org_documents/);
    assert.match(docs, /provenance/i);
    assert.match(docs, /tenant isolation/i);
  });
});
