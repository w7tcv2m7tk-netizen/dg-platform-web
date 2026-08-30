/**
 * H-3 regression — subscription entitlement must actually gate writes.
 *
 * Previously `assertEntitlement` was called at four routes and never with
 * "write", so a SUSPENDED organisation could mutate tenant data through every
 * normal CRUD endpoint. Separately, both "no subscription row" and "the lookup
 * threw" resolved to FULL, so a database failure granted unrestricted access.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadCore = (rel) =>
  import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel)).href
  );
const loadGate = () =>
  import(
    pathToFileURL(path.join(__dirname, "../src/lib/entitlement-gate-rules.ts")).href
  );

describe("H-3: capability matrix reflects the subscription lifecycle", () => {
  it("permits writes while ACTIVE, TRIALING and cancelling at period end", async () => {
    const { capabilitiesForEntitlement, entitlementFromCommercialStatus } =
      await loadCore("billing/subscription-types.ts");

    for (const status of ["ACTIVE", "TRIALING", "CANCEL_AT_PERIOD_END"]) {
      const level = entitlementFromCommercialStatus(status);
      assert.equal(level, "FULL", `${status} should be FULL`);
      assert.equal(capabilitiesForEntitlement(level).canWrite, true);
    }
  });

  it("keeps RESTRICTED writable per the existing dunning design", async () => {
    const { capabilitiesForEntitlement, entitlementFromCommercialStatus } =
      await loadCore("billing/subscription-types.ts");

    // RESTRICTED intentionally still writes; it loses AI and paid activation.
    const level = entitlementFromCommercialStatus("RESTRICTED");
    assert.equal(level, "MOSTLY_FULL");
    const caps = capabilitiesForEntitlement(level);
    assert.equal(caps.canWrite, true);
    assert.equal(caps.canUseAi, false);
    assert.equal(caps.canActivatePaidApps, false);
  });

  it("blocks writes when SUSPENDED but keeps view, export and billing", async () => {
    const { capabilitiesForEntitlement, entitlementFromCommercialStatus } =
      await loadCore("billing/subscription-types.ts");

    const level = entitlementFromCommercialStatus("SUSPENDED");
    assert.equal(level, "READ_ONLY");
    const caps = capabilitiesForEntitlement(level);
    assert.equal(caps.canWrite, false);
    assert.equal(caps.canView, true);
    assert.equal(caps.canExport, true);
    assert.equal(caps.canBilling, true);
  });

  it("blocks writes when CANCELLED", async () => {
    const { capabilitiesForEntitlement, entitlementFromCommercialStatus } =
      await loadCore("billing/subscription-types.ts");

    const level = entitlementFromCommercialStatus("CANCELLED");
    assert.equal(level, "NONE");
    assert.equal(capabilitiesForEntitlement(level).canWrite, false);
    // Billing stays reachable so the organisation can resubscribe.
    assert.equal(capabilitiesForEntitlement(level).canBilling, true);
  });
});

describe("H-3: write gate routing", () => {
  it("only gates mutating methods", async () => {
    const { isMutatingMethod } = await loadGate();

    for (const method of ["POST", "PUT", "PATCH", "DELETE", "post", "patch"]) {
      assert.equal(isMutatingMethod(method), true, method);
    }
    for (const method of ["GET", "HEAD", "OPTIONS", "get"]) {
      assert.equal(isMutatingMethod(method), false, method);
    }
  });

  it("exempts the paths a suspended organisation needs to recover", async () => {
    const { isWriteGateExemptPath } = await loadGate();

    const mustWork = [
      "/api/v1/billing/checkout",
      "/api/v1/billing/portal",
      "/api/v1/onboarding/gen2",
      "/api/v1/org/switch",
      "/api/v1/org/create",
      "/api/v1/support/messages",
      "/api/v1/founding/onboarding/submit",
    ];
    for (const p of mustWork) {
      assert.equal(isWriteGateExemptPath(p), true, `${p} must stay usable`);
    }
  });

  it("does not exempt ordinary tenant mutations", async () => {
    const { isWriteGateExemptPath } = await loadGate();

    const mustBeGated = [
      "/api/v1/contacts",
      "/api/v1/tasks",
      "/api/v1/commerce/invoices",
      "/api/v1/websites",
      "/api/v1/accommodation",
      "/api/v1/properties",
      "/api/v1/communications/messages",
      // Tenant-facing prospecting lives under /command/ but is not an
      // operator surface — operators pass via platform authority instead.
      "/api/v1/command/growth/prospects",
      "/api/v1/admin/partners/abc/approve",
    ];
    for (const p of mustBeGated) {
      assert.equal(isWriteGateExemptPath(p), false, `${p} must be gated`);
    }
  });
});

describe("H-3: entitlement resolution does not fail open", () => {
  /** Build a resolver whose store is stubbed via module env, then restore. */
  async function withEnv(fn) {
    const saved = process.env.DATABASE_URL;
    try {
      return await fn();
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = saved;
    }
  }

  it("treats an unconfigured/unreadable subscription store as read-only", async () => {
    await withEnv(async () => {
      delete process.env.DATABASE_URL;
      const { resolveEntitlement } = await loadCore(
        "billing/entitlement-resolver.ts",
      );

      const result = await resolveEntitlement("org_any");
      assert.equal(result.source, "lookup_failed");
      assert.equal(result.level, "READ_ONLY");
      assert.equal(result.capabilities.canWrite, false);
      // Still able to see data and fix billing.
      assert.equal(result.capabilities.canView, true);
      assert.equal(result.capabilities.canBilling, true);
    });
  });

  it("blocks writes via assertEntitlement when the lookup fails", async () => {
    await withEnv(async () => {
      delete process.env.DATABASE_URL;
      const { assertEntitlement } = await loadCore(
        "billing/entitlement-resolver.ts",
      );

      const gate = await assertEntitlement("org_any", "write");
      assert.equal(gate.ok, false);
      assert.equal(gate.entitlement.source, "lookup_failed");

      const billing = await assertEntitlement("org_any", "billing");
      assert.equal(billing.ok, true, "billing recovery must remain possible");
    });
  });

  it("distinguishes a missing subscription from a failed lookup", async () => {
    const { getPlatformSubscriptionResult } = await loadCore(
      "billing/subscription-store.ts",
    );

    const saved = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      const result = await getPlatformSubscriptionResult("org_any");
      assert.equal(result.ok, false);
      assert.equal(result.reason, "not_configured");
    } finally {
      if (saved === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = saved;
    }
  });
});
