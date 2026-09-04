import assert from "node:assert/strict";
import fs from "node:fs";
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
      () => services.getOperatorPartnerDashboardWorkspace(forged),
      () => services.getOperatorPartnerReferralsWorkspace(forged),
      () => services.listOperatorPaidCommissions(forged, { limit: 1 }),
      () => services.getOperatorDeliveryDashboard(forged),
      () => services.getOperatorDeliverySectionWorkspace(forged),
      () => services.listOperatorDeliveryProjects(forged, { limit: 1 }),
      () => services.listOperatorDeliveryTasks(forged),
      () => services.getOperatorDeliveryProject(forged, "project_victim"),
      () => services.listOperatorDeliveryPartners(forged, { limit: 1 }),
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

  it("routes cross-tenant Command pages through operator capability services", () => {
    const pageContracts = [
      {
        path: "src/app/(shell)/command/advisor/page.tsx",
        wrapper: /getOperatorClientIntelligence\(operator\)/,
        banned: /\bgetClientIntelligence\(/,
      },
      {
        path: "src/app/(shell)/command/reports/page.tsx",
        wrapper: /getOperatorGrowthReports\(operator,/,
        banned: /\bgetGrowthReports\(/,
      },
      {
        path: "src/app/(shell)/command/delivery/[section]/page.tsx",
        wrapper: /getOperatorDeliverySectionWorkspace\(operator\)/,
        banned: /\b(getCommandCentreDeliveryAlerts|listDeliveryProjects|listDeliveryTasks|getDeliveryDashboardMetrics)\(/,
      },
      {
        path: "src/app/(shell)/command/delivery/onboarding/page.tsx",
        wrapper: /requirePlatformOperatorContext\(\)/,
        banned: /\bgetPlatformPageContext\(/,
      },
    ];

    for (const contract of pageContracts) {
      const page = fs.readFileSync(contract.path, "utf8");
      assert.match(page, /requirePlatformOperatorContext\(\)/);
      assert.match(page, contract.wrapper);
      assert.doesNotMatch(page, contract.banned);
    }
  });

  it("requires platform operator authority for staff partner writes", () => {
    const routes = [
      "src/app/api/v1/partners/invitations/route.ts",
      "src/app/api/v1/admin/partners/[id]/approve/route.ts",
      "src/app/api/v1/admin/partners/[id]/suspend/route.ts",
      "src/app/api/v1/admin/partners/[id]/invite/route.ts",
    ];

    for (const routePath of routes) {
      const route = fs.readFileSync(routePath, "utf8");
      assert.match(route, /requirePlatformOperator\(req\)/);
      assert.doesNotMatch(route, /canAccessCommandCentre/);
      assert.doesNotMatch(route, /requirePlatformSession/);
    }
  });
});
