import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function load(rel) {
  return import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel)).href
  );
}

let originalAllowlist;

beforeEach(() => {
  originalAllowlist = process.env.DG_COMMAND_CENTRE_ORG_IDS;
  process.env.DG_COMMAND_CENTRE_ORG_IDS = "org_operator";
});

afterEach(() => {
  if (originalAllowlist === undefined) delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
  else process.env.DG_COMMAND_CENTRE_ORG_IDS = originalAllowlist;
});

describe("Command Centre operator capability", () => {
  it("mints a branded capability only for a genuine platform operator", async () => {
    const { assertPlatformOperator, isPlatformOperatorContext } = await load(
      "access/platform-operator-context.ts",
    );

    const operator = assertPlatformOperator({
      clerkUserId: "user_operator",
      organisationId: "org_operator",
      role: "owner",
    });
    assert.ok(operator);
    assert.equal(isPlatformOperatorContext(operator), true);

    const ordinary = assertPlatformOperator({
      clerkUserId: "user_member",
      organisationId: "org_customer",
      role: "owner",
    });
    assert.equal(ordinary, null);
  });

  it("rejects an unbranded object at every cross-tenant operator wrapper", async () => {
    const services = await load("command-centre/operator-services.ts");
    const forged = {
      actorId: "user_attacker",
      operatorOrganisationId: "org_operator",
    };

    const calls = [
      () => services.getOperatorCommandCentreOpsHome(forged),
      () => services.getOperatorClientIntelligence(forged),
      () =>
        services.generateOperatorClientAdvisorInsight(forged, {
          organisationId: "org_victim",
        }),
      () => services.getOperatorCommandBenchmarks(forged),
      () => services.getOperatorGrowthReports(forged, { period: "mtd" }),
      () => services.getOperatorClientExpansionOpportunities(forged),
      () => services.listOperatorPlatformOpportunities(forged, { limit: 1 }),
      () => services.getOperatorPlatformAlertsCentre(forged),
      () => services.getOperatorPlatformAlertsBadgeCount(forged),
      () => services.getOperatorCommandFeatureFlagsOverview(forged),
      () => services.getOperatorCommandMrrAttribution(forged),
      () => services.getOperatorCommissionsWorkspace(forged),
      () => services.getOperatorDeliveryDashboard(forged),
      () =>
        services.updateOperatorOrganisationFeatureFlags(forged, {
          organisationId: "org_victim",
          flags: { example: true },
        }),
    ];

    for (const call of calls) {
      await assert.rejects(call, /Platform operator capability required/);
    }
  });
});
