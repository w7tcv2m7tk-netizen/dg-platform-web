/**
 * SSRF guard regression.
 *
 * Two surfaces fetch a caller/tenant-controlled URL server-side:
 *   - runPresenceAudit — reachable UNAUTHENTICATED via POST /api/public/business-audit
 *     (action "probe"). Validation previously only checked the scheme, so a caller
 *     could probe cloud metadata (169.254.169.254), localhost or RFC1918 space and
 *     infer internal state from status/timing/final URL.
 *   - fetchIcalFeed — fetches tenant-supplied OTA iCal URLs.
 *
 * These tests exercise address classification, URL target validation, per-hop
 * redirect revalidation, and the two wired call sites. DNS and network are
 * mocked/injected so nothing depends on real metadata services or private nets.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corePath = (rel) =>
  pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel)).href;

const loadGuard = () => import(corePath("command-centre/growth-engine/ssrf-guard.ts"));
const loadIcal = () => import(corePath("accommodation/ical-import.ts"));
const loadPresence = () => import(corePath("command-centre/growth-engine/presence-audit.ts"));

/** Deterministic offline DNS stubs. */
const publicLookup = async () => [{ address: "93.184.216.34" }]; // example.com public IP
const privateLookup = async () => [{ address: "10.0.0.5" }];
const failingLookup = async () => {
  throw new Error("ENOTFOUND");
};

describe("SSRF guard: address classification", () => {
  it("blocks loopback, metadata and unspecified", async () => {
    const { isBlockedIpAddress } = await loadGuard();
    assert.equal(isBlockedIpAddress("169.254.169.254"), true, "cloud metadata");
    assert.equal(isBlockedIpAddress("127.0.0.1"), true);
    assert.equal(isBlockedIpAddress("127.5.6.7"), true, "127.0.0.0/8");
    assert.equal(isBlockedIpAddress("0.0.0.0"), true);
    assert.equal(isBlockedIpAddress("::1"), true, "IPv6 loopback");
    assert.equal(isBlockedIpAddress("::"), true, "IPv6 unspecified");
  });

  it("blocks RFC1918 and CGNAT ranges", async () => {
    const { isBlockedIpAddress } = await loadGuard();
    for (const ip of ["10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1"]) {
      assert.equal(isBlockedIpAddress(ip), true, ip);
    }
  });

  it("blocks IPv6 link-local, ULA and IPv4-mapped private", async () => {
    const { isBlockedIpAddress } = await loadGuard();
    assert.equal(isBlockedIpAddress("fe80::1"), true, "link-local");
    assert.equal(isBlockedIpAddress("fd00::1"), true, "ULA");
    assert.equal(isBlockedIpAddress("fc00::1"), true, "ULA");
    assert.equal(isBlockedIpAddress("::ffff:169.254.169.254"), true, "mapped metadata");
    assert.equal(isBlockedIpAddress("::ffff:10.0.0.1"), true, "mapped RFC1918");
  });

  it("allows ordinary public addresses", async () => {
    const { isBlockedIpAddress } = await loadGuard();
    assert.equal(isBlockedIpAddress("8.8.8.8"), false);
    assert.equal(isBlockedIpAddress("1.1.1.1"), false);
    assert.equal(isBlockedIpAddress("2606:4700:4700::1111"), false);
  });

  it("treats anything unparseable as blocked (fail closed)", async () => {
    const { isBlockedIpAddress } = await loadGuard();
    assert.equal(isBlockedIpAddress("not-an-ip"), true);
    assert.equal(isBlockedIpAddress(""), true);
  });
});

describe("SSRF guard: URL target validation", () => {
  it("allows a public HTTP URL (literal IP, no DNS)", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    const r = await assertPublicHttpTarget("http://8.8.8.8/");
    assert.equal(r.allowed, true);
  });

  it("allows a public HTTPS URL (literal IP, no DNS)", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    const r = await assertPublicHttpTarget("https://1.1.1.1/path");
    assert.equal(r.allowed, true);
  });

  it("allows a public hostname that resolves to a public address", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    const r = await assertPublicHttpTarget("https://example.com/", { lookup: publicLookup });
    assert.equal(r.allowed, true);
    assert.equal(r.hostname, "example.com");
  });

  it("rejects non-HTTP(S) schemes", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    for (const url of ["file:///etc/passwd", "gopher://example.com/", "ftp://example.com/"]) {
      const r = await assertPublicHttpTarget(url);
      assert.equal(r.allowed, false, url);
      assert.equal(r.reason, "unsupported_scheme");
    }
  });

  it("rejects localhost and internal hostnames by name", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    for (const url of [
      "http://localhost/",
      "http://metadata.google.internal/",
      "http://db.internal/",
      "http://foo.localhost/",
    ]) {
      const r = await assertPublicHttpTarget(url);
      assert.equal(r.allowed, false, url);
      assert.equal(r.reason, "blocked_hostname");
    }
  });

  it("rejects literal loopback / metadata / RFC1918 / IPv6 without DNS", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    for (const url of [
      "http://127.0.0.1:3000/api/v1/contacts",
      "http://127.9.9.9/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.5/",
      "http://192.168.1.10/",
      "http://172.16.4.4/",
      "http://[::1]:8080/",
      "http://[fd00::1]/",
    ]) {
      const r = await assertPublicHttpTarget(url);
      assert.equal(r.allowed, false, url);
      assert.equal(r.reason, "private_address");
    }
  });

  it("rejects a hostname that resolves to a private address (DNS rebinding)", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    const r = await assertPublicHttpTarget("https://rebind.example/", { lookup: privateLookup });
    assert.equal(r.allowed, false);
    assert.equal(r.reason, "private_address");
  });

  it("fails closed on DNS resolution failure", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    const thrown = await assertPublicHttpTarget("https://nope.example/", { lookup: failingLookup });
    assert.equal(thrown.allowed, false);
    assert.equal(thrown.reason, "unresolvable_host");

    // Real unresolvable TLD also fails closed (no network dependency for .invalid).
    const invalid = await assertPublicHttpTarget("https://this-host-should-not-resolve.invalid/");
    assert.equal(invalid.allowed, false);
    assert.equal(invalid.reason, "unresolvable_host");
  });

  it("rejects malformed URLs", async () => {
    const { assertPublicHttpTarget } = await loadGuard();
    const r = await assertPublicHttpTarget("not a url");
    assert.equal(r.allowed, false);
    assert.equal(r.reason, "invalid_url");
  });
});

describe("SSRF guard: redirect hops", () => {
  it("re-validates a redirect from a public URL to a private address", async () => {
    const { safeExternalFetch, BlockedTargetError } = await loadGuard();
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(String(url));
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      });
    };
    await assert.rejects(
      safeExternalFetch("https://example.com/", {}, { fetchImpl, lookup: publicLookup }),
      (err) => err instanceof BlockedTargetError && err.reason === "private_address",
    );
    assert.equal(seen.length, 1, "must not fetch the blocked redirect target");
  });

  it("rejects a chain where a LATER hop becomes private", async () => {
    const { safeExternalFetch, BlockedTargetError } = await loadGuard();
    const seen = [];
    const fetchImpl = async (url) => {
      seen.push(String(url));
      if (seen.length === 1) {
        return new Response(null, { status: 301, headers: { location: "http://8.8.8.8/next" } });
      }
      return new Response(null, { status: 302, headers: { location: "http://10.0.0.5/internal" } });
    };
    await assert.rejects(
      safeExternalFetch("http://1.1.1.1/", {}, { fetchImpl }),
      (err) => err instanceof BlockedTargetError && err.reason === "private_address",
    );
    assert.equal(seen.length, 2, "followed the first public hop, blocked the second");
  });

  it("follows ordinary public redirects to completion", async () => {
    const { safeExternalFetch } = await loadGuard();
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      if (call === 1) {
        return new Response(null, { status: 301, headers: { location: "http://1.1.1.1/final" } });
      }
      return new Response("ok", { status: 200 });
    };
    const res = await safeExternalFetch("http://8.8.8.8/", {}, { fetchImpl });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), "ok");
    assert.equal(call, 2);
  });

  it("stops rather than looping on a redirect cycle", async () => {
    const { safeExternalFetch, BlockedTargetError } = await loadGuard();
    const fetchImpl = async () =>
      new Response(null, { status: 302, headers: { location: "http://8.8.8.8/loop" } });
    await assert.rejects(
      safeExternalFetch("http://8.8.8.8/loop", {}, { fetchImpl }),
      (err) => err instanceof BlockedTargetError && err.reason === "too_many_redirects",
    );
  });
});

describe("SSRF guard: wired call sites", () => {
  it("fetchIcalFeed refuses a private/loopback URL and makes no real request", async () => {
    const { fetchIcalFeed } = await loadIcal();
    const originalFetch = globalThis.fetch;
    let called = 0;
    globalThis.fetch = async () => {
      called += 1;
      throw new Error("network should not be reached for a blocked target");
    };
    try {
      const r = await fetchIcalFeed("http://127.0.0.1/cal.ics");
      assert.equal(r.ok, false);
      assert.match(r.message, /blocked_target:private_address/);
      assert.equal(called, 0, "guard rejected before any fetch");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("fetchIcalFeed refuses the cloud metadata endpoint", async () => {
    const { fetchIcalFeed } = await loadIcal();
    const r = await fetchIcalFeed("http://169.254.169.254/latest/meta-data/");
    assert.equal(r.ok, false);
    assert.match(r.message, /blocked_target:private_address/);
  });

  it("fetchIcalFeed still accepts a legitimate public feed (mocked network)", async () => {
    const { fetchIcalFeed } = await loadIcal();
    const originalFetch = globalThis.fetch;
    const ics =
      "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:abc\nDTSTART:20260101\nDTEND:20260103\nSUMMARY:Booked\nEND:VEVENT\nEND:VCALENDAR";
    // Use a literal public IP so the guard's own resolution needs no DNS; only the
    // outbound request is mocked.
    globalThis.fetch = async (_url, init) => {
      assert.equal(init.redirect, "manual", "guard fetches with manual redirect handling");
      return new Response(ics, { status: 200, headers: { "content-type": "text/calendar" } });
    };
    try {
      const r = await fetchIcalFeed("https://8.8.8.8/export/dg.ics");
      assert.equal(r.ok, true);
      assert.match(r.body, /BEGIN:VCALENDAR/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("runPresenceAudit refuses a metadata/loopback website without a real request", async () => {
    const { runPresenceAudit } = await loadPresence();
    const originalFetch = globalThis.fetch;
    let called = 0;
    globalThis.fetch = async () => {
      called += 1;
      throw new Error("network should not be reached for a blocked target");
    };
    try {
      const result = await runPresenceAudit({
        businessName: "Attacker",
        websiteUrl: "http://169.254.169.254/latest/meta-data/",
        publicPreview: true,
      });
      assert.equal(result.probes.reachable, false);
      assert.match(result.probes.error ?? "", /blocked_target:private_address/);
      assert.equal(called, 0, "guard rejected before any fetch");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("runPresenceAudit still probes a legitimate public site (mocked network)", async () => {
    const { runPresenceAudit } = await loadPresence();
    const originalFetch = globalThis.fetch;
    const html = "<html><head><title>Acme</title></head><body><h1>Hi</h1></body></html>";
    globalThis.fetch = async (url) => {
      // literal public IP → no DNS needed; return HTML for the audit to parse.
      return new Response(html, {
        status: 200,
        url: String(url),
        headers: { "content-type": "text/html" },
      });
    };
    try {
      const result = await runPresenceAudit({
        businessName: "Acme",
        websiteUrl: "https://93.184.216.34/",
        publicPreview: true,
      });
      assert.equal(result.probes.reachable, true);
      assert.equal(result.probes.statusCode, 200);
      assert.equal(result.probes.title, "Acme");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
