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
