import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const overview = read("src/app/(shell)/apps/finance/page.tsx");
const pipeline = read("src/app/(shell)/apps/finance/pipeline/page.tsx");
const applications = read("src/app/(shell)/apps/finance/applications/page.tsx");
const clients = read("src/app/(shell)/apps/finance/clients/page.tsx");
const createForm = read("src/components/finance/CreateFinanceApplicationForm.tsx");
const stageForm = read("src/components/finance/UpdateFinanceApplicationStageForm.tsx");
const route = read("src/app/api/v1/finance/applications/route.ts");
const betaLayout = read("src/components/industry/IndustryBetaAppLayout.tsx");
const pageAccess = read("src/lib/finance-page-access.ts");
const money = read("src/lib/organisation-money.ts");

const customerPages = [overview, pipeline, applications, clients];

test("Finance customer pages use the native shared platform context", () => {
  for (const source of customerPages) {
    assert.match(source, /getPlatformPageContext/);
    assert.doesNotMatch(source, /currentUser/);
    assert.doesNotMatch(source, /resolveActivePlatformSession/);
    assert.doesNotMatch(source, /fetchPortalMe/);
  }
});

test("shared Industry beta layout has no legacy profile read", () => {
  assert.match(betaLayout, /getPlatformPageContext/);
  assert.doesNotMatch(betaLayout, /fetchPortalMe/);
  assert.doesNotMatch(betaLayout, /resolveActivePlatformSession/);
  assert.match(betaLayout, /min-h-11/);
});

test("Finance writes require organisation-scope Industry edit authority", () => {
  assert.match(route, /requirePermission/);
  assert.match(route, /module: "industry"/);
  assert.match(route, /action: "edit"/);
  assert.match(route, /scope: "organisation"/);
  assert.match(route, /subModule: "finance"/);
});

test("Finance page mutation controls use the same locked permission model", () => {
  assert.match(pageAccess, /buildAccessContext/);
  assert.match(pageAccess, /hasPermission/);
  assert.match(pageAccess, /scope: "organisation"/);
  assert.match(pageAccess, /subModule: "finance"/);
  assert.match(applications, /canManageFinance/);
  assert.match(pipeline, /canManageFinance/);
  assert.match(applications, /Read-only access/);
  assert.match(pipeline, /Read-only pipeline/);
});

test("Finance money presentation follows organisation locale and currency", () => {
  assert.match(money, /select: \{ currency: true, locale: true \}/);
  assert.match(money, /Intl\.NumberFormat\(settings\.locale/);
  assert.match(overview, /formatMoneyFromCents/);
  assert.match(pipeline, /formatMoneyFromCents/);
  assert.match(applications, /formatMoneyFromCents/);
  assert.match(createForm, /Loan amount \(\$\{currency\}\)/);
  assert.doesNotMatch(createForm, /Loan amount \(AUD\)/);
});

test("Finance interactive controls meet the native touch-target floor", () => {
  assert.match(createForm, /min-h-11/);
  assert.match(stageForm, /min-h-11/);
  assert.match(overview, /min-h-11/);
  assert.match(pipeline, /min-h-11/);
  assert.match(clients, /min-h-11/);
});
