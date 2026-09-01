/**
 * H-3 gap closure (tranche 2) — apply the tenant write-entitlement guard to the
 * remaining authenticated tenant mutation surfaces that resolved a Clerk session
 * directly (requirePlatformSession()/requireClerkSession()) and so skipped the
 * requirePlatformAuth funnel:
 *
 *   1. /api/v1/communications/signatures  (POST/PATCH/DELETE)
 *   2. /api/v1/org/goals                  (POST/PATCH/DELETE)
 *   3. /api/v1/org/apps                   (PATCH)
 *   4. /api/v1/org/industry/templates     (PATCH)
 *   5. /api/v1/platform/api-keys[/[id]]   (POST/DELETE)
 *
 * All five call the shared tenantWriteEntitlementBlock(session) +
 * writeEntitlementResponse(block). Route handlers pull in next/server and the
 * platform-core barrel and cannot load in this harness, so:
 *   - the decision (403 entitlement_write_blocked / allow / operator-exempt /
 *     API-key clamp) is proven behaviourally against the shared guard, and
 *   - the per-surface wiring + preserved independent controls (activatePaidApps,
 *     requireOrgAdmin) are locked with source assertions.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const loadLib = (rel) =>
  import(pathToFileURL(path.join(root, "src/lib", rel)).href);
const readSrc = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

const ENV = "DG_COMMAND_CENTRE_ORG_IDS";
const OPERATOR_ORG = "org_operator_cuid";
const TENANT_ORG = "org_tenant_cuid";

const suspended = { status: "SUSPENDED", foundingCustomer: false, platformExempt: false };
const trialing = { status: "TRIALING", foundingCustomer: false, platformExempt: false };
const fetchOf = (row) => async () => row;
const throwingFetch = () => {
  throw new Error("db down");
};

const BLOCK_READ_ONLY = {
  status: 403,
  code: "entitlement_write_blocked",
  message: "This organisation's subscription is read-only. Update billing to resume changes.",
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

describe("shared guard decision (applies identically to all five surfaces)", () => {
  it("read-only/suspended tenant => 403 entitlement_write_blocked", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.deepEqual(
      await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG, role: "admin" }, fetchOf(suspended)),
      BLOCK_READ_ONLY,
    );
  });

  it("normal entitled tenant behaviour is unchanged (allow)", async () => {
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG, role: "admin" }, fetchOf(null)), null);
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG, role: "admin" }, fetchOf(trialing)), null);
  });

  it("operator behaviour is unchanged (allowlist + dg:staff exempt, no subscription lookup)", async () => {
    process.env[ENV] = OPERATOR_ORG;
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: OPERATOR_ORG, role: "owner" }, throwingFetch), null);
    assert.equal(await tenantWriteEntitlementBlock({ organisationId: TENANT_ORG, role: "dg:staff" }, throwingFetch), null);
  });

  it("an API-key principal is not exempt merely because its org is permitted/operator", async () => {
    process.env[ENV] = OPERATOR_ORG;
    const { tenantWriteEntitlementBlock } = await loadLib("tenant-write-entitlement.ts");
    assert.deepEqual(
      await tenantWriteEntitlementBlock(
        { organisationId: OPERATOR_ORG, role: "admin", clerkUserId: "api_key:key_1" },
        fetchOf(suspended),
      ),
      BLOCK_READ_ONLY,
    );
  });
});

// Wiring: each mutating handler calls the guard before its mutation; reads (GET)
// do not; independent controls remain.
const GUARD_CALL = "const block = await tenantWriteEntitlementBlock(session);";
const GUARD_RESP = "if (block) return writeEntitlementResponse(block);";
const IMPORT = 'from "@/lib/write-entitlement"';

function assertImports(src, file) {
  assert.ok(src.includes(IMPORT), `${file}: imports from @/lib/write-entitlement`);
  assert.ok(src.includes("tenantWriteEntitlementBlock"), `${file}: imports tenantWriteEntitlementBlock`);
  assert.ok(src.includes("writeEntitlementResponse"), `${file}: imports writeEntitlementResponse`);
}
function guardBefore(src, mutationNeedle, file) {
  const g = src.indexOf(GUARD_CALL);
  const m = src.indexOf(mutationNeedle);
  assert.ok(g !== -1, `${file}: has guard call`);
  assert.ok(m !== -1, `${file}: has mutation ${mutationNeedle}`);
  assert.ok(g < m, `${file}: guard precedes mutation ${mutationNeedle}`);
  assert.ok(src.includes(GUARD_RESP), `${file}: returns writeEntitlementResponse(block)`);
}
function countGuards(src) {
  return src.split(GUARD_CALL).length - 1;
}

describe("wiring: communications/signatures (POST/PATCH/DELETE, GET untouched)", () => {
  const file = "src/app/api/v1/communications/signatures/route.ts";
  it("guards all three mutations and not the read", () => {
    const src = readSrc(file);
    assertImports(src, file);
    guardBefore(src, "createCommunicationSignature(session.organisationId", file);
    guardBefore(src, "updateCommunicationSignature(session.organisationId", file);
    guardBefore(src, "deleteCommunicationSignature(session.organisationId", file);
    assert.equal(countGuards(src), 3, "one guard per mutating handler; GET has none");
  });
});

describe("wiring: org/goals (POST/PATCH/DELETE, GET untouched)", () => {
  const file = "src/app/api/v1/org/goals/route.ts";
  it("guards all three mutations and not the read", () => {
    const src = readSrc(file);
    assertImports(src, file);
    guardBefore(src, "createOrganisationGoal(session.organisationId", file);
    guardBefore(src, "updateOrganisationGoal(session.organisationId", file);
    guardBefore(src, "deleteOrganisationGoal(session.organisationId", file);
    assert.equal(countGuards(src), 3, "one guard per mutating handler; GET has none");
  });
});

describe("wiring: org/apps PATCH keeps activatePaidApps as a separate control", () => {
  const file = "src/app/api/v1/org/apps/route.ts";
  it("guards the write and preserves the paid-app entitlement check", () => {
    const src = readSrc(file);
    assertImports(src, file);
    guardBefore(src, "prisma.organisation.update", file);
    assert.ok(
      src.includes('assertEntitlement(session.organisationId, "activatePaidApps")'),
      "activatePaidApps entitlement check remains",
    );
    assert.equal(countGuards(src), 1, "PATCH guarded; GET has none");
  });
});

describe("wiring: org/industry/templates PATCH keeps activatePaidApps as a separate control", () => {
  const file = "src/app/api/v1/org/industry/templates/route.ts";
  it("guards the write and preserves the paid-app entitlement check", () => {
    const src = readSrc(file);
    assertImports(src, file);
    guardBefore(src, "prisma.organisation.update", file);
    assert.ok(
      src.includes('assertEntitlement(session.organisationId, "activatePaidApps")'),
      "activatePaidApps entitlement check remains",
    );
    assert.equal(countGuards(src), 1, "PATCH guarded; GET has none");
  });
});

describe("wiring: platform/api-keys preserves requireOrgAdmin before the guard", () => {
  it("POST guards creation after requireOrgAdmin", () => {
    const file = "src/app/api/v1/platform/api-keys/route.ts";
    const src = readSrc(file);
    assertImports(src, file);
    const admin = src.indexOf("requireOrgAdmin(session)");
    const guard = src.indexOf(GUARD_CALL);
    const create = src.indexOf("createPlatformApiKey(");
    assert.ok(admin !== -1 && guard !== -1 && create !== -1);
    assert.ok(admin < guard && guard < create, "requireOrgAdmin -> guard -> createPlatformApiKey");
    assert.equal(countGuards(src), 1, "POST guarded; GET has none");
  });

  it("DELETE guards revocation after requireOrgAdmin", () => {
    const file = "src/app/api/v1/platform/api-keys/[id]/route.ts";
    const src = readSrc(file);
    assertImports(src, file);
    const admin = src.indexOf("requireOrgAdmin(session)");
    const guard = src.indexOf(GUARD_CALL);
    const revoke = src.indexOf("revokePlatformApiKey(");
    assert.ok(admin !== -1 && guard !== -1 && revoke !== -1);
    assert.ok(admin < guard && guard < revoke, "requireOrgAdmin -> guard -> revokePlatformApiKey");
    assert.equal(countGuards(src), 1);
  });

  it("an API-key principal cannot manage keys even if its org is otherwise permitted", () => {
    // Enforced by requireOrgAdmin (unchanged), independent of write-entitlement.
    const src = readSrc("src/lib/platform-api.ts");
    assert.match(
      src,
      /requireOrgAdmin[\s\S]*?session\.clerkUserId\.startsWith\("api_key:"\)[\s\S]*?status:\s*403/,
      "requireOrgAdmin rejects api_key:* principals with 403",
    );
  });
});
