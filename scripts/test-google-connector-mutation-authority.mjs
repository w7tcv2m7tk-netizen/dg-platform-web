import fs from "node:fs";
import assert from "node:assert/strict";

const guardedMutations = [
  "src/app/api/v1/connectors/google/locations/route.ts",
  "src/app/api/v1/connectors/google/analytics/config/route.ts",
];

for (const file of guardedMutations) {
  const src = fs.readFileSync(file, "utf8");
  assert.match(src, /requirePermission\(/, `${file} must require organisation settings authority`);
  assert.match(
    src,
    /module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/,
    `${file} must enforce settings:manage at organisation scope`,
  );
}

const locations = fs.readFileSync(guardedMutations[0], "utf8");
assert.match(locations, /export async function PUT[\s\S]*requirePermission\(/);

const analytics = fs.readFileSync(guardedMutations[1], "utf8");
assert.match(analytics, /async function save[\s\S]*requirePermission\(/);

console.log("Google connector mutation authority regression checks passed");
