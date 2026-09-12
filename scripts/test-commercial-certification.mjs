import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const overview = read("src/app/(shell)/apps/commercial/page.tsx");
const properties = read("src/app/(shell)/apps/commercial/properties/page.tsx");
const leases = read("src/app/(shell)/apps/commercial/leases/page.tsx");
const tenants = read("src/app/(shell)/apps/commercial/tenants/page.tsx");
const route = read("src/app/api/v1/commercial/route.ts");
const access = read("src/lib/commercial-page-access.ts");
const propertyForm = read("src/components/commercial/CreateCommercialPropertyForm.tsx");
const leaseForm = read("src/components/commercial/CreateCommercialLeaseForm.tsx");
const money = read("src/lib/organisation-money.ts");

const customerPages = [overview, properties, leases, tenants];

test("Commercial customer pages use native shared platform context", () => {
  for (const source of customerPages) {
    assert.match(source, /getPlatformPageContext/);
    assert.doesNotMatch(source, /currentUser/);
    assert.doesNotMatch(source, /resolveActivePlatformSession/);
    assert.doesNotMatch(source, /fetchPortalMe/);
  }
});

test("Commercial writes require organisation-scope Industry edit authority", () => {
  assert.match(route, /requirePermission/);
  assert.match(route, /module: "industry"/);
  assert.match(route, /action: "edit"/);
  assert.match(route, /scope: "organisation"/);
  assert.match(route, /subModule: "commercial"/);
});

test("Commercial page mutation controls use the same locked authority", () => {
  assert.match(access, /buildAccessContext/);
  assert.match(access, /hasPermission/);
  assert.match(access, /scope: "organisation"/);
  assert.match(access, /subModule: "commercial"/);
  assert.match(properties, /canManageCommercial/);
  assert.match(leases, /canManageCommercial/);
  assert.match(overview, /canManageCommercial/);
  assert.match(properties, /Read-only register/);
  assert.match(leases, /Read-only leases/);
});

test("Commercial rent presentation follows organisation locale and currency", () => {
  assert.match(money, /select: \{ currency: true, locale: true \}/);
  assert.match(leases, /getOrganisationMoneySettings/);
  assert.match(leases, /formatMoneyFromCents/);
  assert.match(leaseForm, /Annual rent \(\$\{currency\}\)/);
  assert.doesNotMatch(leaseForm, /Annual rent \(AUD\)/);
  assert.doesNotMatch(leases, /\$\$\{/);
});

test("Commercial create controls meet native touch-target floor", () => {
  assert.match(propertyForm, /min-h-11/);
  assert.match(leaseForm, /min-h-11/);
  assert.match(overview, /min-h-11/);
  assert.match(tenants, /min-h-11/);
});
