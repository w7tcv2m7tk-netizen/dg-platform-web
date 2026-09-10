import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/(shell)/apps/crm/tasks/page.tsx", "utf8");
const list = fs.readFileSync("src/components/crm/TasksList.tsx", "utf8");
const route = fs.readFileSync("src/app/api/v1/tasks/route.ts", "utf8");
const targetAuthority = fs.readFileSync("src/lib/task-target-authority.ts", "utf8");
const targetLookup = fs.readFileSync(
  "packages/platform-core/src/tasks/target.ts",
  "utf8",
);

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
    "crm.contacts.read",
    "crm.contacts.write",
    "crm.companies.read",
    "crm.companies.write",
    "crm.opportunities.read",
    "crm.opportunities.write",
    "services.jobs.read",
    "services.jobs.write",
  ]) {
    assert.ok(
      targetAuthority.includes(`"${feature}"`),
      `missing explicit ${feature} authority`,
    );
  }

  assert.doesNotMatch(targetAuthority, /\$\{suffix\}/);
  assert.match(route, /validateTaskTarget/);
  assert.match(targetLookup, /getContact\(organisationId, entityId\)/);
  assert.match(targetLookup, /getCompany\(organisationId, entityId\)/);
  assert.match(targetLookup, /getOpportunity\(organisationId, entityId\)/);
  assert.match(targetLookup, /getServiceJob\(organisationId, entityId\)/);
  assert.match(targetLookup, /unsupported_entity_type/);
});

test("creating linked activity requires target write authority", () => {
  assert.match(
    route,
    /requireTargetWrite: body\.createRelatedActivity !== false/,
  );
});

test("Task relationships require entityType and entityId as a pair", () => {
  assert.match(route, /entityType and entityId must be supplied together/);
  assert.match(route, /entityType and entityId must be supplied together or both cleared/);
});
