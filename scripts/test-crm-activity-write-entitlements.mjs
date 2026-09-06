import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/activities/route.ts", "utf8");

test("Activity writes require the authority for the target CRM object", () => {
  assert.match(route, /entityType === "Contact"/);
  assert.match(route, /crm\.contacts\.write/);
  assert.match(route, /getContact\(session\.organisationId, entityId\)/);

  assert.match(route, /entityType === "Company"/);
  assert.match(route, /crm\.companies\.write/);
  assert.match(route, /getCompany\(session\.organisationId, entityId\)/);

  assert.match(route, /entityType === "Opportunity"/);
  assert.match(route, /crm\.opportunities\.write/);
  assert.match(route, /getOpportunity\(session\.organisationId, entityId\)/);
});

test("Service Job activity writes remain service-authorised and tenant-validated", () => {
  assert.match(route, /entityType === "ServiceJob"/);
  assert.match(route, /services\.jobs\.write/);
  assert.match(route, /getServiceJob\(session\.organisationId, entityId\)/);
});

test("arbitrary entity types cannot be used to create orphan or cross-object activities", () => {
  assert.match(route, /unsupported_entity_type/);
  assert.ok(
    route.indexOf("unsupported_entity_type") < route.indexOf("createActivity({"),
  );
});
