/**
 * C-1 / C-3 regression — Growth Engine tenant isolation and cross-tenant
 * capability.
 *
 * C-1: listGrowthProposalDrafts()/listGrowthProspectReports() previously took
 * an optional organisationId; omitting it disabled tenant filtering and
 * returned every tenant's prospects, audits and report share tokens.
 *
 * C-3: transitionGrowthProspectToClient() accepted a caller-supplied
 * existingOrganisationId and created an admin Membership in it, letting any
 * org owner take over an arbitrary tenant.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function load(rel) {
  return import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel))
      .href
  );
}

const TENANT_A = "org_tenant_a";
const TENANT_B = "org_tenant_b";
const OPERATOR_ORG = "org_operator";

let originalEnv;
beforeEach(() => {
  originalEnv = process.env.DG_COMMAND_CENTRE_ORG_IDS;
  delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
});
afterEach(() => {
  if (originalEnv === undefined) delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
  else process.env.DG_COMMAND_CENTRE_ORG_IDS = originalEnv;
});

describe("C-1: GrowthScope cannot be omitted or widened by a tenant", () => {
  it("pins the tenant in the Prisma where fragment", async () => {
    const { organisationGrowthScope, growthScopeWhere } = await load(
      "command-centre/growth-engine/scope.ts",
    );

    assert.deepEqual(growthScopeWhere(organisationGrowthScope(TENANT_A)), {
      organisationId: TENANT_A,
    });
  });

  it("scopes child records through the parent prospect", async () => {
    const { organisationGrowthScope, growthScopeProspectWhere } = await load(
      "command-centre/growth-engine/scope.ts",
    );

    assert.deepEqual(
      growthScopeProspectWhere(organisationGrowthScope(TENANT_A)),
      { prospect: { organisationId: TENANT_A } },
    );
  });

  it("refuses to build a tenant scope without an organisation id", async () => {
    const { organisationGrowthScope } = await load(
      "command-centre/growth-engine/scope.ts",
    );

    assert.throws(() => organisationGrowthScope(""));
    assert.throws(() => organisationGrowthScope(undefined));
  });

  it("refuses a forged platform scope", async () => {
    const { platformGrowthScope, growthScopeWhere } = await load(
      "command-centre/growth-engine/scope.ts",
    );

    // A plain object shaped like an operator context must not pass.
    assert.throws(() =>
      platformGrowthScope({
        actorId: "user_attacker",
        operatorOrganisationId: TENANT_A,
      }),
    );

    // Nor may one be smuggled in as a raw scope literal.
    assert.throws(() =>
      growthScopeWhere({
        kind: "platform",
        operator: { actorId: "user_attacker" },
      }),
    );
  });

  it("rejects records belonging to another tenant", async () => {
    const { organisationGrowthScope, isInGrowthScope } = await load(
      "command-centre/growth-engine/scope.ts",
    );

    const scopeA = organisationGrowthScope(TENANT_A);
    assert.equal(isInGrowthScope({ organisationId: TENANT_A }, scopeA), true);
    assert.equal(isInGrowthScope({ organisationId: TENANT_B }, scopeA), false);
    assert.equal(isInGrowthScope({ organisationId: null }, scopeA), false);
    assert.equal(isInGrowthScope(null, scopeA), false);
  });

  it("allows platform-wide reads only with a real operator capability", async () => {
    process.env.DG_COMMAND_CENTRE_ORG_IDS = OPERATOR_ORG;
    const { assertPlatformOperator } = await load(
      "access/platform-operator-context.ts",
    );
    const { platformGrowthScope, growthScopeWhere, isInGrowthScope } =
      await load("command-centre/growth-engine/scope.ts");

    const operator = assertPlatformOperator({
      clerkUserId: "user_staff",
      organisationId: OPERATOR_ORG,
      role: "owner",
    });
    assert.ok(operator);

    const scope = platformGrowthScope(operator);
    assert.deepEqual(growthScopeWhere(scope), {});
    assert.equal(isInGrowthScope({ organisationId: TENANT_B }, scope), true);
  });
});

describe("C-3: platform operator capability is unforgeable", () => {
  it("denies the capability to an ordinary org owner", async () => {
    const { assertPlatformOperator } = await load(
      "access/platform-operator-context.ts",
    );

    assert.equal(
      assertPlatformOperator({
        clerkUserId: "user_attacker",
        organisationId: TENANT_A,
        role: "owner",
      }),
      null,
    );
  });

  it("denies the capability to a self-named 'DigitalGate' org owner", async () => {
    const { assertPlatformOperator } = await load(
      "access/platform-operator-context.ts",
    );

    assert.equal(
      assertPlatformOperator({
        clerkUserId: "user_attacker",
        organisationId: TENANT_A,
        role: "owner",
        email: "attacker@example.com",
        name: "DigitalGate Advisory",
      }),
      null,
    );
  });

  it("does not accept a hand-built object as a capability", async () => {
    const { isPlatformOperatorContext } = await load(
      "access/platform-operator-context.ts",
    );

    assert.equal(
      isPlatformOperatorContext({
        actorId: "user_attacker",
        operatorOrganisationId: TENANT_B,
      }),
      false,
    );
    assert.equal(isPlatformOperatorContext(null), false);
    assert.equal(isPlatformOperatorContext("operator"), false);
  });

  it("rejects a transition attempt without a real capability", async () => {
    const { transitionGrowthProspectToClient } = await load(
      "command-centre/growth-engine/client-transition.ts",
    );

    // Simulates the previous exploit: caller supplies the victim org id.
    const result = await transitionGrowthProspectToClient({
      operator: {
        actorId: "user_attacker",
        operatorOrganisationId: TENANT_A,
      },
      prospectId: "prospect_victim",
      existingOrganisationId: TENANT_B,
    });

    assert.deepEqual(result, { error: "forbidden" });
  });

  it("grants the capability to a genuine allowlisted operator", async () => {
    process.env.DG_COMMAND_CENTRE_ORG_IDS = OPERATOR_ORG;
    const { assertPlatformOperator, isPlatformOperatorContext } = await load(
      "access/platform-operator-context.ts",
    );

    const operator = assertPlatformOperator({
      clerkUserId: "user_staff",
      organisationId: OPERATOR_ORG,
      role: "owner",
      email: "staff@digitalgate.com.au",
    });

    assert.ok(operator);
    assert.equal(isPlatformOperatorContext(operator), true);
    assert.equal(operator.actorId, "user_staff");
    assert.equal(operator.operatorOrganisationId, OPERATOR_ORG);
  });
});
