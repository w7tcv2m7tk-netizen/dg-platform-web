import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadRouteSource() {
  return readFile(
    path.join(__dirname, "../src/app/api/public/property-report/route.ts"),
    "utf8",
  );
}

async function loadSpamResponseSource() {
  return readFile(
    path.join(__dirname, "../src/lib/public-form-spam-response.ts"),
    "utf8",
  );
}

describe("public property report abuse guard", () => {
  it("uses the shared spam guard for submit requests", async () => {
    const source = await loadRouteSource();

    assert.match(source, /import \{ spamGuardResponse \} from "@\/lib\/public-form-spam-response"/);
    assert.match(source, /spamGuardResponse\(/);
    assert.match(source, /honeypot: body\.website/);
    assert.match(source, /`property-report:\$\{siteSlug\}`/);
  });

  it("passes contact fields needed for spam detection", async () => {
    const source = await loadRouteSource();

    assert.match(source, /name: body\.fullName \|\| body\.name/);
    assert.match(source, /email: body\.email/);
    assert.match(source, /phone: body\.phone/);
  });

  it("returns immediately when the shared guard blocks", async () => {
    const source = await loadRouteSource();
    const guardPosition = source.indexOf("const blocked = spamGuardResponse(");
    const earlyReturnPosition = source.indexOf("if (blocked) return blocked;", guardPosition);
    const submissionPosition = source.indexOf("const result = await submitPublicPropertyReport(", guardPosition);

    assert.ok(guardPosition >= 0, "spam guard call must exist");
    assert.ok(earlyReturnPosition > guardPosition, "blocked response must follow guard call");
    assert.ok(submissionPosition > earlyReturnPosition, "report submission must occur after the guard");
  });

  it("uses a shared guard that supports honeypot, rate limiting and content checks", async () => {
    const source = await loadSpamResponseSource();

    assert.match(source, /checkFormSpam\(/);
    assert.match(source, /clientIp:/);
    assert.match(source, /verdict\.silent/);
    assert.match(source, /rate_limited/);
    assert.match(source, /spam_content/);
  });
});
