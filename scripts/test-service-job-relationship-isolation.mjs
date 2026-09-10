import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  LinkedJobRecordNotFoundError,
  isLinkedJobRecordNotFoundError,
} from "../packages/platform-core/src/services/jobs.ts";

const jobs = fs.readFileSync("packages/platform-core/src/services/jobs.ts", "utf8");
const createApi = fs.readFileSync("src/app/api/v1/services/jobs/route.ts", "utf8");
const updateApi = fs.readFileSync(
  "src/app/api/v1/services/jobs/[id]/route.ts",
  "utf8",
);

const createFn = jobs.slice(
  jobs.indexOf("export async function createServiceJob"),
  jobs.indexOf("export async function updateServiceJob"),
);
const updateFn = jobs.slice(jobs.indexOf("export async function updateServiceJob"));
const resolver = jobs.slice(
  jobs.indexOf("async function resolveJobRelationshipIds"),
  jobs.indexOf("/** Stages before a job is on the calendar"),
);

test("named isolation errors distinguish foreign contact, lead, and quote IDs", () => {
  for (const relation of ["contact", "lead", "quote"]) {
    const error = new LinkedJobRecordNotFoundError(relation);
    assert.equal(error.code, `linked_${relation}_not_found`);
    assert.equal(error.relation, relation);
    assert.equal(isLinkedJobRecordNotFoundError(error), true);
  }
  assert.equal(isLinkedJobRecordNotFoundError(new Error("title is required")), false);
});

test("relationship lookups are organisation-scoped, not global ID existence", () => {
  assert.match(
    jobs,
    /id: contactId, organisationId, deletedAt: null/,
    "contactId must use id + organisationId + deletedAt: null",
  );
  assert.match(
    jobs,
    /id: leadId, organisationId/,
    "leadId must use id + organisationId",
  );
  assert.match(
    jobs,
    /id: quoteId, organisationId/,
    "quoteId must use id + organisationId",
  );
  assert.doesNotMatch(
    resolver,
    /findUnique\(\s*\{\s*where:\s*\{\s*id:/,
    "must not look up related records by global primary key",
  );
});

test("createServiceJob validates contact, lead, and quote before write", () => {
  assert.match(createFn, /await resolveJobRelationshipIds\(input\.organisationId/);
  assert.match(createFn, /contactId: input\.contactId/);
  assert.match(createFn, /leadId: input\.leadId/);
  assert.match(createFn, /quoteId: input\.quoteId/);
  assert.ok(
    createFn.indexOf("resolveJobRelationshipIds") <
      createFn.indexOf("prisma.serviceJob.create"),
    "create path must validate relationships before inserting the job",
  );
  assert.match(createFn, /contactId: links\.contactId \?\? null/);
  assert.match(createFn, /leadId: links\.leadId \?\? null/);
  assert.match(createFn, /quoteId: links\.quoteId \?\? null/);
});

test("updateServiceJob validates contact, lead, and quote before write", () => {
  assert.match(updateFn, /await resolveJobRelationshipIds\(input\.organisationId/);
  assert.match(updateFn, /contactId: input\.contactId/);
  assert.match(updateFn, /leadId: input\.leadId/);
  assert.match(updateFn, /quoteId: input\.quoteId/);
  assert.ok(
    updateFn.indexOf("resolveJobRelationshipIds") <
      updateFn.indexOf("prisma.serviceJob.update"),
    "update path must validate relationships before writing the job",
  );
  assert.doesNotMatch(
    updateFn,
    /connect: \{ id: input\.contactId \}/,
    "update must not Prisma-connect a raw client-supplied contactId",
  );
  assert.match(updateFn, /connect: \{ id: links\.contactId \}/);
  assert.match(updateFn, /disconnect: true/);
  assert.match(updateFn, /data\.leadId = links\.leadId/);
  assert.match(updateFn, /data\.quoteId = links\.quoteId/);
});

test("same-organisation IDs stay writable after they pass the org-scoped lookup", () => {
  assert.match(
    resolver,
    /if \(contactId\) \{\s*await assertJobContactInOrganisation/,
  );
  assert.match(
    resolver,
    /if \(leadId\) \{\s*await assertJobLeadInOrganisation/,
  );
  assert.match(
    resolver,
    /if \(quoteId\) \{\s*await assertJobQuoteInOrganisation/,
  );
  assert.match(resolver, /return \{ contactId, leadId, quoteId \}/);
  assert.match(
    jobs,
    /function normalizeOptionalRelationId/,
    "null / empty values remain disconnects, not isolation errors",
  );
});

test("job APIs map named isolation errors to 422", () => {
  const post = createApi.slice(createApi.indexOf("export async function POST"));
  assert.match(post, /isLinkedJobRecordNotFoundError\(error\)/);
  assert.match(post, /status: 422/);
  assert.ok(post.indexOf("createServiceJob(") < post.indexOf("isLinkedJobRecordNotFoundError"));
  assert.match(post, /quoteId: typeof body\.quoteId === "string" \? body\.quoteId/);

  const patch = updateApi.slice(updateApi.indexOf("export async function PATCH"));
  assert.match(patch, /isLinkedJobRecordNotFoundError\(error\)/);
  assert.match(patch, /status: 422/);
  assert.ok(patch.indexOf("updateServiceJob(") < patch.indexOf("isLinkedJobRecordNotFoundError"));
  assert.match(patch, /leadId:\s*\n\s*typeof body\.leadId === "string"/);
  assert.match(patch, /quoteId:\s*\n\s*typeof body\.quoteId === "string"/);
  assert.match(patch, /body\.quoteId === null\s*\n\s*\? null/);
});
