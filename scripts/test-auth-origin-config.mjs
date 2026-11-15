import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(env) {
  const exports = {};
  const source = ts.transpileModule(readFileSync("src/lib/same-origin.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    process: { env },
    URL,
    Request,
    require: name => { throw new Error("Unexpected import " + name); },
  });
  return exports;
}

function request(env, url, origin, fetchSite = "same-origin") {
  const api = load(env);
  return api.isTrustedSameOriginRequest(new Request(url, {
    method: "POST",
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(fetchSite ? { "Sec-Fetch-Site": fetchSite } : {}),
    },
  }));
}

test("production trusts only fixed, explicit HTTPS origins", () => {
  const api = load({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "https://app.digitalgate.com.au" });
  const origins = api.trustedAppOrigins();
  assert.ok(origins.has("https://app.digitalgate.com.au"));
  assert.ok(origins.has("https://dg-platform-web.vercel.app"));
  assert.ok(!origins.has("http://localhost:3000"));
  assert.deepEqual(Array.from(api.authorizedClerkOrigins()).sort(), Array.from(origins).sort());
});

test("preview adds only the exact deployment and branch origins", () => {
  const env = {
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    VERCEL_URL: "dg-platform-web-git-feature-team.vercel.app",
    VERCEL_BRANCH_URL: "dg-platform-web-git-feature-team.vercel.app",
    NEXT_PUBLIC_APP_URL: "https://app.digitalgate.com.au",
  };
  const origins = load(env).trustedAppOrigins();
  assert.ok(origins.has("https://dg-platform-web-git-feature-team.vercel.app"));
  assert.ok(!origins.has("https://attacker.vercel.app"));
  assert.ok(!origins.has("https://dg-platform-web-git-feature-team.vercel.app.evil.test"));
});

test("explicit trusted origins reject wildcards, paths, credentials and malformed values", () => {
  const origins = load({
    NODE_ENV: "production",
    NEXT_PUBLIC_APP_URL: "https://app.digitalgate.com.au",
    DG_TRUSTED_ORIGINS: [
      "https://preview.example.test",
      "https://*.example.test",
      "https://preview.example.test/path",
      "https://user:pass@preview.example.test",
      "javascript:alert(1)",
      "http://preview.example.test",
      "not a url",
    ].join(","),
  }).trustedAppOrigins();
  assert.ok(origins.has("https://preview.example.test"));
  for (const value of [
    "https://*.example.test",
    "https://preview.example.test/path",
    "https://user:pass@preview.example.test",
    "javascript:alert(1)",
    "http://preview.example.test",
  ]) {
    assert.ok(!origins.has(value), `unexpected trusted origin ${value}`);
  }
});

test("local development permits localhost but still rejects arbitrary hosts", () => {
  const api = load({ NODE_ENV: "development", NEXT_PUBLIC_APP_URL: "http://localhost:3000" });
  const origins = api.trustedAppOrigins();
  assert.ok(origins.has("http://localhost:3000"));
  assert.ok(!origins.has("http://localhost:3001"));
  assert.ok(!origins.has("http://127.0.0.1:3000"));
});

test("same-origin requests require exact trusted Origin and same-origin fetch metadata", () => {
  const env = {
    NODE_ENV: "production",
    VERCEL_ENV: "preview",
    VERCEL_URL: "dg-platform-web-git-feature-team.vercel.app",
  };
  const trusted = "https://dg-platform-web-git-feature-team.vercel.app";
  const url = `${trusted}/api/v1/org/switch`;
  assert.equal(request(env, url, trusted), true);
  assert.equal(request(env, url, trusted, null), true);
  assert.equal(request(env, url, null), false);
  assert.equal(request(env, url, "https://attacker.example.test"), false);
  assert.equal(request(env, url, trusted, "cross-site"), false);
  assert.equal(request(env, url, trusted, "same-site"), false);
  assert.equal(request(env, "https://other.example.test/api/v1/org/switch", trusted), false);
  assert.equal(request(env, url, "https://dg-platform-web-git-feature-team.vercel.app.evil.test"), false);
});
