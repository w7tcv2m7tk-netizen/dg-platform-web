import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/(shell)/apps/crm/tasks/page.tsx", "utf8");
const list = fs.readFileSync("src/components/crm/TasksList.tsx", "utf8");
const route = fs.readFileSync("src/app/api/v1/tasks/route.ts", "utf8");

test("Tasks SSR requires read authority before task queries", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("crm\.tasks\.read"\)/);
  assert.ok(
    page.indexOf('getAuthorisedPlatformPageSession("crm.tasks.read")') <
      page.indexOf("listTasks({"),
  );
});

test("Task mutation controls require crm.tasks.write", () => {
  assert.match(page, /sessionHasFeature\(session, "crm\.tasks\.write"\)/);
  assert.match(page, /canWrite \? \(/);
  assert.match(list, /canWrite && task\.status === "open"/);
});

test("linked Task targets are tenant-validated and object-authorised", () => {
  for (const feature of [
    "crm.contacts",
    "crm.companies",
    "crm.opportunities",
    "services.jobs",
  ]) {
    assert.match(route, new RegExp(feature.replace(".", "\\.") + "\\.\\$\\{suffix\\}"));
  }
  assert.match(route, /getContact\(session\.organisationId, entityId\)/);
  assert.match(route, /getCompany\(session\.organisationId, entityId\)/);
  assert.match(route, /getOpportunity\(session\.organisationId, entityId\)/);
  assert.match(route, /getServiceJob\(session\.organisationId, entityId\)/);
  assert.match(route, /unsupported_entity_type/);
});

test("Task relationships require entityType and entityId as a pair", () => {
  assert.match(route, /entityType and entityId must be supplied together/);
  assert.match(route, /entityType and entityId must be supplied together or both cleared/);
});
