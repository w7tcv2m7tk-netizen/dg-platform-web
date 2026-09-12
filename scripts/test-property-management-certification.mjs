import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const overview = read("src/app/(shell)/apps/property-management/page.tsx");
const propertiesPage = read("src/app/(shell)/apps/property-management/properties/page.tsx");
const leasesPage = read("src/app/(shell)/apps/property-management/leases/page.tsx");
const maintenancePage = read("src/app/(shell)/apps/property-management/maintenance/page.tsx");
const ownersPage = read("src/app/(shell)/apps/property-management/owners/page.tsx");
const tenantsPage = read("src/app/(shell)/apps/property-management/tenants/page.tsx");
const propertiesApi = read("src/app/api/v1/property-management/properties/route.ts");
const leasesApi = read("src/app/api/v1/property-management/leases/route.ts");
const maintenanceApi = read("src/app/api/v1/property-management/maintenance/route.ts");
const leaseForm = read("src/components/property-management/CreatePmLeaseForm.tsx");
const propertyForm = read("src/components/property-management/CreatePmPropertyForm.tsx");
const maintenanceForm = read("src/components/property-management/CreatePmMaintenanceForm.tsx");
const access = read("src/lib/property-management-page-access.ts");

test("Property Management customer pages use native shared platform context", () => {
  for (const source of [overview, propertiesPage, leasesPage, maintenancePage, ownersPage, tenantsPage]) {
    assert.match(source, /getPlatformPageContext/);
    assert.doesNotMatch(source, /currentUser/);
    assert.doesNotMatch(source, /resolveActivePlatformSession/);
  }
});

test("Property Management writes require organisation-scope Industry edit authority", () => {
  for (const source of [propertiesApi, leasesApi, maintenanceApi]) {
    assert.match(source, /requirePermission/);
    assert.match(source, /module:\s*"industry"/);
    assert.match(source, /action:\s*"edit"/);
    assert.match(source, /scope:\s*"organisation"/);
    assert.match(source, /subModule:\s*"property-management"/);
  }
  assert.ok((maintenanceApi.match(/requirePermission/g) ?? []).length >= 2);
});

test("Property Management page mutation controls use the locked authority model", () => {
  assert.match(access, /canManagePropertyManagement/);
  assert.match(access, /scope:\s*"organisation"/);
  assert.match(access, /subModule:\s*"property-management"/);
  assert.match(propertiesPage, /canManagePropertyManagement/);
  assert.match(leasesPage, /canManagePropertyManagement/);
  assert.match(maintenancePage, /canManagePropertyManagement/);
});

test("Property Management rent presentation follows organisation locale and currency", () => {
  assert.match(leasesPage, /getOrganisationMoneySettings/);
  assert.match(leasesPage, /formatMoneyFromCents/);
  assert.match(leasesPage, /currency=\{money\.currency\}/);
  assert.match(leaseForm, /Weekly rent \(\$\{currency\}\)/);
  assert.doesNotMatch(leasesPage, /toLocaleString\("en-AU"\)/);
  assert.doesNotMatch(leaseForm, /Weekly rent \(AUD\)/);
});

test("Property Management create controls meet the native touch-target floor", () => {
  for (const source of [leaseForm, propertyForm, maintenanceForm]) {
    assert.match(source, /min-h-11/);
  }
  assert.match(overview, /min-h-11/);
  assert.match(ownersPage, /min-h-11/);
  assert.match(tenantsPage, /min-h-11/);
});
