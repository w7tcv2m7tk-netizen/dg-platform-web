import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../packages/platform-core/src/seo/fix-seo.ts", import.meta.url),
  "utf8",
);

test("automatic SEO fixes fail closed for multiple Studio websites", () => {
  assert.match(source, /if \(sites\.length > 1\)/);
  assert.match(source, /DigitalGate will not guess which site to change/);
});

test("the audited host must match the Business Profile host before a write", () => {
  const verification = source.indexOf("auditedHost !== profileHost");
  const firstWrite = source.indexOf("await updateWebsitePage(");

  assert.ok(verification >= 0, "expected an audited/profile host comparison");
  assert.ok(firstWrite > verification, "target verification must happen before the first write");
  assert.match(source, /!auditedHost \|\| !profileHost/);
});
