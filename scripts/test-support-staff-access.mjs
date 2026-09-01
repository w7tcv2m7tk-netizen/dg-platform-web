import test from "node:test";
import assert from "node:assert/strict";

function isStaffAccess(session, canAccessCommandCentre) {
  if (!session) return false;
  return canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
}

test("support staff access requires Command Centre authority", () => {
  const tenant = {
    organisationId: "org_tenant",
    organisationName: "Tenant",
    organisationSlug: "tenant",
    role: "org:admin",
  };

  assert.equal(isStaffAccess(tenant, () => false), false);
  assert.equal(isStaffAccess(tenant, () => true), true);
  assert.equal(isStaffAccess(null, () => true), false);
});

test("email-domain identity is not consulted by support access", () => {
  const tenant = { organisationId: "org_tenant", role: "org:admin" };
  let called = false;
  const authority = () => {
    called = true;
    return false;
  };

  assert.equal(isStaffAccess(tenant, authority), false);
  assert.equal(called, true);
});
