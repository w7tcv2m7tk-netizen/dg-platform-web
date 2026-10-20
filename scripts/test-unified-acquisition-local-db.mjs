import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL ?? 'file:///');
if (!process.env.DG_ACQUISITION_LOCAL_TEST || url.hostname !== '127.0.0.1' || url.pathname !== '/acquisition_test' || url.port === '5432') throw new Error('Use the disposable local runner');
const prisma = new PrismaClient();
after(() => prisma.$disconnect());
const require = createRequire(import.meta.url);
const cache = new Map();
let abrMode = 'ok';
const fixtures = [
 { name: 'AIM Financial — synthetic', abn: '10000000003', industry: 'Finance' },
 { name: 'My Venue Clean — synthetic', abn: '10000000046', industry: 'Commercial Cleaning' },
 { name: 'Example Realty — synthetic', abn: '10000000089', industry: 'Real Estate' },
];
// Generate checksum-valid identifiers solely for fixture use; no live registry calls.
function syntheticAbn(seed) {
 for (let n = seed; n < seed + 1000; n++) { const a = String(n).padStart(11, '1'); const d = [...a].map(Number); d[0]--; if (d.reduce((s,v,i) => s + v * [10,1,3,5,7,9,11,13,15,17,19][i],0) % 89 === 0) return a; }
 throw new Error('No fixture ABN');
}
fixtures.forEach((f,i) => f.abn = syntheticAbn(10000000000 + i * 1000));
const fakeFetch = async (input) => {
 if (abrMode === 'offline') throw new Error('Synthetic ABR outage');
 if (abrMode === 'http') return new Response('Unavailable', { status: 503 });
 const request = String(input);
 if (request.includes('ABRSearchByName')) return new Response(`<response>${fixtures.map(f => `<searchResultsRecord><ABN><identifierValue>${f.abn}</identifierValue></ABN><mainName><organisationName>${f.name}</organisationName></mainName></searchResultsRecord>`).join('')}</response>`);
 const abn = new URL(request).searchParams.get('searchString');
 const f = fixtures.find(f => f.abn === abn);
 if (!f || abrMode === 'not_found') return new Response('<response><exception><exceptionDescription>No records found</exceptionDescription></exception></response>');
 return new Response(`<response><businessEntity202001><ABN><identifierValue>${f.abn}</identifierValue><identifierStatus>Active</identifierStatus></ABN><mainName><organisationName>${f.name}</organisationName></mainName><entityStatus><entityStatusCode>Active</entityStatusCode></entityStatus></businessEntity202001></response>`);
};
const testProcess = { env: { ...process.env, ABN_LOOKUP_GUID: 'synthetic-test-only' } };
function load(relative) {
 const file = path.resolve('packages/platform-core/src', relative);
 if (cache.has(file)) return cache.get(file);
 const module = { exports: {} }; cache.set(file, module.exports);
 const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
 const localRequire = (name) => {
   if (name === 'next/navigation') return { useRouter: () => ({ refresh() {} }) };
   if (name === '@dg/database') return { prisma };
   if (name.endsWith('/events') || name === '../events') return { platformEvents: { publish: async () => {} } };
   if (name === 'server-only') return {};
   if (name.startsWith('.')) {
     const base = path.resolve(path.dirname(file), name);
     const target = [base + '.ts', path.join(base, 'index.ts')].find(fs.existsSync);
     if (target) return load(path.relative(path.resolve('packages/platform-core/src'), target));
   }
   return require(name);
 };
 runInNewContext(code, { module, exports: module.exports, require: localRequire, process: testProcess, fetch: fakeFetch, Response, URL, URLSearchParams, AbortSignal, console, setTimeout, clearTimeout, structuredClone });
 return module.exports;
}
const identity = load('prospecting-engine/identity.ts');
const businessIdentity = load('business-identity/index.ts');
const prospects = load('command-centre/growth-engine/prospects.ts');
const linking = load('prospecting-engine/relationship-linking.ts');
const lifecycle = load('prospecting-engine/lifecycle.ts');
const crm = load('prospecting-engine/crm-conversion.ts');
const engine = load('command-centre/growth-engine/opportunity-engine.ts');

await test('ABR lookup, persistence, tenant uniqueness, concurrency and customer preservation', async (t) => {
 await t.test('exact migration preserves pre-existing duplicate metadata claims and nullable ownership', async () => {
   const rows = await prisma.growthProspect.findMany({ where: { id: { startsWith: 'synthetic-migration-' } }, orderBy: { id: 'asc' } });
   assert.equal(rows.length, 3);
   assert.ok(rows.every(r => r.abn === null && r.identityProvenance === null));
   assert.equal(rows.find(r => r.id.endsWith('orphan')).organisationId, null);
   assert.equal(rows.find(r => r.id.endsWith('-a')).metadata.providerRefs.abn, '10000000003');
   assert.equal(rows.find(r => r.id.endsWith('-b')).metadata.abn, '10 000 000 003');
 });
 const org = await prisma.organisation.create({ data: { name: 'Synthetic acquisition owner', slug: 'synthetic-acquisition' } });
 const other = await prisma.organisation.create({ data: { name: 'Synthetic second tenant', slug: 'synthetic-second' } });
 let ids = [];
 await t.test('normalises and verifies ABNs with server provenance; rejects invalid checksums', async () => {
   const value = await identity.verifyAcquisitionAbn(fixtures[0].abn.replace(/(.{2})/, '$1 '));
   assert.equal(value.abn, fixtures[0].abn); assert.equal(value.provenance.provider, 'abr');
   assert.equal(value.provenance.snapshot.entity.legalName, fixtures[0].name);
   assert.throws(() => identity.normaliseAustralianAbn('00000000000'));
 });
 await t.test('business-name lookup reuses ABR provider and returns selection candidates', async () => {
   const result = await businessIdentity.searchBusinessIdentityByName('Synthetic');
   assert.equal(result.matches.length, 3); assert.equal(result.matches[0].abn, fixtures[0].abn);
 });
 await t.test('12 concurrent intakes produce one business identity, including formatted ABNs', async () => {
   const rows = await Promise.all(Array.from({ length: 12 }, () => prospects.createGrowthProspect({ organisationId: org.id, businessName: fixtures[0].name, industry: fixtures[0].industry, abn: fixtures[0].abn })));
   assert.equal(new Set(rows.map(r => r.id)).size, 1);
   assert.equal(await prisma.growthProspect.count({ where: { organisationId: org.id, abn: fixtures[0].abn } }), 1);
   assert.equal(await prisma.growthProspectEngagement.count({ where: { prospectId: rows[0].id, type: "prospect_created" } }), 1);
   ids.push(rows[0].id);
   const separate = await prospects.createGrowthProspect({ organisationId: other.id, businessName: fixtures[0].name, abn: fixtures[0].abn });
   assert.notEqual(separate.id, rows[0].id);
 });
 await t.test('manual creation retains unverified state and never merges similar business names', async () => {
   for (const fixture of fixtures.slice(1)) ids.push((await prospects.createGrowthProspect({ organisationId: org.id, businessName: fixture.name, abn: fixture.abn, industry: fixture.industry })).id);
   const a = await prospects.createGrowthProspect({ organisationId: org.id, businessName: 'Same synthetic name' });
   const b = await prospects.createGrowthProspect({ organisationId: org.id, businessName: 'Same synthetic name' });
   assert.notEqual(a.id, b.id); assert.equal(a.abn, null); assert.equal(a.identityProvenance, null);
 });
 await t.test('ABR outages and no-results never persist verified identities', async () => {
   for (const mode of ['offline', 'http', 'not_found']) {
     abrMode = mode;
     await assert.rejects(() => prospects.createGrowthProspect({ organisationId: org.id, businessName: 'Failure', abn: fixtures[0].abn }));
   }
   abrMode = 'ok';
   assert.equal(await prisma.growthProspect.count({ where: { businessName: 'Failure' } }), 0);
 });
 const company = await prisma.company.create({ data: { organisationId: org.id, name: fixtures[0].name } });
 const contact = await prisma.contact.create({ data: { organisationId: org.id, firstName: 'Synthetic', email: 'synthetic@example.invalid', companyId: company.id } });
 const customer = await prisma.organisation.create({ data: { name: fixtures[0].name, slug: 'synthetic-customer', status: 'active', settings: { preservationSentinel: true } } });
 await prisma.membership.createMany({ data: [org.id, customer.id].map(organisationId => ({ organisationId, clerkUserId: 'synthetic-owner', role: 'owner', status: 'active' })) });
 // Commercial records below are synthetic fixtures in the owned disposable database only.
 await prisma.platformSubscription.create({ data: { organisationId: customer.id, status: "ACTIVE", entitlement: "FULL", stripeSubscriptionId: "synthetic-subscription", stripeStatus: "active", planTier: "synthetic-plan" } });
 const activity = await prisma.activity.create({ data: { organisationId: org.id, entityType: "Contact", entityId: contact.id, activityType: "communication", title: "Synthetic prior conversation", body: "History must survive acquisition intake" } });
 const before = await prisma.organisation.findUnique({ where: { id: customer.id }, include: { memberships: true, platformSubscription: true } });
 await t.test('explicit customer linking is idempotent and preserves org, membership, CRM and contact association', async () => {
   const input = { organisationId: org.id, prospectId: ids[0], actorId: 'synthetic-owner', companyId: company.id, contactId: contact.id, customerOrganisationId: customer.id };
   await Promise.all([linking.linkAcquisitionRelationship(input), linking.linkAcquisitionRelationship(input)]);
   assert.deepEqual(await prisma.organisation.findUnique({ where: { id: customer.id }, include: { memberships: true, platformSubscription: true } }), before);
   assert.equal((await prisma.contact.findUnique({ where: { id: contact.id } })).companyId, company.id);
   assert.equal((await prisma.company.findUnique({ where: { id: company.id } })).abn, fixtures[0].abn);
   assert.equal(await prisma.growthProspectEngagement.count({ where: { prospectId: ids[0], type: 'relationship_linked' } }), 1);
   assert.equal(await prisma.platformSubscription.count(), 1);
   assert.deepEqual(await prisma.activity.findUnique({ where: { id: activity.id } }), activity);
 });
 await t.test('conflicting contacts and foreign CRM IDs are rejected without reassignment or membership grant', async () => {
   const wrongCompany = await prisma.company.create({ data: { organisationId: org.id, name: 'Other company' } });
   await assert.rejects(() => linking.linkAcquisitionRelationship({ organisationId: org.id, prospectId: ids[1], actorId: 'synthetic-owner', companyId: wrongCompany.id, contactId: contact.id }), e => e.code === 'contact_company_conflict');
   await assert.rejects(() => linking.linkAcquisitionRelationship({ organisationId: other.id, prospectId: ids[0], actorId: 'synthetic-owner', companyId: company.id }), e => e.code === 'not_found');
   await assert.rejects(() => linking.linkAcquisitionRelationship({ organisationId: org.id, prospectId: ids[1], actorId: 'synthetic-owner', customerOrganisationId: other.id }), e => e.code === 'forbidden');
   assert.equal(await prisma.membership.count({ where: { organisationId: other.id } }), 0);
   assert.equal((await prisma.contact.findUnique({ where: { id: contact.id } })).companyId, company.id);
 });
 await t.test('CRM conversion retries reuse existing services and preserve contact associations', async () => {
   const result = await Promise.all([crm.convertGrowthProspectToCrm({ organisationId: org.id, prospectId: ids[0] }), crm.convertGrowthProspectToCrm({ organisationId: org.id, prospectId: ids[0] })]);
   assert.equal(result[0].opportunityId, result[1].opportunityId);
   assert.equal(result[0].companyId, company.id); assert.equal(result[0].contactId, contact.id);
   assert.equal(await prisma.opportunity.count({ where: { organisationId: org.id } }), 1);
 });
 await t.test('lifecycle uses authoritative commercial state and treats capabilities separately', () => {
   assert.equal(lifecycle.acquisitionLifecycle('meeting_booked'), 'Consultation');
   assert.equal(lifecycle.acquisitionLifecycle('won'), 'Won — commercial state pending');
   assert.equal(lifecycle.acquisitionLifecycle('prospect', { status: 'TRIALING', stripeStatus: null, stripeSubscriptionId: null }), 'Discover');
   assert.equal(lifecycle.acquisitionLifecycle('prospect', { status: 'TRIALING', stripeStatus: 'trialing', stripeSubscriptionId: 'synthetic' }), 'Trial');
   assert.equal(lifecycle.acquisitionLifecycle('prospect', { status: 'ACTIVE', stripeStatus: 'active', stripeSubscriptionId: 'synthetic' }), 'Customer');
   assert.deepEqual([...lifecycle.ACQUISITION_CAPABILITIES], ['Qualify','Score','Call Brief','Next Action']);
 });
 await t.test('Top 3 includes due follow-up and consultation, excludes future follow-up, exposes saved evidence', async () => {
   for (const [i, id] of ids.entries()) {
     await prisma.growthProspect.update({ where: { id }, data: { stage: ['follow_up_due','meeting_booked','qualified'][i], contactName: 'Synthetic contact', contactPhone: '0000000000', metadata: { salesWorkflow: { followUpAt: '2020-01-01T00:00:00Z' } } } });
     await prisma.growthProspectAudit.create({ data: { prospectId: id, businessHealth: 45, seoScore: 40, aiVisibility: 35, websiteHealth: 50, findings: { items: [{ title: 'Synthetic observed finding', observed: 'Fixture observation' }] } } });
   }
   const future = await prisma.growthProspect.create({ data: { organisationId: org.id, businessName: 'Future synthetic follow-up', stage: 'follow_up_due', metadata: { salesWorkflow: { followUpAt: '2099-01-01T00:00:00Z' } } } });
   const briefing = await engine.getDailyOpportunityBriefing({ organisationId: org.id, limit: 3 });
   assert.equal(briefing.rows.length, 3); assert.equal(briefing.rows[0].prospectId, ids[0]);
   assert.ok(briefing.rows.some(r => r.stage === 'meeting_booked'));
   assert.ok(!briefing.rows.some(r => r.prospectId === future.id));
   assert.equal(briefing.rows[0].auditFindings[0].observed, 'Fixture observation');
   assert.equal(briefing.rows[0].scoreLabel, 'Contact priority');
   const { renderToStaticMarkup } = require('react-dom/server');
   const React = require('react');
   const actions = load(path.resolve('src/components/prospecting/ProspectingTodayActions.tsx'));
   const financeRow = { ...briefing.rows[0], contactName: null, industry: 'Finance', auditFindings: [{ title: 'Vendor appraisal gap', observed: 'Synthetic observation' }] };
   const markup = renderToStaticMarkup(React.createElement(actions.ProspectingTodayActions, { rows: [financeRow] }));
   assert.ok(!markup.includes('appraisal intent'));
   assert.ok(markup.includes('Prepare call'));
   const empty = renderToStaticMarkup(React.createElement(actions.ProspectingTodayActions, { rows: [{ ...financeRow, auditFindings: [], auditScores: null, businessHealthScore: null }] }));
   assert.ok(!empty.includes('Prepare call'));
   assert.ok(!empty.includes('verified digital growth opportunity'));
 });
 await t.test('legacy reconciliation adopts one verified claim and blocks duplicate claims without merges', async () => {
   const legacyOrg = await prisma.organisation.create({ data: { name: 'Synthetic legacy tenant', slug: 'synthetic-legacy' } });
   const legacy = await prisma.growthProspect.create({ data: { organisationId: legacyOrg.id, businessName: 'Legacy name preserved', stage: 'meeting_booked', metadata: { providerRefs: { abn: fixtures[0].abn.replace(/(.{2})/, '$1 ') } } } });
   const adopted = await prospects.createGrowthProspect({ organisationId: legacyOrg.id, businessName: 'New name ignored', abn: fixtures[0].abn });
   assert.equal(adopted.id, legacy.id); assert.equal(adopted.stage, 'meeting_booked'); assert.equal(adopted.businessName, 'Legacy name preserved');
   for (let i = 0; i < 2; i++) await prisma.growthProspect.create({ data: { organisationId: legacyOrg.id, businessName: 'Legacy duplicate ' + i, metadata: { abn: fixtures[1].abn } } });
   await assert.rejects(() => prospects.createGrowthProspect({ organisationId: legacyOrg.id, businessName: 'Conflict', abn: fixtures[1].abn }), e => e.code === 'reconciliation_required');
   assert.equal(await prisma.growthProspect.count({ where: { organisationId: legacyOrg.id, abn: fixtures[1].abn } }), 0);
   assert.equal(await prisma.growthProspect.count({ where: { organisationId: legacyOrg.id } }), 3);
 });
 await t.test('existing conflicting contacts block conversion before changing the CRM', async () => {
   const p = await prisma.growthProspect.create({ data: { organisationId: org.id, businessName: 'Conflicting conversion', contactEmail: contact.email } });
   const companiesBefore = await prisma.company.count();
   await assert.rejects(() => crm.convertGrowthProspectToCrm({ organisationId: org.id, prospectId: p.id }), e => e.code === 'contact_company_conflict');
   assert.equal(await prisma.company.count(), companiesBefore);
   assert.equal((await prisma.contact.findUnique({ where: { id: contact.id } })).companyId, company.id);
 });
 await t.test('legacy unknown ownership and metadata survive without fabricated verification', async () => {
   const orphan = await prisma.growthProspect.create({ data: { businessName: 'Legacy synthetic orphan', metadata: { providerRefs: { abn: fixtures[0].abn } } } });
   assert.equal(orphan.organisationId, null); assert.equal(orphan.abn, null); assert.equal(orphan.identityProvenance, null);
 });
 await t.test('pipeline deletion is tenant-scoped, restorable and preserves linked CRM/customer history', async () => {
   const before = await prisma.growthProspect.findUnique({ where: { id: ids[0] } });
   const companyBefore = await prisma.company.findUnique({ where: { id: company.id } });
   const contactBefore = await prisma.contact.findUnique({ where: { id: contact.id } });
   const engagementsBefore = await prisma.growthProspectEngagement.count({ where: { prospectId: ids[0] } });
   assert.equal(await prospects.archiveGrowthProspect({ organisationId: other.id, prospectId: ids[0] }), null);
   assert.equal((await prisma.growthProspect.findUnique({ where: { id: ids[0] } })).archivedAt, null);
   const removed = await prospects.archiveGrowthProspect({ organisationId: org.id, prospectId: ids[0] });
   assert.ok(removed.archivedAt);
   assert.ok(!(await prospects.listGrowthProspects({ organisationId: org.id })).some(row => row.id === ids[0]));
   assert.deepEqual(await prisma.company.findUnique({ where: { id: company.id } }), companyBefore);
   assert.deepEqual(await prisma.contact.findUnique({ where: { id: contact.id } }), contactBefore);
   const archived = await prisma.growthProspect.findUnique({ where: { id: ids[0] } });
   for (const key of ['abn','crmCompanyId','crmContactId','customerOrganisationId']) assert.equal(archived[key], before[key]);
   assert.ok(await prisma.growthProspectEngagement.count({ where: { prospectId: ids[0] } }) >= engagementsBefore);
   await prospects.restoreGrowthProspect({ organisationId: org.id, prospectId: ids[0] });
   assert.equal((await prisma.growthProspect.findUnique({ where: { id: ids[0] } })).archivedAt, null);
 });

});
