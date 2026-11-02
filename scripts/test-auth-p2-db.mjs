import assert from "node:assert/strict";
import { before, test } from "node:test";
import { prisma } from "@dg/database";
import { resolveUserMembership } from "../packages/platform-core/src/org/memberships.ts";
import { fetchPortalMe } from "../src/lib/dg-api.ts";

const token = `${Date.now().toString(36)}_${process.pid}`;
const userA = `user_auth_a_${token}`;
const userB = `user_auth_b_${token}`;
const emailA = `auth-a-${token}@fixture.invalid`;
const emailB = `auth-b-${token}@fixture.invalid`;
const emailMismatch = `auth-cached-${token}@fixture.invalid`;
let orgA;
let orgB;
let archivedOrg;
let membershipA;
let archivedMembership;

before(async () => {
  const marker = process.env.DG_CHECKOUT_DB_MARKER?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  assert.ok(marker, "Refusing auth DB test without a disposable PostgreSQL marker");
  assert.ok(databaseUrl, "Refusing auth DB test without an explicit disposable DATABASE_URL");
  const url = new URL(databaseUrl);
  assert.equal(url.hostname, "127.0.0.1", "Auth DB test requires a local disposable host");
  assert.notEqual(url.port, "5432", "Auth DB test refuses the default PostgreSQL port");
  assert.equal(url.pathname, "/dg_checkout_test", "Auth DB test requires the owned disposable database");
  const [row] = await prisma.$queryRaw`SELECT current_setting('dg.checkout_test_cluster') AS nonce`;
  assert.equal(row.nonce, marker, "Auth DB test marker does not match the server marker");
});

function snapshot(rows) {
  return rows.map(({ id, status, role, organisationId, clerkUserId, updatedAt }) => ({
    id, status, role, organisationId, clerkUserId, updatedAt,
  }));
}

test("setup two distinct Clerk users and organisations", async () => {
  orgA = await prisma.organisation.create({
    data: { name: "Auth Fixture A", slug: `auth-a-${token}` },
  });
  orgB = await prisma.organisation.create({
    data: { name: "Auth Fixture B", slug: `auth-b-${token}` },
  });
  archivedOrg = await prisma.organisation.create({
    data: { name: "Auth Fixture Archived", slug: `auth-archived-${token}`, status: "archived" },
  });

  membershipA = await prisma.membership.create({
    data: {
      organisationId: orgA.id,
      clerkUserId: userA,
      role: "owner",
      status: "active",
      email: emailA,
    },
  });
  await prisma.membership.create({
    data: {
      organisationId: orgB.id,
      clerkUserId: userB,
      role: "admin",
      status: "active",
      email: emailB,
    },
  });
  archivedMembership = await prisma.membership.create({
    data: {
      organisationId: archivedOrg.id,
      clerkUserId: userA,
      role: "member",
      status: "active",
      email: emailA,
    },
  });
});

test("exact membership resolves only the authenticated user's tenant", async () => {
  const exact = await resolveUserMembership(userA, orgA.id);
  assert.equal(exact.organisationId, orgA.id);
  assert.equal(exact.clerkUserId, userA);
  assert.equal(await resolveUserMembership(userA, orgB.id), null);
  assert.equal(await resolveUserMembership(userB, orgA.id), null);
  assert.equal((await resolveUserMembership(userB, orgB.id)).organisationId, orgB.id);
});

test("invalid tenant-switch target fails closed and the exact target still resolves", async () => {
  assert.equal(await resolveUserMembership(userA, "stale-cookie-tenant"), null);
  const recovered = await resolveUserMembership(userA, orgA.id);
  assert.equal(recovered.organisationId, orgA.id);
  assert.equal(recovered.role, "owner");
});

test("cached email cannot link a different user or tenant", async () => {
  const profile = await fetchPortalMe(emailMismatch, userA, orgA.id);
  assert.equal(profile.linked, true);
  assert.equal(profile.org_name, "Auth Fixture A");
  assert.equal(profile.clerk_user_id, userA);

  assert.equal((await fetchPortalMe(emailB, userA, orgB.id)).linked, false);
  assert.equal((await fetchPortalMe(emailA, userA, orgB.id)).linked, false);
  assert.equal((await fetchPortalMe(emailB, userB, orgA.id)).linked, false);
});

test("revoked and archived memberships cannot link a profile", async () => {
  await prisma.membership.update({
    where: { id: archivedMembership.id },
    data: { status: "revoked" },
  });
  assert.equal(await resolveUserMembership(userA, archivedOrg.id), null);
  assert.equal((await fetchPortalMe(emailA, userA, archivedOrg.id)).linked, false);

  await prisma.membership.update({
    where: { id: membershipA.id },
    data: { status: "archived" },
  });
  assert.equal(await resolveUserMembership(userA, orgA.id), null);
  assert.equal((await fetchPortalMe(emailA, userA, orgA.id)).linked, false);

  await prisma.membership.update({
    where: { id: membershipA.id },
    data: { status: "active" },
  });
  await prisma.organisation.update({
    where: { id: orgA.id },
    data: { status: "archived" },
  });
  assert.equal(await resolveUserMembership(userA, orgA.id), null);
  assert.equal((await fetchPortalMe(emailA, userA, orgA.id)).linked, false);
});

test("profile and membership reads do not write session or identity rows", async () => {
  await prisma.organisation.update({
    where: { id: orgA.id },
    data: { status: "active" },
  });
  await prisma.membership.update({
    where: { id: membershipA.id },
    data: { status: "active" },
  });

  const beforeMemberships = snapshot(await prisma.membership.findMany({
    where: { clerkUserId: { in: [userA, userB] } },
    orderBy: { id: "asc" },
  }));
  const beforeOrganisations = snapshot(await prisma.organisation.findMany({
    where: { id: { in: [orgA.id, orgB.id, archivedOrg.id] } },
    orderBy: { id: "asc" },
  }));

  const profile = await fetchPortalMe(emailA, userA, orgA.id);
  assert.equal(profile.linked, true);
  assert.equal((await fetchPortalMe(emailA, userA, null)).linked, false);

  const afterMemberships = snapshot(await prisma.membership.findMany({
    where: { clerkUserId: { in: [userA, userB] } },
    orderBy: { id: "asc" },
  }));
  const afterOrganisations = snapshot(await prisma.organisation.findMany({
    where: { id: { in: [orgA.id, orgB.id, archivedOrg.id] } },
    orderBy: { id: "asc" },
  }));

  assert.deepEqual(afterMemberships, beforeMemberships);
  assert.deepEqual(afterOrganisations, beforeOrganisations);
});
