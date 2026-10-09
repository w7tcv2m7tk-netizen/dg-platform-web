import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const p = path.join(dir, e.name); return e.isDirectory() ? files(p) : p.endsWith(".js") ? [p] : [];
});
test("built browser bundles exclude authoritative gate and server checkout creators", () => {
  const browser = files(".next/static"), server = files(".next/server");
  assert.ok(browser.length && server.length, "Build production artifacts first");
  const markers = ["platform_checkout_creation_gate", "last_admission_expires_at", "Subscription checkout is temporarily unavailable."];
  for (const p of browser) for (const marker of markers) assert.ok(!readFileSync(p, "utf8").includes(marker), `${marker} in browser: ${p}`);
  for (const marker of markers) assert.ok(server.some(p => readFileSync(p, "utf8").includes(marker)), `${marker} absent from server`);
});
