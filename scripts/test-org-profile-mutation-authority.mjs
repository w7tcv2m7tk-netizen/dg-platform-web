import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/org/profile/route.ts", "utf8");
const defaults = fs.readFileSync(
  "packages/platform-core/src/access/defaults.ts",
  "utf8",
);

function handler(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = source.indexOf("export async function", start + 10);
  return next >= 0 ? source.slice(start, next) : source.slice(start);
}

test("org profile mutations require organisation-scope settings.edit", () => {
  for (const name of ["PATCH", "POST"]) {
    const body = handler(route, name);
    assert.match(body, /module:\s*"settings"/);
    assert.match(body, /action:\s*"edit"/);
    assert.match(body, /scope:\s*"organisation"/);
    assert.ok(
      body.indexOf('action: "edit"') <
        body.search(/updateOrganisationBusinessProfile|syncOrganisationFromPortal/),
      `${name} must authorise before mutating`,
    );
  }
});

test("org profile GET stays readable with a platform session", () => {
  const get = handler(route, "GET");
  assert.match(get, /requirePlatformAuth/);
  assert.doesNotMatch(get, /requirePermission/);
});

test("members do not receive organisation-scope settings.edit by default", () => {
  const memberBlock = defaults.slice(
    defaults.indexOf("// Member"),
    defaults.indexOf("export function defaultGrantsForPlatformUserType"),
  );
  assert.match(memberBlock, /\["settings"\], \["view"\], "own"/);
  assert.doesNotMatch(memberBlock, /"settings"[\s\S]*"edit"[\s\S]*"organisation"/);
});
