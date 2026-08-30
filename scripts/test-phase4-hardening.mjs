/**
 * Phase 4 regression tests — issues found re-auditing after PR #3.
 *
 * Each of these was a real gap in a control that had already shipped, which is
 * why they are asserted structurally rather than only behaviourally: the point
 * is that the control cannot silently be removed again.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readSource = (rel) => readFile(path.join(__dirname, "..", rel), "utf8");
const loadCore = (rel) =>
  import(
    pathToFileURL(path.join(__dirname, "../packages/platform-core/src", rel)).href
  );

describe("Phase 4: server actions honour the write entitlement gate", () => {
  it("the marketing SEO action asserts write entitlement itself", async () => {
    // Server actions never pass through requirePlatformAuth, so the central
    // gate in lib/entitlement-gate does not see them. This was the only
    // "use server" mutation in the repo and it persisted audit results.
    const src = await readSource("src/app/(shell)/apps/marketing/audits/actions.ts");

    assert.match(src, /assertEntitlement\(/, "must assert entitlement");
    assert.match(src, /"write"/, "must assert the write capability specifically");

    const gateAt = src.indexOf("assertEntitlement(");
    const auditAt = src.indexOf("runOrgSeoAudit(");
    assert.ok(gateAt > 0 && auditAt > 0);
    assert.ok(gateAt < auditAt, "entitlement must be checked before persisting");
  });

  it("no other server action exists without a gate", async () => {
    // If a new "use server" mutation appears, this test should be revisited
    // rather than the gap being rediscovered in a later audit.
    const { execSync } = await import("node:child_process");
    const out = execSync(
      'grep -rl \'"use server"\' src --include=*.ts --include=*.tsx || true',
      { cwd: path.join(__dirname, ".."), encoding: "utf8" },
    ).trim();

    const files = out ? out.split("\n") : [];
    assert.deepEqual(
      files,
      ["src/app/(shell)/apps/marketing/audits/actions.ts"],
      "a new server action was added — confirm it enforces entitlement",
    );
  });
});

describe("Phase 4: email domain is not a platform-authority source", () => {
  it("support staff gates no longer accept an email domain", async () => {
    for (const rel of [
      "src/app/(shell)/support/tickets/page.tsx",
      "src/app/(shell)/support/escalations/page.tsx",
    ]) {
      const src = await readSource(rel);
      assert.doesNotMatch(
        src,
        /isDigitalGateStaffEmail\(/,
        `${rel} must not grant cross-tenant support access from an email domain`,
      );
      assert.match(src, /canAccessCommandCentre\(/, `${rel} must use the authority model`);
    }
  });

  it("platform authority still comes only from the allowlist or dg:staff", async () => {
    const saved = process.env.DG_COMMAND_CENTRE_ORG_IDS;
    delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
    try {
      const { hasPlatformAuthority } = await loadCore("access/platform-authority.ts");

      assert.equal(
        hasPlatformAuthority({ organisationId: "org_x", role: "owner" }),
        false,
      );
      assert.equal(
        hasPlatformAuthority({ organisationId: "org_x", role: "dg:staff" }),
        true,
      );

      process.env.DG_COMMAND_CENTRE_ORG_IDS = "org_operator";
      assert.equal(
        hasPlatformAuthority({ organisationId: "org_operator", role: "member" }),
        true,
      );
    } finally {
      if (saved === undefined) delete process.env.DG_COMMAND_CENTRE_ORG_IDS;
      else process.env.DG_COMMAND_CENTRE_ORG_IDS = saved;
    }
  });
});

describe("Phase 4: Growth Engine scope is required everywhere", () => {
  it("listProspectsNeedingAudit takes a required scope, not an optional org id", async () => {
    const src = await readSource(
      "packages/platform-core/src/command-centre/growth-engine/audits.ts",
    );

    assert.match(
      src,
      /listProspectsNeedingAudit\(\s*\n?\s*scope: GrowthScope/,
      "scope must be a required positional argument",
    );
    assert.doesNotMatch(
      src,
      /listProspectsNeedingAudit\(options\?: \{\s*\n\s*organisationId\?: string/,
      "the optional-org-id shape must not return",
    );
  });

  it("throws rather than silently returning every tenant on a bad scope", async () => {
    const { growthScopeWhere } = await loadCore(
      "command-centre/growth-engine/scope.ts",
    );
    assert.throws(() => growthScopeWhere({ kind: "nonsense" }));
    assert.throws(() =>
      growthScopeWhere({ kind: "platform", operator: { actorId: "x" } }),
    );
  });
});

describe("Phase 4: remaining SSRF sinks are guarded", () => {
  it("the PageSpeed TTFB probe validates every redirect hop", async () => {
    const src = await readSource("packages/platform-core/src/websites/pagespeed.ts");

    assert.match(src, /safeExternalFetch\(/, "must use the guarded fetch");
    assert.doesNotMatch(
      src,
      /redirect: "follow"/,
      "redirect:follow bypasses the guard by resolving hops internally",
    );
  });

  it("listing image persistence validates every redirect hop", async () => {
    const src = await readSource(
      "packages/platform-core/src/properties/persist-listing-images.ts",
    );

    assert.match(src, /safeExternalFetch\(/);
    assert.doesNotMatch(src, /redirect: "follow"/);
  });

  it("the guard still refuses metadata and private space", async () => {
    const { assertPublicHttpTarget } = await loadCore(
      "command-centre/growth-engine/ssrf-guard.ts",
    );

    for (const url of [
      "http://169.254.169.254/",
      "http://127.0.0.1/",
      "http://10.1.2.3/",
      "http://[fd00::1]/",
    ]) {
      const result = await assertPublicHttpTarget(url);
      assert.equal(result.allowed, false, url);
    }
  });
});

describe("Phase 4: IndexNow key comparison", () => {
  let saved;

  beforeEach(() => {
    saved = {
      INDEXNOW_API_KEY: process.env.INDEXNOW_API_KEY,
      DG_API_KEY: process.env.DG_API_KEY,
    };
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("prefers the dedicated key over the shared DG_API_KEY", async () => {
    const src = await readSource("src/app/api/indexnow/route.ts");

    // Assert the resolution expression itself, not comment prose.
    assert.match(
      src,
      /process\.env\.INDEXNOW_API_KEY\?\.trim\(\)\s*\|\|\s*process\.env\.DG_API_KEY\?\.trim\(\)/,
      "the dedicated key must be tried before the shared one",
    );
  });

  it("compares in constant time rather than with ===", async () => {
    const src = await readSource("src/app/api/indexnow/route.ts");
    assert.match(src, /timingSafeEqual/);
    assert.doesNotMatch(src, /apiKey !== expected/);
  });
});

/**
 * DG_API_KEY is used in BOTH directions — we verify inbound callers with it and
 * present it outbound to WordPress — so its value cannot be rotated to fix one
 * side without breaking the other. Separation depends on every consumer having
 * a dedicated variable, and on an operator being able to discover it.
 */
describe("DG_API_KEY separation", () => {
  it("every consumer prefers a dedicated key, with the shared key as fallback", async () => {
    const consumers = [
      ["src/app/api/indexnow/route.ts", "INDEXNOW_API_KEY"],
      ["src/lib/dg-api.ts", "DG_PORTAL_API_KEY"],
      ["packages/platform-core/src/connectors/wordpress/org-connector.ts", "DG_WP_CONNECTOR_API_KEY"],
    ];

    for (const [rel, dedicated] of consumers) {
      const src = await readSource(rel);
      assert.match(
        src,
        new RegExp(
          `process\\.env\\.${dedicated}\\?\\.trim\\(\\)\\s*\\|\\|\\s*process\\.env\\.DG_API_KEY\\?\\.trim\\(\\)`,
        ),
        `${rel} must try ${dedicated} before DG_API_KEY`,
      );
    }
  });

  it("keeps the shared key accepted so no active integration is broken", async () => {
    // Separation is staged: the dedicated vars must be settable BEFORE the
    // shared key is withdrawn, because the outbound ones must match what the
    // remote WordPress install already expects.
    const src = await readSource("src/lib/dg-api.ts");
    assert.match(src, /process\.env\.DG_API_KEY/, "removal requires operator action first");
  });

  it("documents the dedicated keys so an operator can actually set them", async () => {
    const example = await readSource(".env.example");
    const verify = await readSource("scripts/verify-env.mjs");

    for (const key of [
      "INDEXNOW_API_KEY",
      "DG_ADDRESS_RESOLVE_API_KEY",
      "DG_PORTAL_API_KEY",
    ]) {
      assert.ok(example.includes(key), `.env.example must mention ${key}`);
      assert.ok(verify.includes(key), `verify-env.mjs must report ${key}`);
    }
  });

  it("does not require the dedicated keys before they are provisioned", async () => {
    const verify = await readSource("scripts/verify-env.mjs");
    for (const key of ["INDEXNOW_API_KEY", "DG_ADDRESS_RESOLVE_API_KEY", "DG_PORTAL_API_KEY"]) {
      const at = verify.indexOf(key);
      const block = verify.slice(at, at + 240);
      assert.match(block, /required: false/, `${key} must not be required yet`);
    }
  });

  it("no longer tells operators to authenticate IndexNow with the shared key", async () => {
    const doc = await readSource("docs/SEARCH-INDEXING.md");
    assert.doesNotMatch(doc, /X-API-Key: \$DG_API_KEY/);
    assert.match(doc, /INDEXNOW_API_KEY/);
  });
});
