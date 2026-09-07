/**
 * Security invariant — an API key must never become a substitute for an
 * interactive platform-operator identity.
 *
 * API keys are minted by a tenant admin, bound to a single organisation, and
 * mapped to a synthetic `api_key:<keyId>` principal by `apiKeyToPlatformSession`
 * with a fixed `admin` role. The risk: a key minted *for the operator org*
 * (an org on the DG_COMMAND_CENTRE_ORG_IDS allowlist) would otherwise inherit
 * full platform-operator authority — Command Centre, the C-3 cross-tenant
 * capability, operator permission grants, and the H-3 write-entitlement
 * exemption — as a standing, non-interactive credential.
 *
 * Enforcement: `hasPlatformAuthority` (the single source of truth) returns false
 * for any `api_key:*` principal, and every session→authority path threads the
 * principal id through. These tests prove a non-interactive credential is denied
 * operator authority while the legitimate interactive owner in the same org
 * keeps it.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function load(rel) {
  return import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel))
      .href
  );
}

const OPERATOR_ORG = "org_operator_cuid";
const VICTIM_ORG = "org_victim_cuid";

// Principal ids exactly as apiKeyToPlatformSession mints them vs an interactive
// Clerk user id.
const API_KEY_PRINCIPAL = "api_key:key_abc123";
const HUMAN_PRINCIPAL = "user_2xh...";

let originalEnv;

beforeEach(() => {
  originalEnv = process.env.DG_COMMAND_CENTRE_ORG_IDS;
  // Designate the DigitalGate organisation as the server-allowlisted operator org.
  process.env.DG_COMMAND_CENTRE_ORG_IDS = OPERATOR_ORG;
});

afterEach(() => {
  if (originalEnv === undefined) delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
  else process.env.DG_COMMAND_CENTRE_ORG_IDS = originalEnv;
});

describe("API keys never hold platform authority", () => {
  it("isApiKeyPrincipal recognises only api_key:* principals", async () => {
    const { isApiKeyPrincipal, API_KEY_PRINCIPAL_PREFIX } = await load(
      "access/platform-authority.ts",
    );
    assert.equal(API_KEY_PRINCIPAL_PREFIX, "api_key:");
    assert.equal(isApiKeyPrincipal(API_KEY_PRINCIPAL), true);
    assert.equal(isApiKeyPrincipal(HUMAN_PRINCIPAL), false);
    assert.equal(isApiKeyPrincipal(undefined), false);
    assert.equal(isApiKeyPrincipal(null), false);
    assert.equal(isApiKeyPrincipal(""), false);
  });

  it("hasPlatformAuthority denies an api-key session in an allowlisted org", async () => {
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");

    // The legitimate interactive owner in the allowlisted operator org keeps authority.
    assert.equal(
      hasPlatformAuthority({
        organisationId: OPERATOR_ORG,
        role: "owner",
        principalId: HUMAN_PRINCIPAL,
      }),
      true,
    );

    // An API key is minted as admin; being in the same allowlisted org never grants authority.
    assert.equal(
      hasPlatformAuthority({
        organisationId: OPERATOR_ORG,
        role: "admin",
        principalId: API_KEY_PRINCIPAL,
      }),
      false,
    );
  });

  it("hasPlatformAuthority denies an api-key session even with a dg:staff role", async () => {
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");

    // Fail-closed: even if an api-key session somehow carried dg:staff, the
    // credential is still refused operator authority.
    assert.equal(
      hasPlatformAuthority({
        organisationId: VICTIM_ORG,
        role: "dg:staff",
        principalId: API_KEY_PRINCIPAL,
      }),
      false,
    );
    // The same role from an interactive human is honoured.
    assert.equal(
      hasPlatformAuthority({
        organisationId: VICTIM_ORG,
        role: "dg:staff",
        principalId: HUMAN_PRINCIPAL,
      }),
      true,
    );
  });

  it("canAccessCommandCentre denies an api-key session in the operator org", async () => {
    const { canAccessCommandCentre } = await load("command-centre/access.ts");

    assert.equal(
      canAccessCommandCentre({
        organisationId: OPERATOR_ORG,
        role: "owner",
        principalId: HUMAN_PRINCIPAL,
      }),
      true,
    );
    assert.equal(
      canAccessCommandCentre({
        organisationId: OPERATOR_ORG,
        role: "admin",
        principalId: API_KEY_PRINCIPAL,
      }),
      false,
    );
  });

  it("toPlatformUserType returns null for an api-key principal, even if hasAuthority is forced", async () => {
    const { toPlatformUserType } = await load("access/membership-role.ts");

    // Interactive platform owner resolves to the owner user type.
    assert.equal(
      toPlatformUserType({
        role: "owner",
        organisationId: OPERATOR_ORG,
        principalId: HUMAN_PRINCIPAL,
      }),
      "digitalgate_owner",
    );

    // API-key principal never resolves — not even when a caller passes a
    // pre-resolved hasAuthority: true (client-nav override path).
    assert.equal(
      toPlatformUserType({
        role: "admin",
        organisationId: OPERATOR_ORG,
        principalId: API_KEY_PRINCIPAL,
      }),
      null,
    );
    assert.equal(
      toPlatformUserType({
        role: "admin",
        organisationId: OPERATOR_ORG,
        hasAuthority: true,
        principalId: API_KEY_PRINCIPAL,
      }),
      null,
    );
  });

  it("buildAccessContext gives an api-key session no operator grants", async () => {
    const { buildAccessContext, hasPermission } = await load(
      "access/evaluate.ts",
    );

    const humanCtx = buildAccessContext({
      role: "owner",
      organisationId: OPERATOR_ORG,
      enabledAppIds: [],
      principalId: HUMAN_PRINCIPAL,
    });
    assert.equal(humanCtx.platformUserType, "digitalgate_owner");

    const keyCtx = buildAccessContext({
      role: "admin",
      organisationId: OPERATOR_ORG,
      enabledAppIds: [],
      principalId: API_KEY_PRINCIPAL,
    });
    assert.equal(keyCtx.platformUserType, null);
    assert.equal(
      hasPermission(keyCtx, { module: "platform_admin", action: "manage" }),
      false,
    );
  });

  it("assertPlatformOperator refuses to mint a capability for an api-key session (C-3)", async () => {
    const { assertPlatformOperator } = await load(
      "access/platform-operator-context.ts",
    );

    const human = assertPlatformOperator({
      clerkUserId: HUMAN_PRINCIPAL,
      organisationId: OPERATOR_ORG,
      role: "owner",
    });
    assert.ok(human, "interactive platform owner must receive a capability");

    const key = assertPlatformOperator({
      clerkUserId: API_KEY_PRINCIPAL,
      organisationId: OPERATOR_ORG,
      role: "admin",
    });
    assert.equal(key, null, "api-key session must not mint an operator capability");

    // Even a forged dg:staff api-key session is refused.
    assert.equal(
      assertPlatformOperator({
        clerkUserId: API_KEY_PRINCIPAL,
        organisationId: VICTIM_ORG,
        role: "dg:staff",
      }),
      null,
    );
  });
});

describe("producer / detector contract", () => {
  it("apiKeyToPlatformSession mints an api_key:* principal the detector recognises", async () => {
    const { isApiKeyPrincipal, API_KEY_PRINCIPAL_PREFIX } = await load(
      "access/platform-authority.ts",
    );
    const src = fs.readFileSync(
      path.join(__dirname, "../packages/platform-core/src/api-keys/index.ts"),
      "utf8",
    );
    // The session producer must mint the exact prefix the authority check
    // refuses, so the two cannot drift and silently re-open the hole.
    assert.match(src, /clerkUserId:\s*`api_key:\$\{verified\.keyId\}`/);
    assert.match(src, /membershipId:\s*`api_key:\$\{verified\.keyId\}`/);
    assert.equal(isApiKeyPrincipal(`${API_KEY_PRINCIPAL_PREFIX}anything`), true);
  });
});
