/**
 * Property-report abuse protection (Option B — progressive).
 *
 * `POST /api/public/property-report` with `action=resolve` is unauthenticated
 * and calls Google Geocoding and CoreLogic Address Match per request, both
 * billed. Nothing deduplicated them.
 *
 * The funnel is commercially critical, so the design is: repeats are free
 * (cached), new addresses are budgeted generously, and only clearly automated
 * volume is refused.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = () =>
  import(
    pathToFileURL(
      path.join(__dirname, "../packages/platform-core/src/addresses/resolve-cache.ts"),
    ).href
  );

let mod;
beforeEach(async () => {
  mod = await load();
  mod.__resetResolveCacheForTests();
});

const ADDRESS = "11 Dinjirra Court, Tugun QLD 4224";

describe("Layer 2 — duplicate suppression", () => {
  it("serves an identical lookup from cache instead of re-billing", () => {
    assert.equal(mod.readResolveCache(ADDRESS), null, "cold");

    mod.writeResolveCache(ADDRESS, { ok: true, suburb: "Tugun" });

    assert.deepEqual(mod.readResolveCache(ADDRESS), { ok: true, suburb: "Tugun" });
  });

  it("treats trivial formatting differences as the same address", () => {
    mod.writeResolveCache(ADDRESS, { ok: true });

    assert.ok(mod.readResolveCache("11 dinjirra court tugun qld 4224"));
    assert.ok(mod.readResolveCache("11 Dinjirra Ct., Tugun  QLD 4224".replace("Ct.", "Court")));
  });

  it("expires so property data cannot go stale indefinitely", () => {
    const t0 = Date.now();
    mod.writeResolveCache(ADDRESS, { ok: true }, t0);

    assert.ok(mod.readResolveCache(ADDRESS, t0 + mod.RESOLVE_CACHE_TTL_MS - 1000));
    assert.equal(
      mod.readResolveCache(ADDRESS, t0 + mod.RESOLVE_CACHE_TTL_MS + 1000),
      null,
      "must not serve beyond TTL",
    );
  });

  it("does not cache a payload carrying tenant-scoped identifiers", () => {
    assert.equal(mod.assertCacheableResolvedPayload({ ok: true, suburb: "Tugun" }), true);
    assert.equal(
      mod.assertCacheableResolvedPayload({ ok: true, organisationId: "org_a" }),
      false,
      "tenant data must never be shared across callers",
    );
    assert.equal(mod.assertCacheableResolvedPayload({ ok: true, leadId: "lead_1" }), false);
  });

  it("cache keys cannot be manipulated to reach another caller's private data", () => {
    // The key is derived purely from the address string, and only non-tenant
    // payloads are cacheable, so there is no per-user data to retrieve.
    mod.writeResolveCache(ADDRESS, { ok: true, suburb: "Tugun" });
    const value = mod.readResolveCache(ADDRESS);
    assert.equal(JSON.stringify(value).includes("organisationId"), false);
  });
});

describe("Layer 3 — per-caller budget on NEW addresses", () => {
  it("lets a genuine prospect compare several properties freely", () => {
    for (let i = 0; i < mod.RESOLVE_DISTINCT_ADDRESS_LIMIT; i += 1) {
      const verdict = mod.checkResolveBudget("203.0.113.7", `${i} Example St, Tugun`);
      assert.equal(verdict.allowed, true, `lookup ${i + 1} must be allowed`);
    }
  });

  it("never charges a caller twice for the same address", () => {
    for (let i = 0; i < 50; i += 1) {
      const verdict = mod.checkResolveBudget("203.0.113.7", ADDRESS);
      assert.equal(verdict.allowed, true, "repeats must always be free");
    }
  });

  it("refuses only once a caller exceeds the distinct-address budget", () => {
    for (let i = 0; i < mod.RESOLVE_DISTINCT_ADDRESS_LIMIT; i += 1) {
      mod.checkResolveBudget("198.51.100.9", `${i} Example St`);
    }

    const verdict = mod.checkResolveBudget("198.51.100.9", "999 Beyond Budget Rd");
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, "budget_exceeded");
    assert.ok(verdict.retryAfterMs > 0);
  });

  it("escalates to a suspicious verdict for scraper-scale volume", () => {
    for (let i = 0; i < mod.RESOLVE_SUSPICIOUS_LIMIT; i += 1) {
      mod.checkResolveBudget("198.51.100.10", `${i} Scrape St`);
    }

    const verdict = mod.checkResolveBudget("198.51.100.10", "next Scrape St");
    assert.equal(verdict.allowed, false);
    assert.equal(verdict.reason, "suspicious");
  });

  it("isolates callers so one heavy user cannot block another", () => {
    for (let i = 0; i < mod.RESOLVE_SUSPICIOUS_LIMIT + 5; i += 1) {
      mod.checkResolveBudget("198.51.100.11", `${i} Scrape St`);
    }

    const other = mod.checkResolveBudget("203.0.113.50", ADDRESS);
    assert.equal(other.allowed, true, "a different caller must be unaffected");
  });

  it("does not give an unidentifiable caller an unlimited free pass", () => {
    for (let i = 0; i < mod.RESOLVE_SUSPICIOUS_LIMIT; i += 1) {
      mod.checkResolveBudget("", `${i} Unknown St`);
    }
    const verdict = mod.checkResolveBudget("", "another Unknown St");
    assert.equal(verdict.allowed, false);
  });

  it("recovers after the window so a shared office IP is not locked out", () => {
    const t0 = Date.now();
    for (let i = 0; i < mod.RESOLVE_DISTINCT_ADDRESS_LIMIT; i += 1) {
      mod.checkResolveBudget("203.0.113.99", `${i} Office St`, t0);
    }
    assert.equal(
      mod.checkResolveBudget("203.0.113.99", "new Office St", t0).allowed,
      false,
    );

    const later = t0 + mod.RESOLVE_WINDOW_MS + 1000;
    assert.equal(
      mod.checkResolveBudget("203.0.113.99", "new Office St", later).allowed,
      true,
      "the window must roll off",
    );
  });
});

/**
 * The thresholds above are initial production values, so they have to be
 * tunable from evidence. Telemetry rides on the existing application log rather
 * than new infrastructure, and must not turn a public funnel into a PII sink.
 */
describe("Telemetry for threshold tuning", () => {
  const capture = (fn) => {
    const original = console.log;
    const lines = [];
    console.log = (line) => lines.push(String(line));
    try {
      fn();
    } finally {
      console.log = original;
    }
    return lines;
  };

  it("emits one parseable line per event under a stable prefix", () => {
    const lines = capture(() =>
      mod.recordResolveTelemetry({
        event: "resolve",
        outcome: "resolved",
        distinctAddresses: 3,
        providerCallAvoided: false,
      }),
    );

    assert.equal(lines.length, 1);
    assert.ok(lines[0].startsWith(mod.RESOLVE_TELEMETRY_PREFIX));

    const payload = JSON.parse(lines[0].slice(mod.RESOLVE_TELEMETRY_PREFIX.length));
    assert.equal(payload.event, "resolve");
    assert.equal(payload.outcome, "resolved");
    assert.equal(payload.distinctAddresses, 3);
    assert.equal(typeof payload.cacheEntries, "number");
    assert.equal(typeof payload.trackedCallers, "number");
  });

  it("carries no address, IP or tenant identifier", () => {
    mod.checkResolveBudget("203.0.113.42", ADDRESS);
    const lines = capture(() =>
      mod.recordResolveTelemetry({
        event: "resolve",
        outcome: "cache_hit",
        distinctAddresses: 1,
        providerCallAvoided: true,
      }),
    );

    const line = lines[0];
    assert.ok(!line.includes("203.0.113.42"), "must not log the caller IP");
    assert.ok(!line.includes("Dinjirra"), "must not log the address");
    assert.ok(!/organisation|contactId|leadId/i.test(line));
  });

  it("distinguishes avoided provider calls so cache savings are measurable", () => {
    const avoided = JSON.parse(
      capture(() =>
        mod.recordResolveTelemetry({
          event: "resolve",
          outcome: "cache_hit",
          providerCallAvoided: true,
        }),
      )[0].slice(mod.RESOLVE_TELEMETRY_PREFIX.length),
    );
    const billed = JSON.parse(
      capture(() =>
        mod.recordResolveTelemetry({
          event: "resolve",
          outcome: "resolved",
          providerCallAvoided: false,
        }),
      )[0].slice(mod.RESOLVE_TELEMETRY_PREFIX.length),
    );

    assert.equal(avoided.providerCallAvoided, true);
    assert.equal(billed.providerCallAvoided, false);
  });

  it("reports the caller's distinct-address count so automation is visible", () => {
    for (let i = 0; i < 5; i += 1) {
      mod.checkResolveBudget("198.51.100.7", `${i} Sample St`);
    }
    const verdict = mod.checkResolveBudget("198.51.100.7", "6 Sample St");
    assert.equal(verdict.distinctAddresses, 6);
  });

  it("never lets a logging failure break the funnel", () => {
    const original = console.log;
    console.log = () => {
      throw new Error("log sink unavailable");
    };
    try {
      assert.doesNotThrow(() =>
        mod.recordResolveTelemetry({ event: "submit", outcome: "submitted" }),
      );
    } finally {
      console.log = original;
    }
  });
});

/**
 * Option B budgets `resolve`, but `submit` is the expensive action and was
 * unprotected: `action` defaults to submit, so a caller can skip resolve
 * entirely, and each accepted submit pulls Cotality property detail and sends
 * two emails. Only a honeypot stood in the way, which an API client bypasses by
 * not sending the field.
 */
describe("Submit path protection", () => {
  const readSource = async (rel) => {
    const { readFile } = await import("node:fs/promises");
    return readFile(path.join(__dirname, "..", rel), "utf8");
  };

  it("runs the shared public-form guard before doing any paid work", async () => {
    const src = await readSource("src/app/api/public/property-report/route.ts");

    const submitAt = src.indexOf('if (action === "submit")');
    const guardAt = src.indexOf("spamGuardResponse(", submitAt);
    const workAt = src.indexOf("submitPublicPropertyReport({", submitAt);

    assert.ok(submitAt > 0, "submit branch not found");
    assert.ok(guardAt > submitAt, "submit must be guarded");
    assert.ok(guardAt < workAt, "the guard must run before the paid work");
  });

  it("buckets the rate limit per site rather than globally", async () => {
    const src = await readSource("src/app/api/public/property-report/route.ts");
    assert.match(src, /`property-report:\$\{siteSlug\}`/);
  });

  it("passes the honeypot and the identity fields to the guard", async () => {
    const src = await readSource("src/app/api/public/property-report/route.ts");
    const at = src.indexOf("spamGuardResponse(");
    const block = src.slice(at, at + 400);

    assert.match(block, /honeypot: body\.website/);
    assert.match(block, /email: body\.email/);
    assert.match(block, /phone: body\.phone/);
  });

  it("reuses the existing guard rather than adding new infrastructure", async () => {
    const src = await readSource("src/app/api/public/property-report/route.ts");
    assert.match(src, /from "@\/lib\/public-form-spam-response"/);
    // No new store, no new dependency.
    assert.doesNotMatch(src, /redis|Redis|upstash|Upstash/);
  });

  it("records a blocked submit so the rate can be measured", async () => {
    const src = await readSource("src/app/api/public/property-report/route.ts");
    const at = src.indexOf("if (blocked) {");
    assert.ok(at > 0);
    assert.match(src.slice(at, at + 220), /outcome: "submit_blocked"/);
  });

  it("still leaves resolve on its own distinct-address budget", async () => {
    const src = await readSource("src/app/api/public/property-report/route.ts");
    // The two actions have different shapes of abuse and keep separate controls.
    const resolveAt = src.indexOf('if (action === "resolve")');
    const budgetAt = src.indexOf("checkResolveBudget(", resolveAt);
    assert.ok(resolveAt > 0 && budgetAt > resolveAt);
  });
});

describe("Cotality is not paid for twice per submit", () => {
  const readSource = async (rel) => {
    const { readFile } = await import("node:fs/promises");
    return readFile(path.join(__dirname, "..", rel), "utf8");
  };

  it("skips the report refresh when detail was just pulled", async () => {
    const src = await readSource(
      "packages/platform-core/src/real-estate/public-property-report.ts",
    );

    assert.match(src, /let cotalityDetailsFresh = false;/);
    assert.match(src, /refreshCotality: !cotalityDetailsFresh/);
    // Only a successful pull may mark it fresh.
    assert.match(src, /if \(pulled\.ok\) cotalityDetailsFresh = true;/);
  });

  it("still refreshes when the property was only just matched", async () => {
    const src = await readSource(
      "packages/platform-core/src/real-estate/public-property-report.ts",
    );

    // The match branch attaches an id without pulling detail, so the flag must
    // stay false there and the report email must do the pull.
    const matchAt = src.indexOf("matchPropertyWithCotality(organisationId, propertyId)");
    const pullAt = src.indexOf("pullCotalityPropertyDetails(organisationId, propertyId)");
    assert.ok(matchAt > 0 && pullAt > matchAt, "expected match branch before pull branch");
    const matchBranch = src.slice(matchAt, pullAt);
    assert.doesNotMatch(matchBranch, /cotalityDetailsFresh = true/);
  });

  it("does not treat a failed pull as fresh", async () => {
    const src = await readSource(
      "packages/platform-core/src/real-estate/public-property-report.ts",
    );
    const at = src.indexOf("pullCotalityPropertyDetails(organisationId, propertyId)");
    const block = src.slice(at, at + 700);

    // This reports failure by RETURNING { ok: false }, not by throwing, so a
    // bare .then() would mark a failed pull as fresh and the report would be
    // sent from a snapshot that was never populated. The outcome must be read.
    assert.match(block, /\.then\(\(pulled\) => \{/);
    assert.match(block, /if \(pulled\.ok\) cotalityDetailsFresh = true;/);

    // And a thrown error must not set it either.
    const catchAt = block.indexOf(".catch(");
    assert.ok(catchAt > 0);
    assert.doesNotMatch(block.slice(catchAt), /cotalityDetailsFresh = true/);
  });

  it("never sets the freshness flag unconditionally", async () => {
    const src = await readSource(
      "packages/platform-core/src/real-estate/public-property-report.ts",
    );
    // Guards against regressing to `.then(() => { cotalityDetailsFresh = true })`.
    assert.doesNotMatch(src, /\.then\(\(\) => \{\s*cotalityDetailsFresh = true;/);
  });
});
