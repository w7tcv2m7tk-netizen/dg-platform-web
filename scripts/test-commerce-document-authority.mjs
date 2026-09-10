import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const quoteDetail = fs.readFileSync(
  "src/app/(shell)/apps/commerce/quotes/[id]/page.tsx",
  "utf8",
);
const invoiceDetail = fs.readFileSync(
  "src/app/(shell)/apps/commerce/invoices/[id]/page.tsx",
  "utf8",
);
const payments = fs.readFileSync(
  "src/app/(shell)/apps/commerce/payments/page.tsx",
  "utf8",
);
const reports = [
  "src/app/(shell)/apps/commerce/reports/profit-loss/page.tsx",
  "src/app/(shell)/apps/commerce/reports/gst/page.tsx",
  "src/app/(shell)/apps/commerce/reports/cash-flow/page.tsx",
  "src/app/(shell)/apps/commerce/reports/balance-sheet/page.tsx",
].map((file) => ({ file, source: fs.readFileSync(file, "utf8") }));

const quoteApi = fs.readFileSync(
  "src/app/api/v1/commerce/quotes/[id]/route.ts",
  "utf8",
);
const invoiceApi = fs.readFileSync(
  "src/app/api/v1/commerce/invoices/[id]/route.ts",
  "utf8",
);
const reportsApi = fs.readFileSync(
  "src/app/api/v1/commerce/reports/route.ts",
  "utf8",
);
const evaluate = fs.readFileSync(
  "packages/platform-core/src/access/evaluate.ts",
  "utf8",
);

function pageBody(source) {
  const start = source.indexOf("export default async function");
  assert.ok(start >= 0, "page must export a default async function");
  return source.slice(start);
}

test("commerce document pages require commerce.read before loading tenant data", () => {
  for (const [label, source] of [
    ["quote detail", quoteDetail],
    ["invoice detail", invoiceDetail],
    ["payments", payments],
    ...reports.map((r) => [r.file, r.source]),
  ]) {
    const body = pageBody(source);
    assert.match(
      body,
      /getAuthorisedPlatformPageSession\("commerce\.read"\)/,
      `${label} must require commerce.read`,
    );
    const authAt = body.indexOf('getAuthorisedPlatformPageSession("commerce.read")');
    const loadAt = body.search(
      /getQuote\(|getInvoice\(|listOrganisationPaymentRequests\(|getProfitAndLossReport\(|getGstReport\(|getCashFlowReport\(|getBalanceSheetReport\(/,
    );
    assert.ok(loadAt >= 0, `${label} must load commerce data`);
    assert.ok(authAt < loadAt, `${label} must resolve authority before loading commerce data`);
    assert.doesNotMatch(
      source,
      /resolveActivePlatformSession/,
      `${label} must not treat a signed-in session as commerce authorisation`,
    );
  }
});

test("quote and invoice mutations stay behind commerce.manage", () => {
  for (const [label, source] of [
    ["quote detail", quoteDetail],
    ["invoice detail", invoiceDetail],
  ]) {
    assert.match(
      source,
      /sessionHasFeature\(session, "commerce\.manage"\)/,
      `${label} must independently check commerce.manage`,
    );
    assert.match(
      source,
      /canManage \? \(/,
      `${label} must hide send/accept/void actions without manage authority`,
    );
  }

  assert.match(quoteApi, /requireFeature\(session, "commerce\.manage"\)/);
  assert.match(invoiceApi, /requireFeature\(session, "commerce\.manage"\)/);
});

test("CRM contact hydration on commerce documents requires crm.contacts.read", () => {
  for (const [label, source] of [
    ["quote detail", quoteDetail],
    ["invoice detail", invoiceDetail],
  ]) {
    assert.match(
      source,
      /sessionHasFeature\(session, "crm\.contacts\.read"\)/,
      `${label} must check CRM contact authority independently`,
    );
    assert.match(
      source,
      /canReadContacts && \w+\.contactId/,
      `${label} must not load a related contact without CRM authority`,
    );
  }
});

test("commerce APIs keep the same feature IDs as the pages", () => {
  assert.match(quoteApi, /requireFeature\(session, "commerce\.read"\)/);
  assert.match(invoiceApi, /requireFeature\(session, "commerce\.read"\)/);
  assert.match(reportsApi, /requireFeature\(session, "commerce\.read"\)/);
  const reportsHandler = reportsApi.slice(reportsApi.indexOf("export async function GET"));
  assert.ok(
    reportsHandler.indexOf('requireFeature(session, "commerce.read")') <
      reportsHandler.indexOf("getProfitAndLossReport("),
    "reports API must require commerce.read before running a report",
  );
});

test("commerce.read and commerce.manage map to the commerce module", () => {
  assert.match(evaluate, /commerce:\s*"commerce"/);
  assert.match(evaluate, /tail === "read" \|\| tail === "view"/);
  assert.match(evaluate, /tail === "manage" \|\| tail === "admin"/);
});
