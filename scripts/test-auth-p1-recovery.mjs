import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, modules, env = { DATABASE_URL: 'synthetic-only' }) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    process: { env },
    Response,
    require: name => {
      if (!(name in modules)) throw new Error('Unexpected import ' + name);
      return modules[name];
    },
  });
  return exports;
}

const membership = (organisationId = 'target-org', role = 'member', status = 'active') => ({
  id: 'membership-' + organisationId,
  organisationId,
  role,
  status,
  organisation: { name: 'Synthetic target', slug: 'synthetic-target', status: 'active' },
});

function switchHarness({ authenticated = true, membershipRow = membership(), apiKey = false } = {}) {
  const writes = [];
  const invalidations = [];
  const modules = {
    '@dg/platform-core': { resolveUserMembership: async () => membershipRow },
    'next/cache': { revalidateTag: (...args) => invalidations.push(args) },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/active-org-cookie': { writeActiveOrganisationId: async id => writes.push(id) },
    '@/lib/platform-api': {
      isNextResponse: value => value instanceof Response,
      requirePlatformAuth: async () => Response.json({ error: { code: 'database_not_configured' } }, { status: 503 }),
    },
    '@clerk/nextjs/server': { auth: async () => ({ userId: authenticated ? 'user_valid' : null }) },
  };
  const route = load('src/app/api/v1/org/switch/route.ts', modules);
  return {
    writes,
    invalidations,
    post: body => route.POST(new Request('https://fixture.invalid/api/v1/org/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': 'synthetic' } : {}) },
      body: JSON.stringify(body),
    })),
  };
}

test('stale active-tenant cookie does not block a valid explicit switch', async () => {
  const h = switchHarness({ membershipRow: membership('target-org') });
  const response = await h.post({ organisationId: 'target-org' });
  assert.equal(response.status, 200);
  assert.deepEqual(h.writes, ['target-org']);
  assert.equal(h.invalidations.length, 2);
});

test('switch denies missing target membership without a cookie write', async () => {
  const h = switchHarness({ membershipRow: null });
  assert.equal((await h.post({ organisationId: 'target-org' })).status, 403);
  assert.equal(h.writes.length, 0);
  assert.equal(h.invalidations.length, 0);
});

test('switch denies an unauthenticated request without a cookie write', async () => {
  const h = switchHarness({ authenticated: false, membershipRow: membership('target-org') });
  assert.equal((await h.post({ organisationId: 'target-org' })).status, 401);
  assert.equal(h.writes.length, 0);
});

test('switch denies API-key requests without a cookie write', async () => {
  const h = switchHarness({ membershipRow: membership('target-org'), apiKey: true });
  assert.equal((await h.post({ organisationId: 'target-org' })).status, 403);
  assert.equal(h.writes.length, 0);
});

test('switch rejects malformed tenant IDs without a cookie write', async () => {
  const h = switchHarness();
  for (const body of [null, {}, { organisationId: 3 }, { organisationId: [] }, { organisationId: ' ' }]) {
    assert.equal((await h.post(body)).status, 422);
    assert.equal(h.writes.length, 0);
    assert.equal(h.invalidations.length, 0);
  }
});

function portalHarness({ byClerk = null, byEmail = null } = {}) {
  const calls = [];
  const row = value => value ? {
    ...value,
    organisation: {
      id: value.organisationId,
      name: 'Synthetic org',
      slug: 'synthetic-org',
      status: value.organisation?.status ?? 'active',
      settings: {},
    },
  } : null;
  const matches = (value, where) => {
    if (!value) return false;
    if (where.clerkUserId && value.clerkUserId !== where.clerkUserId) return false;
    if (where.email && value.email !== where.email) return false;
    if (where.organisationId && value.organisationId !== where.organisationId) return false;
    if (where.status && (value.status ?? 'active') !== where.status) return false;
    if (where.organisation?.status?.not && value.organisation?.status === where.organisation.status.not) return false;
    return true;
  };
  const prisma = {
    membership: {
      findFirst: async args => {
        calls.push(args);
        const where = args.where ?? {};
        if (where.clerkUserId) return matches(byClerk, where) ? row(byClerk) : null;
        if (where.email) return matches(byEmail, where) ? row(byEmail) : null;
        return null;
      },
    },
    platformSubscription: { findUnique: async () => null },
  };
  return { calls, profile: load('packages/platform-core/src/org/portal-profile.ts', { '@dg/database': { prisma } }) };
}

test('cached email cannot link another Clerk user to a profile', async () => {
  const h = portalHarness({
    byEmail: { clerkUserId: 'user_other', email: 'cached@fixture.invalid', displayName: 'Other' },
  });
  const result = await h.profile.resolvePortalProfileFromNeon({ email: 'cached@fixture.invalid', clerkUserId: 'user_current' });
  assert.equal(result.linked, false);
  assert.equal(result.org_name, undefined);
  assert.ok(!h.calls.some(call => call.where?.email));
});

test('active exact membership links the authenticated Clerk user', async () => {
  const h = portalHarness({
    byClerk: { clerkUserId: 'user_current', organisationId: 'target-org', email: 'current@fixture.invalid', displayName: 'Current' },
  });
  const result = await h.profile.resolvePortalProfileFromNeon({ email: 'current@fixture.invalid', clerkUserId: 'user_current', organisationId: 'target-org' });
  assert.equal(result.linked, true);
  assert.equal(result.clerk_user_id, 'user_current');
  assert.equal(h.calls[0].where.status, 'active');
});

test('revoked or archived membership cannot link a profile', async () => {
  for (const status of ['revoked', 'archived']) {
    const h = portalHarness({
      byClerk: { clerkUserId: 'user_current', email: 'current@fixture.invalid', status: status === 'revoked' ? 'revoked' : 'active', organisation: { status: status === 'archived' ? 'archived' : 'active' } },
    });
    const result = await h.profile.resolvePortalProfileFromNeon({ email: 'current@fixture.invalid', clerkUserId: 'user_current', organisationId: 'target-org' });
    assert.equal(result.linked, false);
  }
});

test('shell resolves the active session before binding the profile to that exact tenant', async () => {
  const calls = [];
  const modules = {
    '@clerk/nextjs/server': {
      currentUser: async () => ({
        id: 'user_current',
        primaryEmailAddress: { emailAddress: 'current@fixture.invalid' },
        fullName: 'Current User',
      }),
    },
    '@dg/platform-core': { getDefaultEnabledAppIds: () => [], resolveEnabledAppIds: () => [] },
    react: { cache: fn => fn },
    '@/lib/active-platform-session': {
      resolveActivePlatformSession: async input => {
        calls.push(['session', input]);
        return { organisationId: 'active-org' };
      },
    },
    '@/lib/native-portal-profile': {
      resolveNativePortalProfile: async (...args) => {
        calls.push(['portal', ...args]);
        return { org_name: 'Active org' };
      },
    },
    '@/lib/industry-app-selection': { organisationIndustrySelectionIds: () => [] },
  };
  const page = load('src/lib/platform-page-context.ts', modules);
  const result = await page.getPlatformPageContext();
  assert.equal(result.session.organisationId, 'active-org');
  assert.deepEqual(calls[0][0], 'session');
  assert.deepEqual(calls[1], ['portal', 'current@fixture.invalid', 'user_current', 'active-org']);
});
