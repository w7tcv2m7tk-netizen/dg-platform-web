import assert from "node:assert/strict";
import { test } from "node:test";
import { validateEnvironmentRegister } from "./environment-lifecycle.mjs";
const now = new Date("2026-11-17T00:00:00Z");
test("valid register passes", () => assert.equal(validateEnvironmentRegister({ reviewCadenceDays: 90, projects: [{ name: "p", owner: "o", classification: "production", permanent: true, reviewAt: "2027-02-15", customEnvironments: [{ slug: "c", owner: "o", purpose: "p", expiresAt: "2026-12-17", cleanupAction: "remove together" }] }] }, now).ok, true));
test("expired temporary project and custom environment fail", () => {
  const result = validateEnvironmentRegister({ reviewCadenceDays: 90, projects: [{ name: "temp", owner: "o", classification: "temporary", permanent: false, expiresAt: "2026-11-01", customEnvironments: [{ slug: "c", owner: "o", purpose: "p", expiresAt: "2026-11-01", cleanupAction: "remove" }] }] }, now);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /expired/i.test(e)));
});
test("missing ownership and expiry fail closed", () => {
  const result = validateEnvironmentRegister({ reviewCadenceDays: 90, projects: [{ name: "p", classification: "temporary", permanent: false }] }, now);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /owner/.test(e)));
  assert.ok(result.errors.some((e) => /expiry/.test(e)));
});
