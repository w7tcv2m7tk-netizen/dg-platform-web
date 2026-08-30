/**
 * H-5 regression — cron authentication must fail closed.
 *
 * Every cron route previously fell back to "authorised if the request carries
 * an x-vercel-cron header" whenever CRON_SECRET was unset. That header is
 * attacker-suppliable, so any external caller could drive billing dunning,
 * scheduled email flushes and OTA syncs.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function load() {
  return import(
    pathToFileURL(path.join(__dirname, "../src/lib/cron-auth.ts")).href
  );
}

const SECRET = "s3cret-cron-value";

function request(headers = {}) {
  return new Request("https://app.digitalgate.com.au/api/cron/billing-dunning", {
    headers,
  });
}

let original;
beforeEach(() => {
  original = process.env.CRON_SECRET;
});
afterEach(() => {
  if (original === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = original;
});

describe("H-5: cron authentication", () => {
  it("fails closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const { authorizeCronRequest } = await load();

    const result = authorizeCronRequest(request());
    assert.equal(result.ok, false);
    assert.equal(result.code, "cron_not_configured");
  });

  it("does not accept x-vercel-cron as authentication", async () => {
    delete process.env.CRON_SECRET;
    const { authorizeCronRequest } = await load();

    assert.equal(
      authorizeCronRequest(request({ "x-vercel-cron": "1" })).ok,
      false,
    );

    process.env.CRON_SECRET = SECRET;
    assert.equal(
      authorizeCronRequest(request({ "x-vercel-cron": "1" })).ok,
      false,
    );
  });

  it("rejects a wrong or absent secret", async () => {
    process.env.CRON_SECRET = SECRET;
    const { authorizeCronRequest } = await load();

    assert.equal(authorizeCronRequest(request()).ok, false);
    assert.equal(
      authorizeCronRequest(request({ authorization: "Bearer wrong" })).ok,
      false,
    );
    assert.equal(
      authorizeCronRequest(request({ "x-cron-secret": "wrong" })).ok,
      false,
    );
    // Length-prefix must not pass a timing-safe comparison.
    assert.equal(
      authorizeCronRequest(request({ "x-cron-secret": SECRET.slice(0, 5) })).ok,
      false,
    );
  });

  it("accepts the configured secret via bearer or header", async () => {
    process.env.CRON_SECRET = SECRET;
    const { authorizeCronRequest } = await load();

    assert.equal(
      authorizeCronRequest(request({ authorization: `Bearer ${SECRET}` })).ok,
      true,
    );
    assert.equal(
      authorizeCronRequest(request({ "x-cron-secret": SECRET })).ok,
      true,
    );
  });
});
