import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createFirstOrganisationForUser, decideFirstOrganisation } from "../packages/platform-core/src/org/memberships.ts";
import { hasVerifiedPrimaryEmail, matchesSignedInClerkIdentity } from "../src/lib/first-organisation-auth.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
let activeFakeDatabase;

function firstOrganisationFakeDatabase(initialMemberships = []) {
  let organisations = [];
  let memberships = initialMemberships;
  let transactionTail = Promise.resolve();
  let nextId = 1;
  const database = {
    lockCount: 0,
    async $transaction(callback) {
      let release;
      const previous = transactionTail;
      transactionTail = new Promise((resolve) => { release = resolve; });
      await previous;
      const stagedOrganisations = [...organisations];
      const stagedMemberships = [...memberships];
      const tx = {
        async $executeRaw() { database.lockCount += 1; },
        membership: {
          async findMany({ where }) {
            return stagedMemberships.filter((membership) => membership.clerkUserId === where.clerkUserId);
          },
        },
        organisation: {
          async findUnique({ where }) {
            return stagedOrganisations.find((org) => org.slug === where.slug) ?? null;
          },
          async create({ data }) {
            const organisation = { id: `org-${nextId++}`, name: data.name, slug: data.slug };
            const membership = {
              id: `membership-${nextId++}`,
              organisationId: organisation.id,
              clerkUserId: data.memberships.create.clerkUserId,
              role: data.memberships.create.role,
              status: data.memberships.create.status,
              organisation,
            };
            stagedOrganisations.push(organisation);
            stagedMemberships.push(membership);
            return { ...organisation, memberships: [membership] };
          },
        },
      };
      try {
        const result = await callback(tx);
        organisations = stagedOrganisations;
        memberships = stagedMemberships;
        return result;
      } finally {
        release();
      }
    },
    seedMemberships(rows) { memberships.push(...rows); },
    snapshot() { return { organisations, memberships }; },
  };
  return database;
}

describe("first organisation bootstrap", () => {
  it("allows explicit creation for a user with no active organisation", () => {
    assert.deepEqual(decideFirstOrganisation([]), { kind: "create" });
  });

  it("returns the same owned organisation on a retry without creating again", () => {
    const existing = {
      id: "membership-1",
      organisationId: "org-1",
      role: "owner",
      organisation: { slug: "example-business" },
    };
    assert.deepEqual(decideFirstOrganisation([existing]), {
      kind: "retry",
      result: {
        organisationId: "org-1",
        membershipId: "membership-1",
        slug: "example-business",
        created: false,
      },
    });
  });

  it("creates one organisation and one owner membership atomically across concurrent retries", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalPrisma = globalThis.prisma;
    const database = firstOrganisationFakeDatabase();
    activeFakeDatabase = database;
    process.env.DATABASE_URL = "postgresql://first-org-test.invalid/test";
    globalThis.prisma = database;
    try {
      const input = {
        clerkUserId: "user-first-customer",
        email: "customer@example.test",
        name: "Test Customer",
        orgName: "Test Business",
      };
      const [first, retry] = await Promise.all([
        createFirstOrganisationForUser(input),
        createFirstOrganisationForUser(input),
      ]);
      const snapshot = database.snapshot();
      assert.equal(snapshot.organisations.length, 1);
      assert.equal(snapshot.memberships.length, 1);
      assert.equal(snapshot.memberships[0].role, "owner");
      assert.equal(snapshot.memberships[0].status, "active");
      assert.equal(first.organisationId, retry.organisationId);
      assert.deepEqual([first.created, retry.created].sort(), [false, true]);
      assert.equal(database.lockCount, 2);
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
      if (originalPrisma === undefined) delete globalThis.prisma;
      else globalThis.prisma = originalPrisma;
    }
  });

  it("rejects an existing member without creating or attaching another organisation", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const existing = {
      id: "existing-membership",
      organisationId: "existing-org",
      clerkUserId: "existing-user",
      role: "member",
      status: "active",
      organisation: { id: "existing-org", slug: "existing-org" },
    };
    const database = activeFakeDatabase;
    assert.ok(database, "the transaction fixture is established by the preceding first-customer case");
    database.seedMemberships([existing]);
    process.env.DATABASE_URL = "postgresql://first-org-test.invalid/test";
    try {
      const before = database.snapshot();
      await assert.rejects(
        createFirstOrganisationForUser({
          clerkUserId: "existing-user",
          email: "member@example.test",
          name: "Existing Member",
          orgName: "Must Not Be Created",
        }),
        /existing organisation membership/,
      );
      assert.deepEqual(database.snapshot(), before);
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("does not create or attach an existing member to another organisation", () => {
    const member = {
      id: "membership-2",
      organisationId: "org-2",
      role: "member",
      organisation: { slug: "existing-business" },
    };
    assert.deepEqual(decideFirstOrganisation([member]), { kind: "conflict" });
    assert.deepEqual(decideFirstOrganisation([member, { ...member, id: "membership-3" }]), { kind: "conflict" });
  });

  it("serializes first submissions and atomically creates the owner membership", () => {
    const source = read("packages/platform-core/src/org/memberships.ts");
    const firstPath = source.slice(source.indexOf("export async function createFirstOrganisationForUser"), source.indexOf("async function createOrganisation("));
    assert.match(firstPath, /prisma\.\$transaction\(async \(tx\)/);
    assert.match(firstPath, /pg_advisory_xact_lock/);
    assert.match(firstPath, /tx\.membership\.findMany/);
    assert.match(source, /memberships:\s*\{\s*create:\s*\{[\s\S]*?role:\s*"owner"[\s\S]*?status:\s*"active"/);
  });

  it("requires a verified authenticated Clerk identity and never trusts identity from the request body", () => {
    const route = read("src/app/api/v1/onboarding/first-organisation/route.ts");
    assert.match(route, /const \{ userId \} = await auth\(\)/);
    assert.match(route, /!userId \|\| !matchesSignedInClerkIdentity\(userId, user\)/);
    assert.match(route, /hasVerifiedPrimaryEmail\(user\)/);
    assert.match(route, /clerkUserId:\s*userId/);
    assert.doesNotMatch(route, /body\.clerkUserId|body\.email|requirePlatformAuth/);

    assert.equal(matchesSignedInClerkIdentity(undefined, null), false);
    assert.equal(matchesSignedInClerkIdentity(undefined, { id: "user-1" }), false);
    assert.equal(matchesSignedInClerkIdentity("user-1", { id: "user-2" }), false);
    assert.equal(matchesSignedInClerkIdentity("user-1", { id: "user-1" }), true);
    assert.equal(hasVerifiedPrimaryEmail({ id: "user-1" }), false);
    assert.equal(hasVerifiedPrimaryEmail({
      id: "user-1",
      primaryEmailAddress: { verification: { status: "unverified" } },
    }), false);
    assert.equal(hasVerifiedPrimaryEmail({
      id: "user-1",
      primaryEmailAddress: { verification: { status: "verified" } },
    }), true);
  });

  it("shows first organisation setup instead of redirecting a verified memberless user to login", () => {
    const page = read("src/app/(shell)/onboarding/page.tsx");
    assert.match(page, /if \(!session\)[\s\S]*?if \(user\)/);
    assert.match(page, /user\.primaryEmailAddress\?\.verification\?\.status === "verified"/);
    assert.match(page, /<FirstOrganisationForm \/>/);
    const form = read("src/components/onboarding/FirstOrganisationForm.tsx");
    assert.match(form, /\/api\/v1\/onboarding\/first-organisation/);
    assert.match(form, /router\.replace\("\/onboarding"\)/);
  });

  it("keeps the approved monthly prices and 14-day trial unchanged", () => {
    const plans = read("packages/platform-core/src/onboarding/gen2-journey.ts");
    assert.match(plans, /id:\s*"starter"[\s\S]*?monthlyCents:\s*9900/);
    assert.match(plans, /monthlyCents:\s*24900/);
    assert.match(plans, /monthlyCents:\s*49900/);
    assert.match(read("packages/platform-core/src/billing/subscription-types.ts"), /trialDays:\s*14/);
  });
});
