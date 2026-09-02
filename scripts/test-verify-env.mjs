/**
 * Environment verifier regression coverage — proves scripts/verify-env.mjs
 * behaves correctly for safe AND unsafe configurations, and enforces the
 * production gate. See docs/foundations/ENVIRONMENT-PARITY.md.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateEnv } from "./verify-env.mjs";

const safeProd = {
  DATABASE_URL: "postgres://prod",
  CLERK_SECRET_KEY: "sk_live_xxx",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_xxx",
  CLERK_WEBHOOK_SIGNING_SECRET: "whsec_xxx",
  NEXT_PUBLIC_APP_URL: "https://app.digitalgate.com.au",
  DG_SETTINGS_ENCRYPTION_KEY: "k",
  DG_COMMAND_CENTRE_ORG_IDS: "org_operator",
  CRON_SECRET: "cron",
};

const hasError = (r, needle) => r.errors.some((e) => e.includes(needle));

describe("verify-env: safe production configuration passes", () => {
  it("all required present, no prohibited => ok", () => {
    const r = evaluateEnv(safeProd, { production: true });
    assert.equal(r.ok, true, `expected ok, got errors: ${r.errors.join("; ")}`);
    assert.equal(r.errors.length, 0);
  });
});

describe("verify-env: unsafe production configuration fails", () => {
  it("flags plaintext-secrets flag, test keys, and missing prod-required key", () => {
    const unsafe = {
      ...safeProd,
      DG_SETTINGS_ENCRYPTION_KEY: "", // missing prod-required
      CLERK_SECRET_KEY: "sk_test_xxx", // test key in prod
      DG_ALLOW_PLAINTEXT_SECRETS: "1", // never-in-prod
    };
    const r = evaluateEnv(unsafe, { production: true });
    assert.equal(r.ok, false);
    assert.ok(hasError(r, "DG_SETTINGS_ENCRYPTION_KEY"), "missing encryption key not flagged");
    assert.ok(hasError(r, "DG_ALLOW_PLAINTEXT_SECRETS"), "plaintext flag not prohibited");
    assert.ok(hasError(r, "CLERK_SECRET_KEY"), "test Clerk key not prohibited in prod");
  });

  it("flags sandbox connector mode + Stripe test key in production", () => {
    const r = evaluateEnv(
      { ...safeProd, DREAMSCAPE_SOAP_ENV: "sandbox", STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_x" },
      { production: true },
    );
    assert.equal(r.ok, false);
    assert.ok(hasError(r, "DREAMSCAPE_SOAP_ENV"), "sandbox mode not prohibited");
    assert.ok(hasError(r, "STRIPE_SECRET_KEY"), "stripe test key not prohibited");
  });
});

describe("verify-env: feature-gated secrets", () => {
  it("requires STRIPE_WEBHOOK_SECRET in production when STRIPE_SECRET_KEY is set", () => {
    const r = evaluateEnv({ ...safeProd, STRIPE_SECRET_KEY: "sk_live_x" }, { production: true });
    assert.equal(r.ok, false);
    assert.ok(hasError(r, "STRIPE_WEBHOOK_SECRET"), "stripe webhook secret not required");
  });

  it("no Stripe configured => no Stripe requirement", () => {
    const r = evaluateEnv(safeProd, { production: true });
    assert.equal(r.ok, true);
  });
});

describe("verify-env: local (non-production) is lenient about prod-only rules", () => {
  it("test keys allowed and prod-required keys not enforced locally", () => {
    const local = {
      DATABASE_URL: "postgres://local",
      CLERK_SECRET_KEY: "sk_test_x",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x",
      CLERK_WEBHOOK_SIGNING_SECRET: "whsec_x",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DG_ALLOW_PLAINTEXT_SECRETS: "1",
    };
    const r = evaluateEnv(local, { production: false });
    assert.equal(r.ok, true, `local should pass, got: ${r.errors.join("; ")}`);
  });

  it("base-required is enforced in every environment", () => {
    const r = evaluateEnv({}, { production: false });
    assert.equal(r.ok, false);
    assert.ok(hasError(r, "DATABASE_URL"));
    assert.ok(hasError(r, "CLERK_SECRET_KEY"));
  });
});
