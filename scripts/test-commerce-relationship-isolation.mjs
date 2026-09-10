import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  LinkedCommerceRecordNotFoundError,
  isLinkedCommerceRecordNotFoundError,
} from "../packages/platform-core/src/commerce/document-engine.ts";

const engine = fs.readFileSync(
  "packages/platform-core/src/commerce/document-engine.ts",
  "utf8",
);
const quoteApi = fs.readFileSync(
  "src/app/api/v1/commerce/quotes/route.ts",
  "utf8",
);
const invoiceApi = fs.readFileSync(
  "src/app/api/v1/commerce/invoices/route.ts",
  "utf8",
);

const resolver = engine.slice(
  engine.indexOf("async function resolveCommerceRelationshipIds"),
  engine.indexOf("function serializeLineItems"),
);
const createQuoteFn = engine.slice(
  engine.indexOf("export async function createQuote"),
  engine.indexOf("export async function createInvoice"),
);
const createInvoiceFn = engine.slice(
  engine.indexOf("export async function createInvoice"),
  engine.indexOf("export async function acceptQuote"),
);

test("named isolation errors distinguish foreign contact and quote IDs", () => {
  for (const relation of ["contact", "quote"]) {
    const error = new LinkedCommerceRecordNotFoundError(relation);
    assert.equal(error.code, `linked_${relation}_not_found`);
    assert.equal(error.relation, relation);
    assert.equal(isLinkedCommerceRecordNotFoundError(error), true);
  }
  assert.equal(isLinkedCommerceRecordNotFoundError(new Error("invalid")), false);
});

test("Commerce relationship lookups are organisation-scoped", () => {
  assert.match(
    resolver,
    /where: \{ id: contactId, organisationId, deletedAt: null \}/,
    "contact must be active and belong to the organisation",
  );
  assert.match(
    resolver,
    /where: \{ id: quoteId, organisationId \}/,
    "quote must belong to the organisation",
  );
  assert.doesNotMatch(
    resolver,
    /findUnique\(\s*\{\s*where:\s*\{\s*id:/,
    "related records must not be resolved by global ID alone",
  );
});

test("createQuote validates contact before inserting the quote", () => {
  assert.match(createQuoteFn, /await resolveCommerceRelationshipIds\(input\.organisationId/);
  assert.match(createQuoteFn, /contactId: input\.contactId/);
  assert.ok(
    createQuoteFn.indexOf("resolveCommerceRelationshipIds") <
      createQuoteFn.indexOf("prisma.commerceQuote.create"),
    "contact validation must happen before quote write",
  );
  assert.match(createQuoteFn, /contactId: links\.contactId/);
  assert.doesNotMatch(createQuoteFn, /contactId: input\.contactId,/);
});

test("createInvoice validates contact and quote before inserting the invoice", () => {
  assert.match(createInvoiceFn, /await resolveCommerceRelationshipIds\(input\.organisationId/);
  assert.match(createInvoiceFn, /contactId: input\.contactId/);
  assert.match(createInvoiceFn, /quoteId: input\.quoteId/);
  assert.ok(
    createInvoiceFn.indexOf("resolveCommerceRelationshipIds") <
      createInvoiceFn.indexOf("prisma.commerceInvoice.create"),
    "relationship validation must happen before invoice write",
  );
  assert.match(createInvoiceFn, /contactId: links\.contactId/);
  assert.match(createInvoiceFn, /quoteId: links\.quoteId/);
  assert.doesNotMatch(createInvoiceFn, /contactId: input\.contactId,/);
  assert.doesNotMatch(createInvoiceFn, /quoteId: input\.quoteId,/);
});

test("omitted, null, and empty relationship IDs remain unlinked", () => {
  assert.match(engine, /function normalizeOptionalRelationId/);
  assert.match(
    engine,
    /value === null \|\| value === undefined \|\| value\.trim\(\) === ""/,
  );
  assert.match(resolver, /return \{ contactId, quoteId \}/);
});

test("quote and invoice POST APIs map isolation failures to 422", () => {
  for (const api of [quoteApi, invoiceApi]) {
    const post = api.slice(api.indexOf("export async function POST"));
    assert.match(post, /isLinkedCommerceRecordNotFoundError\(error\)/);
    assert.match(post, /status: 422/);
    assert.match(post, /code: error\.code, message: error\.message/);
  }
});
