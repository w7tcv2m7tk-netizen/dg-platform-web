import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

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

async function loadSpamGuard() {
  return import(
    pathToFileURL(
      path.join(__dirname, "../packages/platform-core/src/websites/form-spam-guard.ts"),
    ).href
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

  it("silently blocks a filled honeypot", async () => {
    const { checkFormSpam } = await loadSpamGuard();
    const verdict = checkFormSpam({
      honeypot: "https://spam.example",
      clientIp: "203.0.113.10",
      siteKey: `property-report-honeypot-${Date.now()}`,
    });

    assert.equal(verdict.allowed, false);
    assert.equal(verdict.silent, true);
  });

  it("blocks spam content", async () => {
    const { checkFormSpam } = await loadSpamGuard();
    const verdict = checkFormSpam({
      name: "Cheap Web Design",
      email: "spam@example.com",
      message: "Cheap web design and backlinks. Click here for profit.",
      clientIp: "203.0.113.11",
      siteKey: `property-report-content-${Date.now()}`,
    });

    assert.equal(verdict.allowed, false);
    assert.equal(verdict.silent, false);
    assert.equal(verdict.code, "spam_content");
  });

  it("rate-limits repeated submissions from one IP and form bucket", async () => {
    const { checkFormSpam } = await loadSpamGuard();
    const siteKey = `property-report-rate-${Date.now()}`;
    const clientIp = "203.0.113.12";

    for (let i = 0; i < 6; i += 1) {
      assert.equal(
        checkFormSpam({
          name: "Alex Roe",
          email: `alex-${i}@example.com`,
          clientIp,
          siteKey,
        }).allowed,
        true,
      );
    }

    const blocked = checkFormSpam({
      name: "Alex Roe",
      email: "alex-7@example.com",
      clientIp,
      siteKey,
    });

    assert.equal(blocked.allowed, false);
    assert.equal(blocked.silent, false);
    assert.equal(blocked.code, "rate_limited");
  });

  it("allows a normal legitimate submission", async () => {
    const { checkFormSpam } = await loadSpamGuard();
    const verdict = checkFormSpam({
      name: "Alex Roe",
      email: "alex@example.com",
      phone: "0400000000",
      message: "I would like a property report for my home.",
      clientIp: "203.0.113.13",
      siteKey: `property-report-legitimate-${Date.now()}`,
    });

    assert.deepEqual(verdict, { allowed: true });
  });

  it("uses the shared response adapter", async () => {
    const source = await loadSpamResponseSource();

    assert.match(source, /checkFormSpam\(/);
    assert.match(source, /clientIp:/);
    assert.match(source, /verdict\.silent/);
    assert.match(source, /rate_limited/);
    assert.match(source, /spam_content/);
  });
});
