import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const ROUTES = [
  "src/app/api/v1/admin/commissions/[id]/status/route.ts",
  "src/app/api/v1/founding/actions/route.ts",
  "src/app/api/v1/founding/invitations/route.ts",
];

for (const route of ROUTES) {
  test(`${route} requires branded platform-operator authority`, () => {
    const source = fs.readFileSync(route, "utf8");

    assert.match(source, /requirePlatformOperator\(req\)/);
    assert.doesNotMatch(source, /requirePlatformSession\(/);
    assert.doesNotMatch(source, /canAccessCommandCentre\(/);
  });
}

test("opportunity task writes use neutral branded operator authority, not a read feature", () => {
  const source = fs.readFileSync(
    "src/app/api/v1/command/opportunities/task/route.ts",
    "utf8",
  );

  assert.match(source, /requirePlatformOperator\(req\)/);
  assert.doesNotMatch(source, /command\.opportunities\.read/);
  assert.match(source, /createTask\(/);
});
