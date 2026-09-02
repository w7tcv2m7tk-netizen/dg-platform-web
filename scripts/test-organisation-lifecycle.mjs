/**
 * Organisation lifecycle & tenancy invariant (permanent regression guard).
 *
 *   Authentication establishes identity.
 *   Membership establishes tenant context.
 *   Explicit onboarding creates a tenant.
 *
 * These tests FAIL if a new implicit organisation-creation path is introduced.
 * Organisations may be created ONLY through the reviewable allowlist below; and
 * authentication / session / middleware / signup / onboarding / invite-claim
 * paths must never create an organisation.
 *
 * See docs/foundations/ORGANISATION-LIFECYCLE.md.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => path.relative(root, p).replace(/\\/g, "/");
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);

function walk(dir, acc = []) {
  if (!exists(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", ".next", "dist"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|mts)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const SCAN_DIRS = [
  path.join(root, "src"),
  ...(exists(path.join(root, "packages"))
    ? fs
        .readdirSync(path.join(root, "packages"), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => path.join(root, "packages", e.name, "src"))
    : []),
];
const FILES = SCAN_DIRS.flatMap((d) => walk(d));

// The ONLY intentional organisation-creation boundaries. Keep explicit + reviewable.
const CREATE_ALLOWLIST = new Set([
  "packages/platform-core/src/org/memberships.ts", // createOrganisationForUser (explicit /api/v1/org/create)
  "packages/platform-core/src/org/client-org.ts", // createClientOrganisation (operator prospect->client)
  "packages/platform-core/src/wantd/org.ts", // ensureWantdOrganisation (manual singleton script)
  "packages/platform-core/src/demo/seed.ts", // demo/seed tooling
]);

const CREATE_RE = /\borganisation\.create(Many)?\s*\(/;

describe("organisation creation is confined to the explicit allowlist", () => {
  it("no prisma.organisation.create outside the four intentional boundaries", () => {
    const creators = FILES.filter((f) => CREATE_RE.test(read(f))).map(rel).sort();
    const unexpected = creators.filter((f) => !CREATE_ALLOWLIST.has(f));
    assert.deepEqual(
      unexpected,
      [],
      `Organisation creation found outside the allowlist (implicit provisioning?): ${unexpected.join(", ")}`,
    );
    // Sanity: at least the explicit user/create boundary must still exist.
    assert.ok(
      creators.includes("packages/platform-core/src/org/memberships.ts"),
      "createOrganisationForUser boundary is missing",
    );
  });

  it("the removed provisionOrganisation primitive does not exist anywhere", () => {
    const refs = FILES.filter((f) => /provisionOrganisation/.test(read(f))).map(rel);
    assert.deepEqual(refs, [], `provisionOrganisation must not exist: ${refs.join(", ")}`);
  });
});

describe("authentication / session / routing never create a tenant", () => {
  const MUST_NOT_CREATE = [
    "src/app/api/webhooks/clerk/route.ts", // Clerk user.created
    "src/lib/active-platform-session.ts", // session resolution
    "packages/platform-core/src/session/index.ts", // session builder
    "src/middleware.ts", // middleware
    "src/app/api/v1/onboarding/gen2/route.ts", // onboarding (configures existing org)
    "src/app/api/onboarding/route.ts", // onboarding proxy
  ];
  const BANNED = /\borganisation\.create(Many)?\s*\(|provisionOrganisation|createOrganisationForUser|createClientOrganisation/;

  for (const rp of MUST_NOT_CREATE) {
    it(`${rp} does not create an organisation`, () => {
      const abs = path.join(root, rp);
      assert.ok(exists(abs), `expected ${rp} to exist`);
      assert.doesNotMatch(read(abs), BANNED, `${rp} must not create/provision an organisation`);
    });
  }

  it("signup flow never creates an organisation", () => {
    const signup = FILES.filter((f) => rel(f).includes("/signup/"));
    for (const f of signup) {
      assert.doesNotMatch(
        read(f),
        /\borganisation\.create(Many)?\s*\(|provisionOrganisation/,
        `${rel(f)} must not create an organisation`,
      );
    }
  });
});

describe("invite claiming never creates an organisation", () => {
  const teamInvitesPath = "packages/platform-core/src/org/team-invites.ts";

  it("claimTeamInvitesForUser / team-invites module contains no organisation.create", () => {
    assert.doesNotMatch(
      read(path.join(root, teamInvitesPath)),
      CREATE_RE,
      "invite claiming must activate existing memberships, never create an organisation",
    );
  });

  it("claimTeamInvitesForUser with no invite context creates nothing (returns null)", async () => {
    const savedDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL; // no-invite / no-DB path must not throw or create
    try {
      const mod = await import(pathToFileURL(path.join(root, teamInvitesPath)).href);
      const result = await mod.claimTeamInvitesForUser({
        clerkUserId: "user_no_invite",
        email: "nobody@example.com",
      });
      assert.equal(result, null, "no invitation must yield no membership and no organisation");
    } finally {
      if (savedDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = savedDb;
    }
  });
});
