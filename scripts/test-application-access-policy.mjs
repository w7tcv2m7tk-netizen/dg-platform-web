import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { hasCanonicalSubscriptionExemption, hasApplicationCommercialExemption } from '../packages/platform-core/src/access/application-authority.ts';
import { hasPlatformAuthority } from '../packages/platform-core/src/access/platform-authority.ts';
import { industryAppAccessDecision, authorisedPremiumPurchaseKeys } from '../packages/platform-core/src/industry/purchase-authority.ts';
import { resolveIndustryEntitlements } from '../packages/platform-core/src/industry/entitlements.ts';
import { sessionHasFeature } from '../packages/platform-core/src/features/access.ts';
import { resolveFinanceAppAccessState } from '../src/lib/finance-app-access-policy.ts';
import { organisationHasSelectedIndustryApp } from '../src/lib/industry-app-selection.ts';

const tenant = 'synthetic-tenant';
const exempt = { organisationId: tenant, platformExempt: true };
const actor = { organisationId: tenant, role: 'owner', principalId: 'synthetic-human' };
const session = { organisationId: tenant, role: 'owner', clerkUserId: 'synthetic-human', premiumPurchaseKeys: [] };
for (const label of ['DigitalGate','Roe Realty','Currumbin Valley Hideaway','Aëtherra','Wantd','Harbour & Co']) test(`${label}: canonical exemption grants commercial access, never operator authority`, () => {
  // Labels are descriptions, not identity inputs. Actual Production IDs remain unverified.
  assert.equal(hasCanonicalSubscriptionExemption(exempt, tenant), true);
  assert.equal(hasPlatformAuthority(actor), false);
  assert.equal(hasApplicationCommercialExemption({ organisationId: tenant, authority: exempt, actor }), true);
});
test('names, settings, absent records, string flags and cross-tenant records cannot grant exemption', () => {
  for (const row of [null, {}, { organisationId: tenant, platformExempt: 'true' }, { organisationId: 'other', platformExempt: true }, { organisationId: tenant, settings: { billing: { platformExempt: true } }, name: 'DigitalGate' }]) assert.equal(hasCanonicalSubscriptionExemption(row,tenant),false);
});
test('verified allowlisted owner and staff grant authority; customer roles and API keys never inherit it', () => {
  const previous = process.env.DG_COMMAND_CENTRE_ORG_IDS;process.env.DG_COMMAND_CENTRE_ORG_IDS=tenant;
  try {
    assert.equal(hasApplicationCommercialExemption({ organisationId: tenant, actor }),true);
    assert.equal(hasPlatformAuthority({ ...actor, role:'dg:staff' }),true);
    for(const role of ['admin','member']) assert.equal(hasPlatformAuthority({...actor,role}),false);
    assert.equal(hasPlatformAuthority({...actor,principalId:'api_key:synthetic'}),false);
    assert.equal(hasApplicationCommercialExemption({organisationId:'other',actor}),false);
  } finally { if(previous===undefined)delete process.env.DG_COMMAND_CENTRE_ORG_IDS;else process.env.DG_COMMAND_CENTRE_ORG_IDS=previous; }
});
test('exempt paid-feature access preserves ordinary role permission and unpaid denial',()=>{
  assert.equal(sessionHasFeature(session,'marketing.campaigns.read'),false);
  assert.equal(sessionHasFeature({...session,subscriptionExempt:true},'marketing.campaigns.read'),true);
  assert.equal(sessionHasFeature({...session,role:'member',subscriptionExempt:true,permissionGrants:[]},'marketing.campaigns.delete'),false);
});
test('industry exemption preserves selection and rollout; missing or mismatched authority fails closed',()=>{
  const input={authority:exempt,organisationId:tenant,appId:'real-estate',betaEnrolled:true,selectedForOrganisation:true};
  assert.equal(industryAppAccessDecision(input),'allowed');
  assert.equal(industryAppAccessDecision({...input,betaEnrolled:false}),'beta_required');
  assert.equal(industryAppAccessDecision({...input,selectedForOrganisation:false}),'industry_app_not_selected');
  assert.equal(industryAppAccessDecision({...input,organisationId:'other'}),'industry_app_purchase_required');
  assert.equal(industryAppAccessDecision({...input,authority:null}),'industry_app_purchase_required');
  assert.deepEqual(authorisedPremiumPurchaseKeys(exempt,tenant),[]);
});
test('Music & Artists selection survives while Creator runtime is closed', () => {
  const settings = { gen2Onboarding: { operatingProfile: { templates: ['music-artists'] } } };
  const selectedForOrganisation = organisationHasSelectedIndustryApp(settings, 'creator');
  assert.equal(selectedForOrganisation, true);
  assert.equal(industryAppAccessDecision({
    authority: exempt, organisationId: tenant, appId: 'creator',
    betaEnrolled: true, selectedForOrganisation,
  }), 'beta_required');
  const navigation = core.getCategorizedPlatformNavigation(['creator'], {
    commercialExempt: true, industrySelectionIds: ['music-artists'],
  });
  assert.doesNotMatch(JSON.stringify(navigation), /"\/apps\/creator(?:[\/"])/);
});
test('Finance exemptions preserve exact tenant, selection and staged availability',()=>{
  const input={organisationId:tenant,canonicalSubscription:exempt,featureFlags:{'finance.beta':true},organisationSettings:{industry:{templates:{finance:{active:true}}}}};
  assert.deepEqual(resolveFinanceAppAccessState(input),{industryEntitled:true,betaEnrolled:true,selectedForOrganisation:true});
  assert.equal(resolveFinanceAppAccessState({...input,organisationId:'other'}).industryEntitled,false);
  assert.equal(resolveFinanceAppAccessState({...input,featureFlags:{}}).betaEnrolled,false);
});
test('exemption resolves availability without fabricating purchases or activating templates',()=>{
  const result=resolveIndustryEntitlements({commercialExempt:true});
  assert.ok(result.industries.every(i=>i.entitled));assert.deepEqual(result.activeTemplateIds,[]);
  assert.ok(resolveIndustryEntitlements({}).industries.every(i=>!i.entitled));
});
test('Growth navigation keeps all nine apps and excludes AI Communications',()=>{
  const source=readFileSync('packages/platform-core/src/apps/navigation.ts','utf8');
  const order=JSON.parse(source.match(/const GROW_APP_ORDER = (\[[^;]+\]) as const;/)[1]);
  assert.deepEqual(order,['prospecting','marketing','advertising','ai-visibility','seo','social','reviews','automation','analytics']);
});
test('organisation switching cannot infer sibling industry selection',()=>{
  const realty={industry:{templates:{'real-estate':{active:true}}}};
  const stays={industry:{templates:{'short-stay':{active:true}}}};
  assert.equal(organisationHasSelectedIndustryApp(realty,'real-estate'),true);
  assert.equal(organisationHasSelectedIndustryApp(realty,'property-management'),false);
  assert.equal(organisationHasSelectedIndustryApp(stays,'accommodation'),true);
  assert.equal(organisationHasSelectedIndustryApp(stays,'property-management'),false);
});
test('customer Industry gates use professional terminology while retaining internal rollout flags',()=>{
  for(const file of ['src/components/industry/IndustryBetaAppLayout.tsx','src/components/re/ReBetaChecklist.tsx','src/components/accommodation/AccBetaChecklist.tsx']) {
    const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/>Closed [Bb]eta</);assert.match(source,/Contact DigitalGate/);
  }
});

// Execute actual activation handlers with synthetic DB records, not a parallel policy.
import ts from 'typescript';
import vm from 'node:vm';
import * as core from '../packages/platform-core/src/index.ts';
import * as applicationAuthority from '../packages/platform-core/src/access/application-authority.ts';
import * as purchaseAuthority from '../packages/platform-core/src/industry/purchase-authority.ts';
async function invokeActivation(file, body, flags = {}) {
  let saved;
  const prisma={ platformSubscription:{findUnique:async()=>exempt}, organisation:{findUnique:async()=>({settings:{apps:{enabled:[]},featureFlags:flags}}),update:async args=>{assert.equal(args.where.id,tenant);saved=args.data.settings;return {};}} };
  const modules={
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
    '@dg/platform-core':{...core,assertEntitlement:async()=>({ok:true})},
    '@dg/platform-core/access/application-authority':applicationAuthority,
    '@dg/platform-core/industry/purchase-authority':purchaseAuthority,
    '@/lib/platform-api':{requirePlatformSession:async()=>session,isNextResponse:r=>r instanceof Response,requirePermission:()=>null},
    '@/lib/write-entitlement':{tenantWriteEntitlementBlock:async()=>null,writeEntitlementResponse:()=>{throw Error('Unexpected write block');}},
    '@dg/database':{prisma},
  };
  const exports={};
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,process:{env:{DATABASE_URL:'synthetic-fixture-only'}},require:name=>{if(!(name in modules))throw Error('Unexpected module '+name);return modules[name];}});
  const response=await exports.PATCH(new Request('https://fixture.invalid/api',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
  assert.equal(response.status,200,JSON.stringify(await response.json()));return saved;
}
test('actual exempt app activation cannot enrol missing rollout flags',async()=>{
  const saved=await invokeActivation('src/app/api/v1/org/apps/route.ts',{action:'toggle',appId:'finance',enabled:true});
  assert.deepEqual(JSON.parse(JSON.stringify(saved.featureFlags)),{});assert.ok(saved.apps.enabled.includes('finance'));
});
test('actual exempt template activation preserves explicitly disabled rollout flags',async()=>{
  const saved=await invokeActivation('src/app/api/v1/org/industry/templates/route.ts',{action:'activate',templateId:'real-estate'},{'re.beta':false});
  assert.equal(saved.featureFlags['re.beta'],false);
});

import { paidAppKeyForAppId, GROWTH_APP_CATALOGUE } from '../packages/platform-core/src/billing/paid-apps.ts';
import { hasAuthorisedPremiumApp } from '../packages/platform-core/src/industry/purchase-authority.ts';
test('each individual Growth purchase authorises its exact app; free Reputation has no paid key',()=>{
  for(const app of GROWTH_APP_CATALOGUE) {
    assert.equal(paidAppKeyForAppId(app.appId),app.key);
    if(app.key)assert.equal(hasAuthorisedPremiumApp([app.key],app.appId),true);
  }
  assert.equal(paidAppKeyForAppId('reviews'),null);
  assert.equal(paidAppKeyForAppId('ai-communications'),'voice_ai');
  assert.equal(hasAuthorisedPremiumApp(['growth_suite'],'marketing'),true);
  assert.equal(hasAuthorisedPremiumApp(['marketing_pro'],'seo'),false);
});

test('actual premium page accepts operator owner or canonical exempt customer and denies unpaid/API-key impersonation',async()=>{
  const previous=process.env.DG_COMMAND_CENTRE_ORG_IDS;process.env.DG_COMMAND_CENTRE_ORG_IDS='operator';
  try {
    for(const [subject,allowed] of [
      [{...session,organisationId:'operator'},true],
      [{...session,role:'dg:staff'},true],
      [{...session,subscriptionExempt:true},true],
      [{...session},false],
      [{...session,organisationId:'operator',role:'admin'},false],
      [{...session,organisationId:'operator',clerkUserId:'api_key:synthetic'},false],
    ]) {
      const exports={};const jsx=(type,props)=>({type,props});
      const modules={
        '@dg/platform-core/access/platform-authority':{hasPlatformAuthority},
        '@dg/platform-core/industry/purchase-authority':{hasAuthorisedPremiumApp},
        '@/lib/platform-page-context':{getPlatformPageContext:async()=>({session:subject})},
        'next/link':{default:'link'},'react/jsx-runtime':{jsx,jsxs:jsx},
      };
      const code=ts.transpileModule(readFileSync('src/components/industry/PurchasedPremiumAppLayout.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
      vm.runInNewContext(code,{exports,require:name=>{if(!(name in modules))throw Error('Unexpected dependency '+name);return modules[name];}});
      const child={type:'authorised-child'};const result=await exports.PurchasedPremiumAppLayout({appId:'marketing',title:'Marketing',children:child});
      assert.equal(result===child,allowed);
    }
  }finally {if(previous===undefined)delete process.env.DG_COMMAND_CENTRE_ORG_IDS;else process.env.DG_COMMAND_CENTRE_ORG_IDS=previous;}
});

test('Industry workspace and business-profile guidance avoids obsolete customer beta labels',()=>{
  for(const file of ['src/components/accommodation/AccommodationBookingsTable.tsx','src/app/(shell)/dashboard/business/page.tsx','src/app/(shell)/apps/services/page.tsx']) {
    const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/for this beta|Real Estate beta onboarding|Services beta launch checklist/);
  }
});
