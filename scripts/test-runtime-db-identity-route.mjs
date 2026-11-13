import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/app/api/v1/operator/runtime-db-identity/route.ts", import.meta.url), "utf8");

test("runtime identity probe defaults off and prevents shared caching", () => {
  assert.match(source, /DG_RUNTIME_IDENTITY_DIAGNOSTIC_ENABLED !== "true"/);
  assert.match(source, /return response\(\{ error: "not_found" \}, 404\)/);
  assert.match(source, /Cache-Control.*private, no-store/);
});

test("operator-only Clerk authentication precedes DB access", () => {
  assert.match(source, /requireClerkSession\(\)/);
  assert.match(source, /assertPlatformOperator\(/);
  assert.doesNotMatch(source, /requirePlatformAuth\(/);
  assert.ok(source.indexOf("assertPlatformOperator(") < source.indexOf("prisma.$queryRaw"));
  assert.match(source, /return response\(\{ error: "forbidden" \}, 403\)/);
});

test("read-only identity proof excludes raw credentials and fails closed", () => {
  assert.match(source, /SELECT current_user::text AS runtime_role/);
  assert.match(source, /session_user::text AS session_role/);
  assert.match(source, /EXPECTED_ENDPOINT\.test\(host\)/);
  assert.match(source, /Object\.values\(checks\)\.every/);
  assert.doesNotMatch(source, /JSON\.stringify\(process\.env\.DATABASE_URL\)/);
  assert.doesNotMatch(source, /response\(\{[^}]*DATABASE_URL/);
  assert.match(source, /return response\(\{ error: "identity_unavailable" \}, 503\)/);
});
