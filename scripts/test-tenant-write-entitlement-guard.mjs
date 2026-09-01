/**
 * H-3 gap closure — reusable tenant write-entitlement guard applied to
 * authenticated mutation surfaces OUTSIDE the /api/v1 funnel (the marketing SEO
 * audit Server Action and the authenticated connector connect/callback writes).
 *
 * The guard (`tenantWriteEntitlementBlock`) is the single source of truth: it
 * runs the same `checkTenantWriteEntitlement` -> `writeBlockFor` path as the
 * /api/v1 gate, so the block mapping cannot diverge between entry points. These
 * tests exercise the guard with an injected subscription fetcher (no DB) and
 * assert the /api/v1 policy (reads + exempt recovery paths) is unchanged.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const loadLib = (rel) =>
  import(pathToFileURL(path.join(root, "src/lib", rel)).href);

const ENV = "DG_COMMAND_CENTRE_ORG_IDS";
const OPERATOR_ORG = "org_operator_cuid";
const TENANT_ORG = "org_tenant_cuid";

// Subscription rows (shape consumed by writeEntitlementForSubscription).
const suspended = { status: "SUSPENDED", foundingCustomer: false, platformExempt: false };
const trialing = { status: "TRIALING", foundingCustomer: false, platformExempt: false };
const foundingSuspended = { status: "SUSPENDED", foundingCustomer: true, platformExempt: false };
const exemptSuspended = { status: "SUSPENDED", foundingCustomer: false, platformExempt: true };

const fetchOf = (row) => async () => row;
const throwingFetch = () => {
  throw new Error("db down");
};

const BLOCK_READ_ONLY = {
  status: 403,
  code: "entitlement_write_blocked",
  message: "This organisation's subscription is read-only. Update billing to resume changes.",
};
const BLOCK_UNAVAILABLE = {
  status: 503,
  code: "entitlement_unavailable",
  message: "Unable to verify subscription entitlement; writes are temporarily blocked.",
};

let saved;
beforeEach(() => {
  saved = process.env[ENV];
  delete process.env[ENV];
});
afterEach(() => {
  if (saved === undefined) delete process.env[ENV];
  else process.env[ENV] = saved;
});

describe("tenantWriteEntitlementBlock: permitted entitlement states keep writing", () => {
  it("no subscription (pre-checkout / trial) allows the write", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(null)), null);
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(trialing)), null);
  });

  it("founding / platform-exempt organisations always allow the write", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(foundingSuspended)), null);
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(exemptSuspended)), null);
  });
});

describe("tenantWriteEntitlementBlock: read-only / suspended tenants are blocked", () => {
  it("suspended subscription => 403 entitlement_write_blocked", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.deepEqual(
      await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(suspended)),
      BLOCK_READ_ONLY,
    );
  });

  it("works for the org-only actor form used by connector callbacks", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    // Callbacks pass just { organisationId } from the signed OAuth state.
    assert.deepEqual(
      await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(suspended)),
      BLOCK_READ_ONLY,
    );
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, fetchOf(null)), null);
  });
});

describe("tenantWriteEntitlementBlock: entitlement lookup failure fails closed", () => {
  it("subscription lookup throwing => 503 entitlement_unavailable", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.deepEqual(
      await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG }, throwingFetch),
      BLOCK_UNAVAILABLE,
    );
  });
});

describe("tenantWriteEntitlementBlock: platform operators are never tenants (C-2)", () => {
  it("operator org (allowlist) is exempt without consulting the subscription", async () => {
    process.env[ENV] = OPERATOR_ORG;
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    // The fetcher throws if called — proving the operator short-circuits first.
    assert.equal(
      await tenantWriteEntitlementBlock({ organisationId: OPERATOR_ORG, role: "owner" }, throwingFetch),
      null,
    );
  });

  it("dg:staff role is exempt without consulting the subscription", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.equal(
      await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG, role: "dg:staff" }, throwingFetch),
      null,
    );
  });

  it("an API-key principal in the operator org does NOT inherit the exemption", async () => {
    process.env[ENV] = OPERATOR_ORG;
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    // api_key:* principals are clamped to non-operator (#18), so the tenant gate
    // still applies to a credential minted for the operator org.
    assert.deepEqual(
      await tenantWriteEntitlementBlock(
        { organisationId: OPERATOR_ORG, role: "admin", clerkUserId: "api_key:key_1" },
        fetchOf(suspended),
      ),
      BLOCK_READ_ONLY,
    );
  });
});

describe("H-3 /api/v1 policy unchanged: reads and exempt recovery paths", () => {
  it("normal reads are never gated", async () => {
    const { isWriteMethod } = await loadLib("write-entitlement-policy.ts");
    const { shouldCheckTenantWriteEntitlement } = await loadLib("write-entitlement-policy.ts");
    for (const m of ["GET", "HEAD", "OPTIONS"]) assert.equal(isWriteMethod(m), false);
    assert.equal(
      shouldCheckTenantWriteEntitlement({ method: "GET", isPlatformOperator: false, pathname: "/api/v1/companies" }),
      false,
    );
  });

  it("billing / recovery / onboarding exemptions remain unaffected", async () => {
    const { isWriteEntitlementExempt, shouldCheckTenantWriteEntitlement } = await loadLib(
      "write-entitlement-policy.ts",
    );
    for (const p of [
      "/api/v1/billing/checkout",
      "/api/v1/billing/portal",
      "/api/v1/org/switch",
      "/api/v1/org/create",
      "/api/v1/onboarding/gen2",
      "/api/v1/founding/onboarding",
      "/api/v1/founding/onboarding/submit",
    ]) {
      assert.equal(isWriteEntitlementExempt(p), true, p);
      assert.equal(
        shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: false, pathname: p }),
        false,
        p,
      );
    }
    // A non-exempt tenant write is still gated.
    assert.equal(
      shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: false, pathname: "/api/v1/companies" }),
      true,
    );
  });
});
