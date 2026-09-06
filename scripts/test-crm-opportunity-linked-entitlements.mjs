import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const collectionRoute = fs.readFileSync("src/app/api/v1/opportunities/route.ts", "utf8");
const detailRoute = fs.readFileSync("src/app/api/v1/opportunities/[id]/route.ts", "utf8");

test("opportunity lead conversion requires linked-object entitlements", () => {
  assert.match(collectionRoute, /crm\.opportunities\.write/);
  assert.match(collectionRoute, /crm\.leads\.read/);
  assert.match(collectionRoute, /crm\.leads\.write/);
  assert.match(collectionRoute, /crm\.contacts\.write/);
});

test("direct opportunity links are tenant-validated before creation", () => {
  assert.match(collectionRoute, /requireFeature\(session, "crm\.contacts\.read"\)/);
  assert.match(collectionRoute, /getContact\(session\.organisationId, contactId\)/);
  assert.match(collectionRoute, /linked_contact_not_found/);
  assert.match(collectionRoute, /requireFeature\(session, "crm\.companies\.read"\)/);
  assert.match(collectionRoute, /getCompany\(session\.organisationId, companyId\)/);
  assert.match(collectionRoute, /linked_company_not_found/);
});

test("pipeline filtering is passed through to the tenant-scoped opportunity query", () => {
  assert.match(collectionRoute, /searchParams\.get\("pipelineId"\)/);
  assert.match(collectionRoute, /pipelineId,/);
});

test("deleting an opportunity cannot delete its linked lead without lead write authority", () => {
  assert.match(detailRoute, /getOpportunity\(session\.organisationId, id\)/);
  assert.match(detailRoute, /if \(existing\.leadId\)/);
  assert.match(detailRoute, /requireFeature\(session, "crm\.leads\.write"\)/);
  assert.ok(
    detailRoute.indexOf('requireFeature(session, "crm.leads.write")') <
      detailRoute.indexOf("deleteOpportunity({"),
  );
});
