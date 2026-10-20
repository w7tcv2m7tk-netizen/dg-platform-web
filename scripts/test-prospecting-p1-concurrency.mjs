/** Real PostgreSQL concurrency tests; run only via the owned acquisition cluster runner. */
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { setTimeout as delay } from 'node:timers/promises';
import ts from 'typescript';
import { PrismaClient } from '@prisma/client';

const database = new URL(process.env.DATABASE_URL ?? 'file:///');
if (!process.env.DG_ACQUISITION_LOCAL_TEST || database.hostname !== '127.0.0.1' || database.pathname !== '/acquisition_test' || !database.port || database.port === '5432') throw new Error('Use the owned disposable local runner');
const admin = new PrismaClient();
after(() => admin.$disconnect());
const require = createRequire(import.meta.url);
const A = '10000000000';
const B = '10000001004';
const provenance = (abn) => ({ provider: 'abr', verifiedAt: '2026-10-20T00:00:00Z', snapshot: { identifiers: { abn }, entity: { legalName: `Synthetic ${abn}` } } });
let serial = 0;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function services(prisma, publish = async () => {}) {
 const cache = new Map();
 function load(relative) {
  const file = path.resolve('packages/platform-core/src', relative);
  if (cache.has(file)) return cache.get(file);
  const loaded = { exports: {} }; cache.set(file, loaded.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  runInNewContext(source, { module: loaded, exports: loaded.exports, require: name => {
   if (name === '@dg/database') return { prisma };
   if (name.endsWith('/events')) return { platformEvents: { publish } };
   if (name === 'server-only') return {};
   if (name.startsWith('.')) {
    const base = path.resolve(path.dirname(file), name);
    const target = [base + '.ts', path.join(base, 'index.ts')].find(fs.existsSync);
    if (target) return load(path.relative(path.resolve('packages/platform-core/src'), target));
   }
   return require(name);
  }, process: { env: { DATABASE_URL: process.env.DATABASE_URL } }, fetch: () => { throw new Error('External network is forbidden in P1 tests'); }, URL, URLSearchParams, AbortSignal, console, setTimeout, clearTimeout });
  return loaded.exports;
 }
 return { ...load('prospecting-engine/relationship-linking.ts'), ...load('prospecting-engine/crm-conversion.ts') };
}
async function withPool(limit, callback) {
 const name = `dg-p1-pool-${limit}-${++serial}`;
 const url = new URL(database); url.searchParams.set('connection_limit', String(limit)); url.searchParams.set('pool_timeout', '2'); url.searchParams.set('application_name', name);
 const prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
 try { await prisma.$connect(); return await callback(prisma, name); } finally { await prisma.$disconnect(); }
}
async function waitForLockWaiters(name, count) {
 const deadline = Date.now() + 4000;
 while (Date.now() < deadline) {
  const [row] = await admin.$queryRaw`SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name = ${name} AND wait_event_type = 'Lock'`;
  if (row.count === count) return;
  await delay(10);
 }
 throw new Error(`Expected ${count} actual PostgreSQL lock waiters for ${name}`);
}
async function fixture(label) {
 const org = await admin.organisation.create({ data: { name: `P1 synthetic ${label}`, slug: `p1-${label}-${++serial}` } });
 const prospect = await admin.growthProspect.create({ data: { organisationId: org.id, businessName: `P1 synthetic ${label}`, abn: A, identityProvenance: provenance(A), contactName: 'Synthetic Person', contactEmail: `p1-${serial}@example.invalid` } });
 return { org, prospect, input: { organisationId: org.id, prospectId: prospect.id, actorId: 'synthetic-actor' } };
}
async function assertOneConversion(f, result) {
 assert.equal(await admin.company.count({ where: { organisationId: f.org.id } }), 1);
 assert.equal(await admin.contact.count({ where: { organisationId: f.org.id } }), 1);
 assert.equal(await admin.opportunity.count({ where: { organisationId: f.org.id } }), 1);
 assert.equal(await admin.growthProspectEngagement.count({ where: { prospectId: f.prospect.id, type: 'converted_to_crm' } }), 1);
 const company = await admin.company.findUnique({ where: { id: result.companyId } });
 assert.equal(company.abn, A); assert.deepEqual(company.identityProvenance, provenance(A));
 const opportunity = await admin.opportunity.findUnique({ where: { id: result.opportunityId } });
 assert.equal(opportunity.companyId, result.companyId); assert.equal(opportunity.contactId, result.contactId);
 assert.equal(await admin.activity.count({ where: { organisationId: f.org.id, activityType: 'created' } }), 3);
 assert.equal(await admin.auditLog.count({ where: { organisationId: f.org.id } }), 4);
}

await test('Targeted P1 concurrency and transaction regressions', async (t) => {
await t.test('P1-1: shared company locking prevents conflicting concurrent identity assignment', { timeout: 10000 }, async () => {
 const f = await fixture('company-race');
 const second = await admin.growthProspect.create({ data: { organisationId: f.org.id, businessName: 'Other synthetic identity', abn: B, identityProvenance: provenance(B) } });
 const company = await admin.company.create({ data: { organisationId: f.org.id, name: 'Unverified synthetic company' } });
 await withPool(2, async (prisma, name) => {
  const api = services(prisma);
  const held = deferred(), release = deferred();
  const blocker = admin.$transaction(async tx => {
   await tx.$queryRaw`SELECT id FROM companies WHERE id = ${company.id} FOR UPDATE`;
   held.resolve(); await release.promise;
  }, { timeout: 10000 });
  await held.promise;
  let pending;
  try {
   pending = [f.prospect, second].map(p => api.linkAcquisitionRelationship({ ...f.input, prospectId: p.id, companyId: company.id }));
   // Observe both real transactions blocked on the shared company before releasing it.
   await waitForLockWaiters(name, 2);
  } finally { release.resolve(); await blocker; }
  const outcomes = await Promise.allSettled(pending);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  const loserIndex = outcomes.findIndex(r => r.status === 'rejected');
  assert.equal(outcomes[loserIndex].reason.code, 'identity_conflict');
  const winner = [f.prospect, second][1 - loserIndex], loser = [f.prospect, second][loserIndex];
  const assigned = await admin.company.findUnique({ where: { id: company.id } });
  assert.equal(assigned.abn, winner.abn); assert.deepEqual(assigned.identityProvenance, winner.identityProvenance);
  assert.equal((await admin.growthProspect.findUnique({ where: { id: loser.id } })).metadata, null);
  assert.equal(await admin.growthProspectEngagement.count({ where: { prospectId: loser.id } }), 0);
  await api.linkAcquisitionRelationship({ ...f.input, prospectId: winner.id, companyId: company.id });
  assert.deepEqual(await admin.company.findUnique({ where: { id: company.id } }), assigned);
  assert.equal(await admin.growthProspectEngagement.count({ where: { prospectId: winner.id, type: 'relationship_linked' } }), 1);
 });
});

await t.test('P1-1: established conflicting identity rejects linking and preserves provenance', async () => {
 const f = await fixture('established-conflict');
 const company = await admin.company.create({ data: { organisationId: f.org.id, name: 'Established synthetic company', abn: B, identityProvenance: provenance(B) } });
 await assert.rejects(() => services(admin).linkAcquisitionRelationship({ ...f.input, companyId: company.id }), e => e.code === 'identity_conflict');
 assert.deepEqual(await admin.company.findUnique({ where: { id: company.id } }), company);
 assert.equal((await admin.growthProspect.findUnique({ where: { id: f.prospect.id } })).metadata, null);
});

await t.test('P1-1: foreign company and cross-tenant customer links are rejected without changes', async () => {
 const f = await fixture('foreign'), other = await fixture('foreign-target');
 const company = await admin.company.create({ data: { organisationId: other.org.id, name: 'Foreign synthetic company' } });
 const api = services(admin);
 await assert.rejects(() => api.linkAcquisitionRelationship({ ...f.input, companyId: company.id }), e => e.code === 'not_found');
 await assert.rejects(() => api.linkAcquisitionRelationship({ ...f.input, customerOrganisationId: other.org.id }), e => e.code === 'forbidden');
 assert.deepEqual(await admin.company.findUnique({ where: { id: company.id } }), company);
 assert.equal(await admin.membership.count({ where: { organisationId: other.org.id } }), 0);
});

await t.test('P1-2: single conversion and matching retry complete with a one-connection pool', { timeout: 7000 }, async () => {
 const f = await fixture('one-connection');
 await withPool(1, async prisma => {
  const events = [];
  const api = services(prisma, async event => { events.push(event.type); await prisma.opportunity.count(); });
  const first = await api.convertGrowthProspectToCrm(f.input);
  assert.deepEqual(await api.convertGrowthProspectToCrm(f.input), first);
  await assertOneConversion(f, first);
  assert.deepEqual(events, ['company.created', 'contact.created', 'opportunity.created']);
 });
});

for (const retry of [false, true]) await t.test(`P1-2: two-connection concurrent ${retry ? 'same-prospect retries' : 'different-prospect conversions'} complete under forced contention`, { timeout: 10000 }, async () => {
 const f = await fixture(retry ? 'retry-contention' : 'conversion-contention');
 const other = retry ? f.prospect : await admin.growthProspect.create({ data: { organisationId: f.org.id, businessName: 'Second synthetic conversion', abn: B, identityProvenance: provenance(B), contactName: 'Second Person', contactEmail: `second-${serial}@example.invalid` } });
 await withPool(2, async (prisma, name) => {
  const api = services(prisma), held = deferred(), release = deferred();
  const blocker = admin.$transaction(async tx => {
   await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`acquisition-crm:${f.org.id}`}, 0))::text`;
   held.resolve(); await release.promise;
  }, { timeout: 10000 });
  await held.promise;
  let pending;
  try {
   pending = [api.convertGrowthProspectToCrm(f.input), api.convertGrowthProspectToCrm({ ...f.input, prospectId: other.id })];
   await waitForLockWaiters(name, 2);
  } finally { release.resolve(); await blocker; }
  const results = await Promise.all(pending);
  if (retry) { assert.deepEqual(results[0], results[1]); await assertOneConversion(f, results[0]); }
  else {
   assert.notEqual(results[0].companyId, results[1].companyId);
   assert.notEqual(results[0].opportunityId, results[1].opportunityId);
   assert.equal(await admin.company.count({ where: { organisationId: f.org.id } }), 2);
   assert.equal(await admin.opportunity.count({ where: { organisationId: f.org.id } }), 2);
  }
 });
});

await t.test('P1-2: failed conversion rolls back CRM, activities, audit, links and events; retry succeeds', { timeout: 7000 }, async () => {
 const f = await fixture('rollback-retry');
 await withPool(1, async prisma => {
  let fail = true;
  const injected = prisma.$extends({ query: { opportunity: { async create({ args, query }) {
   if (fail) { fail = false; throw new Error('Synthetic opportunity insertion failure'); }
   return query(args);
  } } } });
  const events = [], api = services(injected, async event => { events.push(event.type); });
  await assert.rejects(() => api.convertGrowthProspectToCrm(f.input), /Synthetic opportunity insertion failure/);
  for (const model of ['company', 'contact', 'opportunity', 'activity', 'auditLog']) assert.equal(await admin[model].count({ where: { organisationId: f.org.id } }), 0, model);
  assert.equal((await admin.growthProspect.findUnique({ where: { id: f.prospect.id } })).metadata, null);
  assert.equal(await admin.growthProspectEngagement.count({ where: { prospectId: f.prospect.id } }), 0);
  assert.equal(events.length, 0);
  await assertOneConversion(f, await api.convertGrowthProspectToCrm(f.input));
  assert.deepEqual(events, ['company.created', 'contact.created', 'opportunity.created']);
 });
});

await t.test('P1-2: conflicting company identity and foreign prospect conversion leave records untouched', async () => {
 const f = await fixture('conversion-conflict'), other = await fixture('conversion-foreign');
 const company = await admin.company.create({ data: { organisationId: f.org.id, name: 'Conflicting synthetic company', abn: B, identityProvenance: provenance(B) } });
 await admin.growthProspect.update({ where: { id: f.prospect.id }, data: { metadata: { crm_company_id: company.id } } });
 await withPool(1, async prisma => {
  const api = services(prisma);
  await assert.rejects(() => api.convertGrowthProspectToCrm(f.input), e => e.code === 'identity_conflict');
  assert.equal(await api.convertGrowthProspectToCrm({ ...f.input, prospectId: other.prospect.id }), null);
 });
 assert.deepEqual(await admin.company.findUnique({ where: { id: company.id } }), company);
 assert.equal(await admin.opportunity.count({ where: { organisationId: f.org.id } }), 0);
});

await t.test('P1-2: existing contact-company association survives conversion and repeated conversion', async () => {
 const f = await fixture('associations');
 const company = await admin.company.create({ data: { organisationId: f.org.id, name: 'Existing synthetic company', abn: A, identityProvenance: provenance(A) } });
 const contact = await admin.contact.create({ data: { organisationId: f.org.id, firstName: 'Existing', email: f.prospect.contactEmail, companyId: company.id } });
 await admin.growthProspect.update({ where: { id: f.prospect.id }, data: { metadata: { crm_company_id: company.id, crm_contact_id: contact.id } } });
 await withPool(1, async prisma => {
  const api = services(prisma), first = await api.convertGrowthProspectToCrm(f.input);
  assert.equal(first.companyId, company.id); assert.equal(first.contactId, contact.id);
  assert.deepEqual(await api.convertGrowthProspectToCrm(f.input), first);
 });
 assert.deepEqual(await admin.contact.findUnique({ where: { id: contact.id } }), contact);
 assert.deepEqual(await admin.company.findUnique({ where: { id: company.id } }), company);
});

await t.test('P1-2: deferred event handlers hold no transaction connection while waiting', { timeout: 7000 }, async () => {
 const f = await fixture('external-wait');
 await withPool(1, async prisma => {
  const entered = deferred(), release = deferred();
  let first = true;
  const api = services(prisma, async () => { if (first) { first = false; entered.resolve(); await release.promise; } });
  const pending = api.convertGrowthProspectToCrm(f.input);
  pending.catch(() => {}); // Observe early failure while waiting for the event barrier.
  try {
   await Promise.race([entered.promise, delay(4000).then(() => { throw new Error('No post-commit event'); })]);
   // Only connection remains available while a simulated external handler is blocked.
   assert.equal(await prisma.opportunity.count({ where: { organisationId: f.org.id } }), 1);
   assert.equal(await prisma.growthProspectEngagement.count({ where: { prospectId: f.prospect.id, type: 'converted_to_crm' } }), 1);
  } finally { release.resolve(); await pending; }
 });
});

});
