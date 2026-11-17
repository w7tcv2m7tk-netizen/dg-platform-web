import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveClerkAuthorizedParties } from "../src/lib/clerk-authorized-parties.ts";

test("authorizes the exact Vercel Preview deployment origin", () => {
  const parties = resolveClerkAuthorizedParties({
    VERCEL_ENV: "preview",
    VERCEL_URL: "dg-checkout-verification-20261012-q8kjflts8.vercel.app",
    NEXT_PUBLIC_APP_URL: "https://dg-checkout-verification-preview-20261012.vercel.app",
  });

  assert.ok(parties.includes("https://dg-checkout-verification-20261012-q8kjflts8.vercel.app"));
  assert.ok(parties.includes("https://dg-checkout-verification-preview-20261012.vercel.app"));
  assert.ok(!parties.some((party) => party.includes("*")));
});

test("does not allow sibling Preview hosts implicitly", () => {
  const parties = resolveClerkAuthorizedParties({
    VERCEL_ENV: "preview",
    VERCEL_URL: "dg-checkout-verification-20261012-q8kjflts8.vercel.app",
  });

  assert.ok(parties.includes("https://dg-checkout-verification-20261012-q8kjflts8.vercel.app"));
  assert.ok(!parties.includes("https://dg-checkout-verification-20261012-another.vercel.app"));
});

test("does not add a deployment-specific host outside Preview", () => {
  const parties = resolveClerkAuthorizedParties({
    VERCEL_ENV: "production",
    VERCEL_URL: "dg-checkout-verification-20261012-q8kjflts8.vercel.app",
  });

  assert.ok(!parties.includes("https://dg-checkout-verification-20261012-q8kjflts8.vercel.app"));
});

test("rejects non-Vercel and malformed deployment URLs", () => {
  for (const VERCEL_URL of ["attacker.example", "http://fake.vercel.app", "fake.vercel.app/path", "bad host.vercel.app"]) {
    const parties = resolveClerkAuthorizedParties({ VERCEL_ENV: "preview", VERCEL_URL });
    assert.ok(!parties.includes(`https://${VERCEL_URL}`));
  }
});

test("middleware uses the exact-origin allowlist helper", () => {
  const middleware = readFileSync("src/middleware.ts", "utf8");
  assert.match(middleware, /authorizedParties\s*=\s*resolveClerkAuthorizedParties\(\)/);
});
