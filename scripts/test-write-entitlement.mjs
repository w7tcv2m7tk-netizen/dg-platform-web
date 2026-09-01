/**
 * H-3 central write-entitlement enforcement.
 *
 * Reads are never affected. Tenant writes are blocked when the organisation's
 * subscription is read-only/suspended; a missing subscription keeps the existing
 * pre-checkout/trial behaviour (FULL); a subscription lookup FAILURE fails closed
 * for writes. Platform operators and explicit recovery/billing/onboarding paths
 * are exempt. Authority (C-1/C-2/C-3) is untouched.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const loadCore = (rel) =>
  import(pathToFileURL(path.join(root, "packages/platform-core/src", rel)).href);
const loadLib = (rel) =>
  import(pathToFileURL(path.join(root, "src/lib", rel)).href);

const OPERATOR_ORG = "cmsfkd6n50000ju046to0po60";
const TENANT_ORG = "org_tenant_cuid";
const ENV = "DG_COMMAND_CENTRE_ORG_IDS";

let saved;
beforeEach(() => {
  saved = process.env[ENV];
  delete process.env[ENV];
});
afterEach(() => {
  if (saved === undefined) delete process.env[ENV];
  else process.env[ENV] = saved;
});

const suspended = { status: "SUSPENDED", foundingCustomer: false, platformExempt: false };
const trialing = { status: "TRIALING", foundingCustomer: false, platformExempt: false };
const foundingSuspended = { status: "SUSPENDED", foundingCustomer: true, platformExempt: false };
const exemptSuspended = { status: "SUSPENDED", foundingCustomer: false, platformExempt: true };

describe("H-3 policy: methods, exempt paths, block mapping", () => {
  it("classifies write methods and leaves reads alone", async () => {
    const { isWriteMethod } = await loadLib("write-entitlement-policy.ts");
    for (const m of ["POST", "PUT", "PATCH", "DELETE", "post", "patch"]) assert.equal(isWriteMethod(m), true);
    for (const m of ["GET", "HEAD", "OPTIONS"]) assert.equal(isWriteMethod(m), false);
  });

  it("exempts only the exact recovery/billing/onboarding paths (never /command or /admin)", async () => {
    const { isWriteEntitlementExempt } = await loadLib("write-entitlement-policy.ts");
    for (const p of [
      "/api/v1/billing/checkout",
      "/api/v1/billing/portal",
      "/api/v1/org/switch",
      "/api/v1/org/create",
      "/api/v1/onboarding/gen2",
      "/api/v1/founding/onboarding",
      "/api/v1/founding/onboarding/submit",
    ]) assert.equal(isWriteEntitlementExempt(p), true, p);
    for (const p of [
      "/api/v1/companies",
      "/api/v1/commerce/invoices",
      "/api/v1/command/growth/prospects",
      "/api/v1/command/flags",
      "/api/v1/admin/partners/x/suspend",
      "/api/v1/org/apps",
    ]) assert.equal(isWriteEntitlementExempt(p), false, p);
  });

  it("shouldCheckTenantWriteEntitlement: skip reads/operators/exempt, gate tenant writes", async () => {
    const { shouldCheckTenantWriteEntitlement } = await loadLib("write-entitlement-policy.ts");
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "GET", isPlatformOperator: false, pathname: "/api/v1/companies" }), false);
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: true, pathname: "/api/v1/companies" }), false);
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: false, pathname: "/api/v1/billing/checkout" }), false);
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: false, pathname: "/api/v1/companies" }), true);
    // A tenant write under /command is still gated (no bypass).
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: false, pathname: "/api/v1/command/growth/prospects" }), true);
  });

  it("maps entitlement results to fail-closed responses", async () => {
    const { writeBlockFor } = await loadLib("write-entitlement-policy.ts");
    assert.equal(writeBlockFor({ decision: "allow" }), null);
    assert.deepEqual(writeBlockFor({ decision: "block", reason: "read_only" }), {
      status: 403, code: "entitlement_write_blocked",
      message: "This organisation's subscription is read-only. Update billing to resume changes.",
    });
    assert.deepEqual(writeBlockFor({ decision: "block", reason: "lookup_failed" }), {
      status: 503, code: "entitlement_unavailable",
      message: "Unable to verify subscription entitlement; writes are temporarily blocked.",
    });
  });
});

describe("H-3 decision engine: writeEntitlementForSubscription (pure)", () => {
  it("missing subscription (pre-checkout/trial) allows writes", async () => {
    const { writeEntitlementForSubscription } = await loadCore("billing/entitlement-resolver.ts");
    assert.deepEqual(writeEntitlementForSubscription(null), { decision: "allow" });
  });
  it("suspended/read-only blocks; trialing allows", async () => {
    const { writeEntitlementForSubscription } = await loadCore("billing/entitlement-resolver.ts");
    const blocked = writeEntitlementForSubscription(suspended);
    assert.equal(blocked.decision, "block");
    assert.equal(blocked.reason, "read_only");
    assert.deepEqual(writeEntitlementForSubscription(trialing), { decision: "allow" });
  });
  it("founding / platform-exempt orgs always allow writes", async () => {
    const { writeEntitlementForSubscription } = await loadCore("billing/entitlement-resolver.ts");
    assert.deepEqual(writeEntitlementForSubscription(foundingSuspended), { decision: "allow" });
    assert.deepEqual(writeEntitlementForSubscription(exemptSuspended), { decision: "allow" });
  });
});

describe("H-3 decision engine: checkTenantWriteEntitlement (fetch + fail closed)", () => {
  it("no subscription => allow; suspended => block read_only; founding => allow", async () => {
    const { checkTenantWriteEntitlement } = await loadCore("billing/entitlement-resolver.ts");
    assert.deepEqual(await checkTenantWriteEntitlement(TENANT_ORG, async () => null), { decision: "allow" });
    const s = await checkTenantWriteEntitlement(TENANT_ORG, async () => suspended);
    assert.equal(s.reason, "read_only");
    assert.deepEqual(await checkTenantWriteEntitlement(TENANT_ORG, async () => foundingSuspended), { decision: "allow" });
  });

  it("database lookup FAILURE fails closed (lookup_failed), not open", async () => {
    const { checkTenantWriteEntitlement } = await loadCore("billing/entitlement-resolver.ts");
    const result = await checkTenantWriteEntitlement(TENANT_ORG, async () => {
      throw new Error("db down");
    });
    assert.deepEqual(result, { decision: "block", reason: "lookup_failed" });
  });

  it("with no DATABASE_URL the strict store returns null => allow (unconfigured is not a failure)", async () => {
    const { checkTenantWriteEntitlement } = await loadCore("billing/entitlement-resolver.ts");
    const savedDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
      assert.deepEqual(await checkTenantWriteEntitlement(TENANT_ORG), { decision: "allow" });
    } finally {
      if (savedDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDb;
    }
  });
});

describe("H-3 operator exemption uses the unchanged platform-authority source (C-2 intact)", () => {
  it("operator (allowlist or dg:staff) skips the tenant gate; ordinary tenant does not", async () => {
    const { hasPlatformAuthority } = await loadCore("access/platform-authority.ts");
    const { shouldCheckTenantWriteEntitlement } = await loadLib("write-entitlement-policy.ts");

    process.env[ENV] = OPERATOR_ORG;
    const operatorByOrg = hasPlatformAuthority({ organisationId: OPERATOR_ORG, role: "owner" });
    const operatorByStaff = hasPlatformAuthority({ organisationId: TENANT_ORG, role: "dg:staff" });
    const tenant = hasPlatformAuthority({ organisationId: TENANT_ORG, role: "owner" });
    assert.equal(operatorByOrg, true);
    assert.equal(operatorByStaff, true);
    assert.equal(tenant, false);

    // Compose exactly as the guard does.
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: operatorByOrg, pathname: "/api/v1/companies" }), false);
    assert.equal(shouldCheckTenantWriteEntitlement({ method: "POST", isPlatformOperator: tenant, pathname: "/api/v1/companies" }), true);
  });

  it("slug/name never grant operator exemption (C-2 boundary unchanged)", async () => {
    const { hasPlatformAuthority } = await loadCore("access/platform-authority.ts");
    delete process.env[ENV];
    assert.equal(
      hasPlatformAuthority({ organisationId: TENANT_ORG, role: "owner", organisationSlug: "digitalgate", organisationName: "DigitalGate" }),
      false,
    );
  });
});
