/**
 * C-2 regression — tenant-controlled organisation metadata must never grant
 * platform authority.
 *
 * The vulnerability: any signed-up user could POST /api/v1/org/create with
 * { name: "DigitalGate Advisory" }, receive slug "digitalgate-advisory", and
 * be inferred as digitalgate_owner — which short-circuits hasPermission() to
 * true for every check and unlocks Command Centre.
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

const VICTIM_ORG = "org_victim_cuid";
const OPERATOR_ORG = "org_operator_cuid";
const ATTACKER_ORG = "org_attacker_cuid";

let originalEnv;

beforeEach(() => {
  originalEnv = process.env.DG_COMMAND_CENTRE_ORG_IDS;
  delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
  else process.env.DG_COMMAND_CENTRE_ORG_IDS = originalEnv;
});

describe("C-2: platform authority is server-controlled only", () => {
  it("does not grant platform authority from a digitalgate-* slug or name", async () => {
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");

    assert.equal(
      hasPlatformAuthority({ organisationId: ATTACKER_ORG, role: "owner" }),
      false,
      "owner of a self-named org must not hold platform authority",
    );
  });

  it("does not infer digitalgate_owner for a self-named organisation", async () => {
    const { toPlatformUserType } = await load("access/membership-role.ts");

    // Previously: organisationSlug "digitalgate-advisory" => "digitalgate_owner"
    assert.equal(
      toPlatformUserType({ role: "owner", organisationId: ATTACKER_ORG }),
      null,
    );
    assert.equal(
      toPlatformUserType({ role: "admin", organisationId: ATTACKER_ORG }),
      null,
    );
  });

  it("does not let a self-named organisation reach Command Centre", async () => {
    const { canAccessCommandCentre } = await load("command-centre/access.ts");

    assert.equal(
      canAccessCommandCentre({
        organisationId: ATTACKER_ORG,
        organisationName: "DigitalGate Advisory",
        organisationSlug: "digitalgate-advisory",
        role: "owner",
      }),
      false,
    );

    // Exact-match slug/name spoofing is also closed.
    assert.equal(
      canAccessCommandCentre({
        organisationId: ATTACKER_ORG,
        organisationName: "DigitalGate",
        organisationSlug: "digitalgate",
        role: "owner",
      }),
      false,
    );
  });

  it("does not grant the digitalgate_owner permission bypass to a self-named org", async () => {
    const { buildAccessContext, hasPermission } = await load(
      "access/evaluate.ts",
    );

    const ctx = buildAccessContext({
      role: "owner",
      organisationId: ATTACKER_ORG,
      enabledAppIds: [],
    });

    assert.equal(ctx.platformUserType, null);
    assert.equal(
      hasPermission(ctx, { module: "platform_admin", action: "manage" }),
      false,
    );
  });

});

describe("C-2: genuine operators retain access", () => {
  it("grants platform authority via the DG_COMMAND_CENTRE_ORG_IDS allowlist", async () => {
    process.env.DG_COMMAND_CENTRE_ORG_IDS = `${OPERATOR_ORG}, other_org`;
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");
    const { canAccessCommandCentre } = await load("command-centre/access.ts");

    assert.equal(
      hasPlatformAuthority({ organisationId: OPERATOR_ORG, role: "owner" }),
      true,
    );
    assert.equal(
      canAccessCommandCentre({ organisationId: OPERATOR_ORG, role: "owner" }),
      true,
    );
    assert.equal(
      canAccessCommandCentre({ organisationId: VICTIM_ORG, role: "owner" }),
      false,
    );
  });

  it("grants platform authority via the dg:staff membership role", async () => {
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");
    const { toPlatformUserType } = await load("access/membership-role.ts");

    assert.equal(
      hasPlatformAuthority({ organisationId: VICTIM_ORG, role: "dg:staff" }),
      true,
    );
    assert.equal(
      toPlatformUserType({ role: "dg:staff", organisationId: VICTIM_ORG }),
      "digitalgate_admin",
    );
  });

  it("fails closed when no allowlist is configured and role is ordinary", async () => {
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");
    assert.equal(hasPlatformAuthority({}), false);
    assert.equal(hasPlatformAuthority({ organisationId: "", role: "" }), false);
  });
});
