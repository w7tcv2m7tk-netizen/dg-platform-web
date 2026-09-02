/**
 * Clerk ↔ Neon environment pairing — approved and blocked matrix coverage.
 * Canonical module: scripts/env-pairing.mjs
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyClerkEnvironment,
  classifyNeonHost,
  evaluateEnvironmentPairing,
  isClerkNeonPairingAllowed,
  assertEnvironmentPairingOrThrow,
  NEON_ENDPOINT_ALLOWLIST,
} from "./env-pairing.mjs";

const PROD_HOST = "ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech";
const DEV_HOST = "ep-round-sunset-a72e5yr8.ap-southeast-2.aws.neon.tech";
const PREVIEW_HOST = "ep-ancient-shape-a71q6o9p.ap-southeast-2.aws.neon.tech";
const BACKUP_HOST = "ep-lively-water-a7y92kwa.ap-southeast-2.aws.neon.tech";
const UNKNOWN_HOST = "ep-totally-unknown-zzzzzzzz.ap-southeast-2.aws.neon.tech";

/** Build a fake DATABASE_URL — tests never print this. */
function dbUrl(host) {
  return `postgresql://user:secret@${host}/neondb?sslmode=require`;
}

function clerkDev() {
  return {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
    CLERK_SECRET_KEY: "sk_test_example",
  };
}

function clerkProd() {
  return {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
    CLERK_SECRET_KEY: "sk_live_example",
  };
}

describe("classifyNeonHost", () => {
  it("classifies production, development, and preview allowlisted hosts", () => {
    assert.equal(classifyNeonHost(dbUrl(PROD_HOST)).class, "production");
    assert.equal(classifyNeonHost(dbUrl(DEV_HOST)).class, "development");
    assert.equal(classifyNeonHost(dbUrl(PREVIEW_HOST)).class, "preview");
  });

  it("normalises pooler and compute-binding hostnames", () => {
    assert.equal(
      classifyNeonHost(dbUrl("ep-bold-tree-a7bny92m-pooler.ap-southeast-2.aws.neon.tech")).class,
      "production",
    );
    assert.equal(
      classifyNeonHost(dbUrl("ep-round-sunset-a72e5yr8-f6x.ap-southeast-2.aws.neon.tech")).class,
      "development",
    );
    assert.equal(
      classifyNeonHost(dbUrl("ep-ancient-shape-a71q6o9p-clc-pooler.ap-southeast-2.aws.neon.tech")).class,
      "preview",
    );
  });

  it("does not use the database name for classification", () => {
    const productionNamedDev = `postgresql://u:p@${PROD_HOST}/development?sslmode=require`;
    const developmentNamedProd = `postgresql://u:p@${DEV_HOST}/production?sslmode=require`;
    assert.equal(classifyNeonHost(productionNamedDev).class, "production");
    assert.equal(classifyNeonHost(developmentNamedProd).class, "development");
  });

  it("treats backup and unknown hosts as unknown", () => {
    assert.equal(classifyNeonHost(dbUrl(BACKUP_HOST)).class, "unknown");
    assert.equal(classifyNeonHost(dbUrl(UNKNOWN_HOST)).class, "unknown");
  });

  it("allows ephemeral preview endpoints via DG_NEON_PREVIEW_ENDPOINTS", () => {
    const ephemeral = "ep-shiny-morning-a7u4k6fo";
    const r = classifyNeonHost(dbUrl(`${ephemeral}.ap-southeast-2.aws.neon.tech`), {
      DG_NEON_PREVIEW_ENDPOINTS: ephemeral,
    });
    assert.equal(r.class, "preview");
    assert.equal(r.endpointId, ephemeral);
  });
});

describe("classifyClerkEnvironment", () => {
  it("maps test keys to development and live keys to production", () => {
    assert.equal(classifyClerkEnvironment(clerkDev()).class, "development");
    assert.equal(classifyClerkEnvironment(clerkProd()).class, "production");
  });

  it("blocks mismatched publishable/secret environments", () => {
    const r = classifyClerkEnvironment({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x",
      CLERK_SECRET_KEY: "sk_test_x",
    });
    assert.equal(r.class, "unknown");
  });
});

describe("isClerkNeonPairingAllowed matrix", () => {
  it("allows approved combinations", () => {
    assert.equal(isClerkNeonPairingAllowed("development", "development"), true);
    assert.equal(isClerkNeonPairingAllowed("development", "preview"), true);
    assert.equal(isClerkNeonPairingAllowed("production", "production"), true);
  });

  it("blocks disallowed combinations", () => {
    assert.equal(isClerkNeonPairingAllowed("production", "development"), false);
    assert.equal(isClerkNeonPairingAllowed("production", "preview"), false);
    assert.equal(isClerkNeonPairingAllowed("development", "production"), false);
    assert.equal(isClerkNeonPairingAllowed("production", "unknown"), false);
    assert.equal(isClerkNeonPairingAllowed("development", "unknown"), false);
  });
});

describe("evaluateEnvironmentPairing — ALLOW", () => {
  it("Clerk Development × Neon Development", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(DEV_HOST),
      DG_NEON_ENV: "development",
    });
    assert.equal(r.ok, true, r.errors.join("; "));
  });

  it("Clerk Development × Neon Preview", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(PREVIEW_HOST),
      DG_NEON_ENV: "preview",
    });
    assert.equal(r.ok, true, r.errors.join("; "));
  });

  it("Clerk Production × Neon Production", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkProd(),
      DATABASE_URL: dbUrl(PROD_HOST),
      DG_NEON_ENV: "production",
    });
    assert.equal(r.ok, true, r.errors.join("; "));
  });
});

describe("evaluateEnvironmentPairing — BLOCK", () => {
  it("Production × Development", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkProd(),
      DATABASE_URL: dbUrl(DEV_HOST),
      DG_NEON_ENV: "development",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /pairing is not allowed/i.test(e)));
  });

  it("Production × Preview", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkProd(),
      DATABASE_URL: dbUrl(PREVIEW_HOST),
      DG_NEON_ENV: "preview",
    });
    assert.equal(r.ok, false);
  });

  it("Production × unknown/non-prod (backup host)", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkProd(),
      DATABASE_URL: dbUrl(BACKUP_HOST),
      DG_NEON_ENV: "production",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /unknown/i.test(e)));
  });

  it("Development × Production", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(PROD_HOST),
      DG_NEON_ENV: "production",
    });
    assert.equal(r.ok, false);
  });

  it("Development × unknown/backup/other", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(BACKUP_HOST),
      DG_NEON_ENV: "development",
    });
    assert.equal(r.ok, false);
  });

  it("missing DG_NEON_ENV", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(DEV_HOST),
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /DG_NEON_ENV missing/i.test(e)));
  });

  it("DG_NEON_ENV disagrees with host classification", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(DEV_HOST),
      DG_NEON_ENV: "preview",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /disagrees/i.test(e)));
  });

  it("invalid DG_NEON_ENV value", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(DEV_HOST),
      DG_NEON_ENV: "staging",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /invalid/i.test(e)));
  });

  it("unknown Neon host even when DG_NEON_ENV claims preview", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: dbUrl(UNKNOWN_HOST),
      DG_NEON_ENV: "preview",
    });
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => /unknown/i.test(e)));
  });

  it("unparseable DATABASE_URL", () => {
    const r = evaluateEnvironmentPairing({
      ...clerkDev(),
      DATABASE_URL: "not-a-url",
      DG_NEON_ENV: "development",
    });
    assert.equal(r.ok, false);
  });
});

describe("assertEnvironmentPairingOrThrow", () => {
  it("does not throw when skipped (empty env)", () => {
    assert.doesNotThrow(() => assertEnvironmentPairingOrThrow({}));
  });

  it("throws with safe message (no credentials) on block", () => {
    assert.throws(
      () =>
        assertEnvironmentPairingOrThrow({
          ...clerkProd(),
          DATABASE_URL: dbUrl(DEV_HOST),
          DG_NEON_ENV: "development",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Environment pairing blocked/);
        assert.doesNotMatch(err.message, /secret|postgresql:\/\//i);
        return true;
      },
    );
  });
});

describe("allowlist integrity", () => {
  it("exports non-secret endpoint ids only", () => {
    for (const ids of Object.values(NEON_ENDPOINT_ALLOWLIST)) {
      for (const id of ids) {
        assert.match(id, /^ep-[a-z0-9-]+$/i);
      }
    }
  });
});
