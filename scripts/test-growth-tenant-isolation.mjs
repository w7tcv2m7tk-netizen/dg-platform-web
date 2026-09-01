/**
 * C-3 regression — cross-tenant platform capability.
 *
 * transitionGrowthProspectToClient() accepted a caller-supplied
 * existingOrganisationId and created an admin Membership in it, letting any
 * org owner take over an arbitrary tenant. The operation now requires an
 * unforgeable PlatformOperatorContext.
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
