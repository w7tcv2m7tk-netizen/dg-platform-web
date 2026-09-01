/**
 * Command Centre SSR→hydration parity regression.
 *
 * The C-2 change made the client-reachable toPlatformUserType/buildAccessContext
 * derive platform authority from process.env.DG_COMMAND_CENTRE_ORG_IDS, which is
 * server-only (undefined in the browser). The server rendered Command Centre and
 * the client stripped it after hydration (flash-then-disappear).
 *
 * The fix passes the server-resolved `isPlatformOperator` boolean into
 * buildAccessContext → toPlatformUserType (as `hasAuthority`) so the client
 * navigation matches the server without re-reading server-only env. Authority
 * itself (hasPlatformAuthority/canAccessCommandCentre) is unchanged and still
 * derives ONLY from the DG_COMMAND_CENTRE_ORG_IDS allowlist or a dg:staff role.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function load(rel) {
  return import(pathToFileURL(path.join(root, "packages/platform-core/src", rel)).href);
}

const OPERATOR_ORG = "cmsfkd6n50000ju046to0po60"; // shape-only fixture, not a secret
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

/** True when the filtered categorized nav still exposes the Command Centre app. */
function commandCentreVisible(filtered) {
  const section = filtered?.ia?.digitalgate;
  return Boolean(section) && (section.apps ?? []).some((a) => a && a.name === "Command Centre");
}

describe("Command Centre: SSR ≡ hydration parity", () => {
  it("client boolean (no server env) yields the same platformUserType as the server env", async () => {
    const { buildAccessContext } = await load("access/evaluate.ts");

    // Client: DG_COMMAND_CENTRE_ORG_IDS is undefined in the browser.
    delete process.env[ENV];
    const client = buildAccessContext({
      role: "owner",
      organisationId: OPERATOR_ORG,
      isPlatformOperator: true,
      enabledAppIds: [],
    });

    // Server: allowlist available, no boolean passed.
    process.env[ENV] = OPERATOR_ORG;
    const server = buildAccessContext({
      role: "owner",
      organisationId: OPERATOR_ORG,
      enabledAppIds: [],
    });

    assert.equal(client.platformUserType, "digitalgate_owner");
    assert.equal(server.platformUserType, "digitalgate_owner");
    assert.equal(client.platformUserType, server.platformUserType);
  });

  it("reproduces the bug the fix addresses: no env AND no boolean => no authority on the client", async () => {
    const { buildAccessContext } = await load("access/evaluate.ts");
    delete process.env[ENV];
    const ctx = buildAccessContext({
      role: "owner",
      organisationId: OPERATOR_ORG,
      enabledAppIds: [],
    });
    assert.equal(ctx.platformUserType, null);
  });
});

describe("Command Centre: navigation visibility (no server env, client boolean)", () => {
  it("operator keeps Command Centre; ordinary tenant does not", async () => {
    const { getCategorizedPlatformNavigation } = await load("apps/navigation.ts");
    const { filterNavigationByAccess } = await load("access/nav-filter.ts");
    const { buildAccessContext } = await load("access/evaluate.ts");

    delete process.env[ENV]; // simulate the browser
    const base = getCategorizedPlatformNavigation([], { showCommandCentre: true });
    assert.equal(commandCentreVisible(base), true, "base nav should include Command Centre");

    const operatorCtx = buildAccessContext({
      role: "owner",
      organisationId: OPERATOR_ORG,
      isPlatformOperator: true,
      enabledAppIds: [],
    });
    const tenantCtx = buildAccessContext({
      role: "owner",
      organisationId: TENANT_ORG,
      isPlatformOperator: false,
      enabledAppIds: [],
    });

    assert.equal(commandCentreVisible(filterNavigationByAccess(base, operatorCtx)), true);
    assert.equal(commandCentreVisible(filterNavigationByAccess(base, tenantCtx)), false);
  });
});

describe("toPlatformUserType: hasAuthority override", () => {
  it("maps role → user type when authority is supplied, without reading env", async () => {
    const { toPlatformUserType } = await load("access/membership-role.ts");
    delete process.env[ENV];
    assert.equal(toPlatformUserType({ role: "owner", organisationId: OPERATOR_ORG, hasAuthority: true }), "digitalgate_owner");
    assert.equal(toPlatformUserType({ role: "admin", hasAuthority: true }), "digitalgate_admin");
    assert.equal(toPlatformUserType({ role: "dg:staff", hasAuthority: true }), "digitalgate_admin");
    assert.equal(toPlatformUserType({ role: "member", hasAuthority: true }), "digitalgate_member");
  });

  it("returns null when authority is explicitly false, even for an owner", async () => {
    const { toPlatformUserType } = await load("access/membership-role.ts");
    assert.equal(toPlatformUserType({ role: "owner", organisationId: OPERATOR_ORG, hasAuthority: false }), null);
  });

  it("falls back to the server allowlist when hasAuthority is omitted", async () => {
    const { toPlatformUserType } = await load("access/membership-role.ts");
    delete process.env[ENV];
    assert.equal(toPlatformUserType({ role: "owner", organisationId: OPERATOR_ORG }), null);
    process.env[ENV] = OPERATOR_ORG;
    assert.equal(toPlatformUserType({ role: "owner", organisationId: OPERATOR_ORG }), "digitalgate_owner");
  });
});

describe("server authority is independent and cannot be granted by a client value", () => {
  it("canAccessCommandCentre ignores a fabricated client context / boolean", async () => {
    const { canAccessCommandCentre } = await load("command-centre/access.ts");
    const { buildAccessContext } = await load("access/evaluate.ts");

    // A client could build a context claiming operator, but the server guard
    // recomputes from organisationId + role + env and is unaffected.
    const forged = buildAccessContext({
      role: "owner",
      organisationId: TENANT_ORG,
      isPlatformOperator: true,
      enabledAppIds: [],
    });
    assert.equal(forged.platformUserType, "digitalgate_owner"); // client nav only

    process.env[ENV] = OPERATOR_ORG; // tenant is NOT allowlisted
    assert.equal(canAccessCommandCentre({ organisationId: TENANT_ORG, role: "owner" }), false);
    assert.equal(canAccessCommandCentre({ organisationId: OPERATOR_ORG, role: "owner" }), true);
  });

  it("hasPlatformAuthority accepts only organisationId + role (no client override)", async () => {
    const { hasPlatformAuthority } = await load("access/platform-authority.ts");
    process.env[ENV] = OPERATOR_ORG;
    // A stray `hasAuthority`/`isPlatformOperator` on the input is ignored.
    assert.equal(
      hasPlatformAuthority({ organisationId: TENANT_ORG, role: "owner", hasAuthority: true, isPlatformOperator: true }),
      false,
    );
    assert.equal(hasPlatformAuthority({ organisationId: OPERATOR_ORG, role: "owner" }), true);
    assert.equal(hasPlatformAuthority({ organisationId: TENANT_ORG, role: "dg:staff" }), true);
  });
});

describe("C-2 intact: organisation slug/name never grant authority", () => {
  it("a DigitalGate-looking slug/name on a non-allowlisted org is denied", async () => {
    const { canAccessCommandCentre } = await load("command-centre/access.ts");
    delete process.env[ENV];
    assert.equal(
      canAccessCommandCentre({
        organisationId: TENANT_ORG,
        organisationSlug: "digitalgate",
        organisationName: "DigitalGate Advisory",
        role: "owner",
      }),
      false,
    );
  });
});

describe("no browser exposure of the allowlist", () => {
  it("client components never read process.env.DG_COMMAND_CENTRE_ORG_IDS and no NEXT_PUBLIC variant exists", () => {
    // EnabledAppsProvider is the client boundary that consumes isPlatformOperator.
    const providerSrc = fs.readFileSync(
      path.join(root, "src/components/platform/EnabledAppsProvider.tsx"),
      "utf8",
    );
    assert.ok(
      providerSrc.includes('"use client"') || providerSrc.includes("'use client'"),
      "EnabledAppsProvider must be a client component",
    );

    // Neither the client boundary nor the shell it renders may read the
    // server-only allowlist env var.
    for (const rel of [
      "src/components/platform/EnabledAppsProvider.tsx",
      "src/components/PlatformShell.tsx",
    ]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      assert.ok(
        !src.includes("DG_COMMAND_CENTRE_ORG_IDS"),
        `${rel} must not reference the server-only allowlist env var`,
      );
    }
    for (const rel of [
      "src/components/PlatformShellLoader.tsx",
      "packages/platform-core/src/access/evaluate.ts",
      "packages/platform-core/src/access/membership-role.ts",
      "src/components/platform/EnabledAppsProvider.tsx",
      "src/components/PlatformShell.tsx",
    ]) {
      const src = fs.readFileSync(path.join(root, rel), "utf8");
      assert.ok(
        !src.includes("NEXT_PUBLIC_DG_COMMAND_CENTRE_ORG_IDS"),
        `${rel} must not introduce a NEXT_PUBLIC allowlist`,
      );
    }
  });
});
