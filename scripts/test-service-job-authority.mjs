/**
 * Service Job page authority must use canonical feature ids.
 * Run: node --experimental-strip-types --test scripts/test-service-job-authority.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("canonical services.jobs mapping", () => {
  it("maps services.* onto the industry permission module", () => {
    const source = readFileSync(path.join(__dirname, "../packages/platform-core/src/access/evaluate.ts"), "utf8");
    assert.match(source, /services:\s*"industry"/);
    assert.match(source, /function featureIdToPermissionCheck/);
  });
});

describe("Service Job pages", () => {
  it("enforce services.jobs.read before loading job data", () => {
    const detail = readFileSync(path.join(__dirname, "../src/app/(shell)/apps/services/jobs/[id]/page.tsx"), "utf8");
    const list = readFileSync(path.join(__dirname, "../src/app/(shell)/apps/services/jobs/page.tsx"), "utf8");
    assert.match(detail, /getAuthorisedPlatformPageSession\("services\.jobs\.read"\)/);
    assert.match(detail, /sessionHasFeature\(session, "commerce\.read"\)/);
    assert.match(detail, /sessionHasFeature\(session, "crm\.contacts\.read"\)/);
    assert.match(detail, /sessionHasFeature\(session, "services\.jobs\.write"\)/);
    assert.match(list, /getAuthorisedPlatformPageSession\("services\.jobs\.read"\)/);
    assert.equal(detail.includes("resolveActivePlatformSession"), false);
    assert.equal(list.includes("resolveActivePlatformSession"), false);
  });
});
