import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolveSessionRecovery } from "../src/lib/session-recovery.ts";

const memberships = [
  { organisationId: "org-a", organisationName: "Organisation A", organisationSlug: "org-a", membershipId: "m-a", role: "owner", createdAt: "2026-01-01T00:00:00.000Z" },
  { organisationId: "org-b", organisationName: "Organisation B", organisationSlug: "org-b", membershipId: "m-b", role: "member", createdAt: "2026-01-02T00:00:00.000Z" },
];

test("stale tenant with memberships yields an explicit chooser", () => {
  const result = resolveSessionRecovery({
    session: null,
    clerkUserId: "user-a",
    activeOrganisationId: "stale-org",
    organisations: memberships,
  });
  assert.equal(result.kind, "stale");
  assert.equal(result.organisations.length, 2);
});

test("stale tenant without memberships is distinguished from an active session", () => {
  const result = resolveSessionRecovery({
    session: null,
    clerkUserId: "user-a",
    activeOrganisationId: "stale-org",
    organisations: [],
  });
  assert.equal(result.kind, "no_membership");
});

test("active, signed-out and unselected contexts do not show recovery", () => {
  assert.equal(resolveSessionRecovery({
    session: { organisationId: "org-a" },
    clerkUserId: "user-a",
    activeOrganisationId: "stale-org",
    organisations: memberships,
  }).kind, "none");
  assert.equal(resolveSessionRecovery({
    session: null,
    clerkUserId: null,
    activeOrganisationId: "stale-org",
    organisations: memberships,
  }).kind, "none");
  assert.equal(resolveSessionRecovery({
    session: null,
    clerkUserId: "user-a",
    activeOrganisationId: null,
    organisations: [],
  }).kind, "none");
});

test("recovery is visible and exact-tenant creation is guarded", () => {
  const loader = readFileSync("src/components/PlatformShellLoader.tsx", "utf8");
  const create = readFileSync("src/app/api/v1/org/create/route.ts", "utf8");
  const membershipRoute = readFileSync("src/app/api/v1/org/memberships/route.ts", "utf8");
  assert.match(loader, /SessionRecovery/);
  assert.match(loader, /resolveSessionRecovery/);
  assert.match(create, /listUserOrganisations\(userId\)/);
  assert.match(create, /invalid_active_organisation/);
  assert.match(membershipRoute, /auth\(\{ acceptsToken: "session_token" \}\)/);
  assert.match(membershipRoute, /listUserOrganisations\(userId\)/);
});
