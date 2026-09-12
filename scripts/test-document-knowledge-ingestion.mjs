import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ingestion = await readFile(
  new URL("../packages/platform-core/src/documents-signing/knowledge-ingestion.ts", import.meta.url),
  "utf8",
);
const route = await readFile(
  new URL("../src/app/api/v1/documents/[id]/knowledge/route.ts", import.meta.url),
  "utf8",
);
const detail = await readFile(
  new URL("../src/app/(shell)/apps/documents/library/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("document ingestion is organisation scoped and versioned", () => {
  assert.match(ingestion, /getOrgDocument\(input\.organisationId, input\.documentId\)/);
  assert.match(ingestion, /document:\$\{document\.id\}:v\$\{document\.version\}/);
  assert.match(ingestion, /orgOwnedAssetUrl\(url, document\.organisationId\)/);
});

test("document ingestion creates proposed knowledge with provenance", () => {
  assert.match(ingestion, /upsertKnowledgeSource\(/);
  assert.match(ingestion, /sourceType: "document"/);
  assert.match(ingestion, /contentHash/);
  assert.match(ingestion, /proposeKnowledgeItem\(/);
  assert.match(ingestion, /approvalRequired: true/);
  assert.doesNotMatch(ingestion, /approveKnowledgeItem\(/);
});

test("unsupported scans fail instead of inventing knowledge", () => {
  assert.match(ingestion, /OCR/);
  assert.match(ingestion, /no_extractable_text/);
  assert.match(ingestion, /no knowledge was proposed/i);
});

test("API uses platform authority and Documents entitlement", () => {
  assert.match(route, /requirePlatformAuth\(req\)/);
  assert.match(route, /requireFeature\(session, "documents\.write"\)/);
  assert.match(route, /organisationId: session\.organisationId/);
});

test("document detail tells users approval is required", () => {
  assert.match(detail, /DocumentKnowledgeIngestion/);
});
