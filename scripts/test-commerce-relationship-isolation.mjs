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
const quoteApi = fs.readFileSync("src/app/api/v1/commerce/quotes/route.ts", "utf8");
const invoiceApi = fs.readFileSync(
  "src/app/api/v1/commerce/invoices/route.ts",
  "utf8",
);
const types = fs.readFileSync("packages/platform-core/src/commerce/types.ts", "utf8");

const createQuoteFn = engine.slice(
  engine.indexOf("export async function createQuote"),
  engine.indexOf("export async function createInvoice"),
);
const createInvoiceFn = engine.slice(
  engine.indexOf("export async function createInvoice"),
  engine.indexOf("export async function acceptQuote"),
);
const acceptQuoteFn = engine.slice(engine.indexOf("export async function acceptQuote"));
const resolver = engine.slice(
  engine.indexOf("async function resolveCommerceRelationshipIds"),
  engine.indexOf("function serializeLineItems"),
);

test("named isolation errors distinguish foreign contact and quote IDs", () => {
  for (const relation of ["contact", "quote"]) {
    const error = new LinkedCommerceRecordNotFoundError(relation);
    assert.equal(error.code, `linked_${relation}_not_found`);
    assert.equal(error.relation, relation);
    assert.equal(isLinkedCommerceRecordNotFoundError(error), true);
  }
  assert.equal(isLinkedCommerceRecordNotFoundError(new Error("lineItems required")), false);
});

test("relationship lookups are organisation-scoped, not global ID existence", () => {
  assert.match(
    engine,
    /id: contactId, organisationId, deletedAt: null/,
    "contactId must use id + organisationId + deletedAt: null",
  );
  assert.match(
    engine,
    /id: quoteId, organisationId/,
    "quoteId must use id + organisationId",
  );
  assert.doesNotMatch(
    resolver,
    /findUnique\(\s*\{\s*where:\s*\{\s*id:/,
    "must not look up related records by global primary key",
  );
});

test("createQuote rejects foreign contactId and allows same-org contactId before write", () => {
  assert.match(createQuoteFn, /await resolveCommerceRelationshipIds\(input\.organisationId/);
  assert.match(createQuoteFn, /contactId: input\.contactId/);
  assert.ok(
    createQuoteFn.indexOf("resolveCommerceRelationshipIds") <
      createQuoteFn.indexOf("prisma.commerceQuote.create"),
    "createQuote must validate contactId before inserting the quote",
  );
  assert.match(createQuoteFn, /contactId: links\.contactId \?\? null/);
  assert.match(
    resolver,
    /if \(contactId\) \{\s*await assertCommerceContactInOrganisation/,
    "same-organisation contact IDs stay writable after the org-scoped lookup",
  );
});

test("createInvoice rejects foreign contactId/quoteId and allows same-org IDs before write", () => {
  assert.match(createInvoiceFn, /await resolveCommerceRelationshipIds\(input\.organisationId/);
  assert.match(createInvoiceFn, /contactId: input\.contactId/);
  assert.match(createInvoiceFn, /quoteId: input\.quoteId/);
  assert.ok(
    createInvoiceFn.indexOf("resolveCommerceRelationshipIds") <
      createInvoiceFn.indexOf("prisma.commerceInvoice.create"),
    "createInvoice must validate relationships before inserting the invoice",
  );
  assert.match(createInvoiceFn, /contactId: links\.contactId \?\? null/);
  assert.match(createInvoiceFn, /quoteId: links\.quoteId \?\? null/);
  assert.match(
    resolver,
    /if \(quoteId\) \{\s*await assertCommerceQuoteInOrganisation/,
    "same-organisation quote IDs stay writable after the org-scoped lookup",
  );
});

test("omitted and null optional relationships stay optional", () => {
  assert.match(engine, /function normalizeOptionalRelationId/);
  assert.match(types, /export interface CreateQuoteInput[\s\S]*contactId\?: string \| null/);
  assert.match(
    types,
    /export interface CreateInvoiceInput[\s\S]*contactId\?: string \| null[\s\S]*quoteId\?: string \| null/,
  );
  assert.match(createQuoteFn, /contactId: links\.contactId \?\? null/);
  assert.match(createInvoiceFn, /quoteId: links\.quoteId \?\? null/);
});

test("quote and invoice POST APIs map named isolation errors to 422", () => {
  const postQuote = quoteApi.slice(quoteApi.indexOf("export async function POST"));
  assert.match(postQuote, /isLinkedCommerceRecordNotFoundError\(error\)/);
  assert.match(postQuote, /status: 422/);
  assert.ok(postQuote.indexOf("createQuote(") < postQuote.indexOf("isLinkedCommerceRecordNotFoundError"));

  const postInvoice = invoiceApi.slice(invoiceApi.indexOf("export async function POST"));
  assert.match(postInvoice, /isLinkedCommerceRecordNotFoundError\(error\)/);
  assert.match(postInvoice, /status: 422/);
  assert.ok(
    postInvoice.indexOf("createInvoice(") <
      postInvoice.indexOf("isLinkedCommerceRecordNotFoundError"),
  );
});

test("acceptQuote still resolves the source quote with organisation scope and is otherwise unchanged", () => {
  assert.match(acceptQuoteFn, /where: \{ id: quoteId, organisationId \}/);
  assert.doesNotMatch(
    acceptQuoteFn.slice(0, acceptQuoteFn.indexOf("const invoice = await createInvoice")),
    /resolveCommerceRelationshipIds/,
    "acceptQuote must not grow a second isolation path; it already scopes the quote",
  );
});
