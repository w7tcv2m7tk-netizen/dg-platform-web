import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/(shell)/command/tasks/page.tsx", "utf8");
const button = fs.readFileSync(
  "src/components/command/CompleteCommandTaskButton.tsx",
  "utf8",
);
const route = fs.readFileSync("src/app/api/v1/command/tasks/route.ts", "utf8");
const services = fs.readFileSync(
  "packages/platform-core/src/command-centre/operator-services.ts",
  "utf8",
);

test("Command task UI does not use tenant CRM completion endpoint", () => {
  assert.match(page, /CompleteCommandTaskButton/);
  assert.doesNotMatch(page, /CompleteTaskButton/);
  assert.match(button, /fetch\("\/api\/v1\/command\/tasks"/);
  assert.doesNotMatch(button, /fetch\("\/api\/v1\/tasks"/);
});

test("Command task mutation requires platform operator capability", () => {
  assert.match(route, /requirePlatformOperator\(req, "command\.view"\)/);
  assert.match(route, /completeOperatorCommandTask\(auth\.operator, id\)/);
});

test("operator task completion resolves DigitalGate org server-side", () => {
  assert.match(services, /resolveDigitalGateOperatorOrganisationId\(\)/);
  assert.match(services, /completeTask\(organisationId, taskId, operator\.actorId\)/);
  assert.doesNotMatch(route, /organisationId.*body/);
});
