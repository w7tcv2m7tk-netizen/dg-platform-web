/**
 * SSRF regression — the public business-audit funnel
 * (POST /api/public/business-audit, action "probe") reaches runPresenceAudit,
 * which fetches a caller-supplied URL server-side. Validation previously only
 * checked the scheme, so an unauthenticated caller could probe cloud instance
 * metadata, localhost, or RFC1918 space and infer internal state from the
 * status, timing and final URL.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = () =>
  import(
    pathToFileURL(
      path.join(
        __dirname,
        "../packages/platform-core/src/command-centre/growth-engine/ssrf-guard.ts",
      ),
    ).href
  );

describe("SSRF guard: address classification", () => {
  it("blocks cloud metadata and loopback", async () => {
    const { isBlockedIpAddress } = await load();

    assert.equal(isBlockedIpAddress("169.254.169.254"), true, "GCP/AWS metadata");
    assert.equal(isBlockedIpAddress("127.0.0.1"), true);
    assert.equal(isBlockedIpAddress("::1"), true);
    assert.equal(isBlockedIpAddress("0.0.0.0"), true);
  });

  it("blocks RFC1918 and CGNAT ranges", async () => {
    const { isBlockedIpAddress } = await load();

    for (const ip of [
      "10.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "100.64.0.1",
    ]) {
      assert.equal(isBlockedIpAddress(ip), true, ip);
    }
  });

  it("blocks IPv6 private, link-local and IPv4-mapped private", async () => {
    const { isBlockedIpAddress } = await load();

    assert.equal(isBlockedIpAddress("fe80::1"), true);
    assert.equal(isBlockedIpAddress("fd00::1"), true);
    assert.equal(isBlockedIpAddress("::ffff:169.254.169.254"), true);
    assert.equal(isBlockedIpAddress("::ffff:10.0.0.1"), true);
  });

  it("allows ordinary public addresses", async () => {
    const { isBlockedIpAddress } = await load();

    assert.equal(isBlockedIpAddress("8.8.8.8"), false);
    assert.equal(isBlockedIpAddress("1.1.1.1"), false);
    assert.equal(isBlockedIpAddress("2606:4700:4700::1111"), false);
  });

  it("treats anything unparseable as blocked", async () => {
    const { isBlockedIpAddress } = await load();

    assert.equal(isBlockedIpAddress("not-an-ip"), true);
    assert.equal(isBlockedIpAddress(""), true);
  });
});

describe("SSRF guard: URL targets", () => {
  it("refuses non-http schemes", async () => {
    const { assertPublicHttpTarget } = await load();

    for (const url of [
      "file:///etc/passwd",
      "gopher://example.com/",
      "ftp://example.com/",
    ]) {
      const result = await assertPublicHttpTarget(url);
      assert.equal(result.allowed, false, url);
      assert.equal(result.reason, "unsupported_scheme");
    }
  });

  it("refuses literal private and metadata addresses without DNS", async () => {
    const { assertPublicHttpTarget } = await load();

    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "http://127.0.0.1:3000/api/v1/contacts",
      "http://10.0.0.5/",
      "http://[::1]:8080/",
    ]) {
      const result = await assertPublicHttpTarget(url);
      assert.equal(result.allowed, false, url);
      assert.equal(result.reason, "private_address");
    }
  });

  it("refuses internal hostnames by name", async () => {
    const { assertPublicHttpTarget } = await load();

    for (const url of [
      "http://localhost/",
      "http://metadata.google.internal/",
      "http://db.internal/",
      "http://foo.localhost/",
    ]) {
      const result = await assertPublicHttpTarget(url);
      assert.equal(result.allowed, false, url);
      assert.equal(result.reason, "blocked_hostname");
    }
  });

  it("refuses malformed URLs", async () => {
    const { assertPublicHttpTarget } = await load();

    const result = await assertPublicHttpTarget("not a url");
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "invalid_url");
  });

  it("fails closed on an unresolvable host rather than probing it", async () => {
    const { assertPublicHttpTarget } = await load();

    const result = await assertPublicHttpTarget(
      "https://this-host-should-not-resolve.invalid/",
    );
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "unresolvable_host");
  });
});

describe("SSRF guard: redirect hops", () => {
  it("re-validates every hop, so a public redirector cannot reach metadata", async () => {
    const { safeExternalFetch, BlockedTargetError } = await load();

    const originalFetch = globalThis.fetch;
    const seen = [];
    globalThis.fetch = async (url) => {
      seen.push(String(url));
      // A public host that redirects into cloud metadata — the exact bypass
      // that defeats validating only the initial URL.
      return new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      });
    };

    try {
      await assert.rejects(
        safeExternalFetch("https://example.com/"),
        (err) => err instanceof BlockedTargetError && err.reason === "private_address",
      );
      assert.equal(seen.length, 1, "must not follow the redirect to the blocked host");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("follows ordinary public redirects", async () => {
    const { safeExternalFetch } = await load();

    const originalFetch = globalThis.fetch;
    let call = 0;
    globalThis.fetch = async () => {
      call += 1;
      if (call === 1) {
        return new Response(null, {
          status: 301,
          headers: { location: "https://example.org/final" },
        });
      }
      return new Response("ok", { status: 200 });
    };

    try {
      const res = await safeExternalFetch("https://example.com/");
      assert.equal(res.status, 200);
      assert.equal(call, 2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("stops rather than looping on a redirect cycle", async () => {
    const { safeExternalFetch, BlockedTargetError } = await load();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/loop" },
      });

    try {
      await assert.rejects(
        safeExternalFetch("https://example.com/loop"),
        (err) => err instanceof BlockedTargetError && err.reason === "too_many_redirects",
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
