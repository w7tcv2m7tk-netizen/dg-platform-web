import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
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

// Exercise the actual server shell with no writable dependencies, not only its decision helper.

function loaderFixture(organisations, clerkUserId = "user-a") {
  const jsx = (type, props) => ({ type, props });
  const modules = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    "@dg/platform-core": { listUserOrganisations: async id => { assert.equal(id, clerkUserId); return organisations; } },
    "@/components/PlatformShell": { PlatformShell: "platform-shell" },
    "@/components/platform/SessionRecovery": { SessionRecovery: "session-recovery" },
    "@/lib/org-apps": { getOrgEnabledAppIdsCached: async () => [], getOrgIndustrySelectionIdsCached: async () => [] },
    "@/lib/org-brand-theme": { getOrgBrandThemeCached: async () => null },
    "@/lib/platform-page-context": { getPlatformPageContext: async () => ({ session: null, clerkUserId, activeOrganisationId: "stale-org" }) },
    "@/lib/session-recovery": { resolveSessionRecovery },
    "@/lib/onboarding/vip-customer-presets": {}, "@/lib/finance-app-access": {},
    "@dg/platform-core/industry/purchase-authority": {},
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync("src/components/PlatformShellLoader.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => { if (!Object.hasOwn(modules, name)) throw Error("Unexpected dependency"); return modules[name]; } });
  return exports.PlatformShellLoader;
}

test("memberless stale-cookie shell preserves first-business onboarding children without provisioning", async () => {
  const child = { type: "first-business-onboarding" };
  const rendered = await loaderFixture([])({ children: child });
  assert.equal(rendered.type, "fragment");
  assert.equal(rendered.props.children, child);
});

test("stale-cookie member still gets only the explicit authorised organisation chooser", async () => {
  const rendered = await loaderFixture(memberships)({ children: "must-not-render" });
  assert.equal(rendered.type, "session-recovery");
  assert.equal(rendered.props.organisations, memberships);
});

test("signed-out stale-cookie shell cannot acquire tenant context", async () => {
  const rendered = await loaderFixture([], null)({ children: "public-entry" });
  assert.equal(rendered.props.children, "public-entry");
});

function firstOrganisationFixture({ organisations = [], authenticated = true, existingSession = null } = {}) {
  const creates = []; const cookies = [];
  const modules = {
    '@dg/platform-core': {
      listUserOrganisations: async () => organisations,
      createOrganisationForUser: async input => { creates.push(input); return { organisationId: 'new-fixture-org' }; },
    },
    '@clerk/nextjs/server': { auth: async () => ({ userId: authenticated ? 'user-a' : null }),
      currentUser: async () => authenticated ? { primaryEmailAddress: { emailAddress: 'fixture@example.invalid' }, fullName: 'Fixture' } : null },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/active-org-cookie': { writeActiveOrganisationId: async id => cookies.push(id) },
    '@/lib/active-platform-session': { resolveActivePlatformSession: async () => existingSession },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/app/api/v1/org/create/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => { if (!Object.hasOwn(modules, name)) throw Error('Unexpected dependency'); return modules[name]; } });
  return { creates, cookies, post: () => exports.POST(new Request('https://fixture.invalid/api/v1/org/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstOrganisation: true, name: 'Explicit fixture', template: 'default' }),
  })) };
}
test('verified memberless user can explicitly create first business after stale selection', async () => {
  const h = firstOrganisationFixture(); assert.equal((await h.post()).status, 200);
  assert.equal(h.creates.length, 1); assert.deepEqual(h.cookies, ['new-fixture-org']);
});
for (const options of [{ organisations: memberships }, { existingSession: { organisationId: 'org-a' } }]) {
  test('existing membership cannot be duplicated through first-business entry '+JSON.stringify(options), async () => {
    const h = firstOrganisationFixture(options); assert.equal((await h.post()).status, 409);
    assert.equal(h.creates.length, 0); assert.equal(h.cookies.length, 0);
  });
}
test('signed-out first-business request cannot create or acquire tenant context', async () => {
  const h = firstOrganisationFixture({ authenticated: false }); assert.equal((await h.post()).status, 401);
  assert.equal(h.creates.length, 0); assert.equal(h.cookies.length, 0);
});
