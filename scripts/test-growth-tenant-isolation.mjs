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

/**
 * The opportunity list runs its detectors and then narrows the merged result by
 * organisationId. That is safe only because every item carries a truthful org
 * id — except prospect rows, which carry none, so under org scope they were
 * excluded merely as a side effect of the field being absent. Scope them at the
 * query instead, so adding an organisationId to prospect items later cannot
 * turn a tenant page into a cross-tenant view.
 */
describe("Opportunity list: org scope is enforced at the query", () => {
  it("passes the tenant's organisationId into the prospect detector", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../packages/platform-core/src/opportunity-engine/list.ts", import.meta.url),
      "utf8",
    );

    assert.match(
      src,
      /detectProspectOpportunities\(\s*20,\s*input\.scope === "org" \? input\.organisationId : undefined,?\s*\)/,
      "prospect detection must be scoped when the caller asked for one org",
    );
  });

  it("does not rely on the post-hoc filter alone for prospects", async () => {
    const { readFile } = await import("node:fs/promises");
    const [list, detect] = await Promise.all([
      readFile(
        new URL("../packages/platform-core/src/opportunity-engine/list.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../packages/platform-core/src/opportunity-engine/detect.ts", import.meta.url),
        "utf8",
      ),
    ]);

    // The filter must remain — it is what narrows the other four detectors.
    assert.match(list, /merged\.filter\(\(o\) => o\.organisationId === input\.organisationId\)/);
    // And the prospect detector must still accept a scope to be given one.
    assert.match(detect, /export async function detectProspectOpportunities\(\s*limit = 15,\s*organisationId\?: string,/);
  });

  it("refuses org scope without an organisationId rather than falling back to all tenants", async () => {
    const { readFile } = await import("node:fs/promises");
    const src = await readFile(
      new URL("../packages/platform-core/src/opportunity-engine/list.ts", import.meta.url),
      "utf8",
    );

    // An org-scoped request with no org id must return empty, never cross-tenant.
    const guard = src.indexOf('input.scope === "org" && !input.organisationId');
    const detectors = src.indexOf("detectOverdueLeadOpportunities()");
    assert.ok(guard > 0, "missing the org-scope guard");
    assert.ok(guard < detectors, "the guard must return before any detector runs");
  });
});
