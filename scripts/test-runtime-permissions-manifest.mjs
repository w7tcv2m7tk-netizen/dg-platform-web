import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readManifest, validateManifest } from "./security/runtime-role-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("generated manifest and SQL are current", () => {
  const result = spawnSync(process.execPath, ["scripts/security/generate-runtime-role-manifest.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("manifest passes static coverage and boundary validation", () => {
  const manifest = readManifest(root);
  assert.deepEqual(validateManifest(root, manifest), []);
  assert.equal(Object.keys(manifest.tables).length, 83);
  assert.ok(manifest.requiredModules.includes("CRM"));
  assert.ok(manifest.requiredModules.includes("Business Brain"));
  assert.ok(manifest.requiredModules.includes("Checkout"));
});

test("checkout admission authority remains column-limited and append-only", () => {
  const manifest = readManifest(root);
  assert.deepEqual(manifest.tables.platform_checkout_admissions.privileges, ["SELECT"]);
  assert.deepEqual(manifest.tables.platform_checkout_admissions.columnPrivileges.UPDATE, ["attempt_id"]);
  assert.deepEqual(manifest.tables.platform_checkout_admission_audit.privileges, ["SELECT"]);
  assert.deepEqual(manifest.tables.platform_checkout_creation_gate.privileges, ["SELECT"]);
  assert.deepEqual(manifest.tables.platform_checkout_creation_gate.columnPrivileges.UPDATE, ["last_admission_expires_at"]);
  assert.ok(manifest.excludedRelations._prisma_migrations);
});

test("manifest rejects a migration-ledger grant", () => {
  const manifest = structuredClone(readManifest(root));
  manifest.tables._prisma_migrations = { module: "Platform", privileges: ["SELECT"], columnPrivileges: {}, rationale: "bad" };
  const errors = validateManifest(root, manifest);
  assert.ok(errors.some((error) => error.includes("_prisma_migrations")));
});

test("manifest rejects prohibited table privileges", () => {
  const manifest = structuredClone(readManifest(root));
  manifest.tables.organisations.privileges.push("TRUNCATE");
  const errors = validateManifest(root, manifest);
  assert.ok(errors.some((error) => error.includes("TRUNCATE")));
});

test("manifest rejects missing schema coverage", () => {
  const manifest = structuredClone(readManifest(root));
  delete manifest.tables.organisations;
  const errors = validateManifest(root, manifest);
  assert.ok(errors.some((error) => error.includes("schema table missing from manifest: organisations")));
});

test("operator-only schema remediation is not treated as runtime SQL", () => {
  const manifest = readManifest(root);
  assert.ok(manifest.operatorOnly.some((entry) => entry.path === "src/lib/remediate-991-physical.ts"));
  assert.ok(manifest.operatorOnly.some((entry) => entry.path === "packages/platform-core/src/billing/legacy-app-entitlement-reconciliation.ts"));
});
