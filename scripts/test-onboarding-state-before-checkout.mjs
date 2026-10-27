import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';
import {isVerifiedStripeBilling} from '../packages/platform-core/src/billing/org-billing-status.ts';
import {shouldCheckTenantWriteEntitlement} from '../src/lib/write-entitlement-policy.ts';

function route(options={}) {
  const writes=[];
  const billingReads=[];
  const billingStatus=async id=>{billingReads.push(id);if(options.billingFailure)throw Error("synthetic lookup failure");return options.billing??null;};
  const completion={};
  vm.runInNewContext(ts.transpileModule(readFileSync("packages/platform-core/src/onboarding/gen2-completion.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:completion,require:()=>({getOrganisationBillingStatus:billingStatus,isVerifiedStripeBilling})});
  const next={json:(body,init)=>Response.json(body,init)};
  const modules={
    '@dg/platform-core':{
      INDUSTRY_TAXONOMY:[{id:'finance',subIndustries:[{id:'mortgage-finance-broking'}]}],
      isGen2OnboardingStep:s=>['welcome','order_summary','operating_profile','implementation','stripe','checklist'].includes(s),
      getGen2OnboardingProgress:async()=>({vipSetup:{version:1,completedAt:null},operatingProfile:{},...(options.current??{})}),
      getOrganisationCommercialOffer:async()=>null,
      getOrganisationBillingStatus:billingStatus,
      isVerifiedStripeBilling,
      getOrganisationBusinessProfile:async()=>({businessName:'Synthetic',industryVertical:'finance',brandVoice:{services:'Synthetic',targetAudience:'Synthetic'},logoUrl:'/synthetic.png',brandColours:'#123456'}),
      getOrganisationGoals:async()=>[],
      updateOrganisationBusinessProfile:async()=>{writes.push({profile:true});},
      createOrganisationGoal:async()=>{writes.push({goal:true});},
      GROWTH_APP_CATALOGUE:[],
      saveGen2OnboardingProgress:async(id,patch)=>{writes.push({id,patch});return patch;},
      assertPlatformOperator:()=>options.operator===true,
    },
    '@/lib/platform-api':{
      requirePlatformAuth:async req=>{
        if(options.unauthenticated)return next.json({error:{code:'unauthorised'}},{status:401});
        // Exercise the real central entitlement policy: an unpaid tenant gets
        // no blanket write exemption from this route's authentication stub.
        if(shouldCheckTenantWriteEntitlement({method:req.method,pathname:new URL(req.url).pathname,isPlatformOperator:options.operator===true}))
          return next.json({error:{code:'entitlement_write_blocked'}},{status:403});
        return {organisationId:'owner',organisationSlug:options.slug??'digitalgate',clerkUserId:'fixture',role:'owner'};
      },
      isNextResponse:r=>r instanceof Response,
      requirePermission:()=>options.permissionDenied?next.json({error:{code:'permission_denied'}},{status:403}):null,
      rejectDemoLiveAction:async()=>options.demo?next.json({error:{code:'demo_restricted'}},{status:403}):null,
    },
    '@dg/platform-core/onboarding/gen2-completion':completion,
    '@dg/platform-core/billing/checkout-creation-gate':{CheckoutTemporarilyUnavailable:class extends Error{}},
    '@dg/platform-core/billing/checkout-coordinator':{CheckoutCoordinationError:class extends Error{}},
    '@dg/platform-core/billing/platform-checkout':{},
    'next/server':{NextResponse:next},
  };
  const exports={};
  const suffix=options.endpoint==='legacy'?'':options.endpoint==='operator'?'/operator':'/state';
  const source=ts.transpileModule(readFileSync('src/app/api/v1/onboarding/gen2'+suffix+'/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>{if(!(name in modules))throw Error('Unexpected import '+name);return modules[name];},Response,console});
  return {writes,billingReads,patch:body=>exports[options.endpoint==='operator'?'POST':'PATCH'](new Request('https://fixture.test/api/v1/onboarding/gen2'+suffix,{method:options.endpoint==='operator'?'POST':'PATCH',headers:{'Content-Type':'application/json',...(options.target?{'x-dg-operator-organisation':options.target}:{})},body:JSON.stringify(body)}))};
}
test('unpaid owner can save review position without gaining billing authority',async()=>{
  const r=route();const response=await r.patch({currentStep:'order_summary',journeyPosition:{stage:'order_summary'},industryApps:['finance'],status:'ACTIVE',entitlement:'FULL',platformExempt:true});
  assert.equal(response.status,200);assert.equal(r.writes.length,1);assert.equal(r.writes[0].id,'owner');
  for(const key of ['status','entitlement','platformExempt','subscriptionActivatedAt'])assert.equal(r.writes[0].patch[key],undefined);
});
for(const body of [{vipSetup:{completedAt:'2026-10-23T00:00:00Z'}},{currentStep:'implementation'},{journeyPosition:{stage:'implementation'}}])
test('unpaid tenant cannot forge onboarding completion: '+JSON.stringify(body),async()=>{const r=route();assert.equal((await r.patch(body)).status,409);assert.equal(r.writes.length,0);});
for(const billing of [{kind:'trial',hasStripeCustomer:true},{kind:'platform_exempt',platformExempt:true}])
test('verified billing or explicit platform exemption permits completion: '+billing.kind,async()=>{const r=route({billing});assert.equal((await r.patch({vipSetup:{completedAt:'2026-10-23T00:00:00Z'}})).status,200);assert.equal(r.writes.length,1);});
test('expired or unpaid checkout return cannot complete setup',async()=>{
  const r=route({billing:{kind:'needs_checkout',hasStripeCustomer:true,subscriptionStatus:'expired'}});
  assert.equal((await r.patch({vipSetup:{completedAt:'2026-10-23T00:00:00Z'}})).status,409);
  assert.equal(r.writes.length,0);
});
for(const [options,status] of [[{unauthenticated:true},401],[{permissionDenied:true},403],[{demo:true},403],[{target:'victim'},403],[{target:'victim',operator:true},409]])
test('onboarding state retains authentication, role, demo and target checks: '+JSON.stringify(options),async()=>{const r=route(options);assert.equal((await r.patch({currentStep:'order_summary'})).status,status);assert.equal(r.writes.length,0);});
test('onboarding exemption is exact and leaves adjacent tenant writes gated',()=>{
  for(const pathname of ['/api/v1/onboarding/gen2/state/extra','/api/v1/onboarding/gen2/operator','/api/v1/org/apps','/api/v1/finance/applications'])
    assert.equal(shouldCheckTenantWriteEntitlement({method:'PATCH',pathname,isPlatformOperator:false}),true,pathname);
});

const completionBodies=[
  {progress:{vipSetup:{completedAt:'2000-01-01T00:00:00Z'}}},
  {markStepComplete:'implementation'},
  {markStepComplete:'checklist'},
  {progress:{checklist:{implementation:true}}},
];
for(const body of completionBodies) test('legacy PATCH rejects unpaid completion before profile or goal writes: '+JSON.stringify(body),async()=>{
  const r=route({endpoint:'legacy'});
  const response=await r.patch({...body,profile:{businessName:'forged'},goals:['forged']});
  assert.equal(response.status,409);assert.equal((await response.json()).error.code,'checkout_not_confirmed');assert.equal(r.writes.length,0);
  assert.deepEqual([...new Set(r.billingReads)],['owner']);
});
for(const endpoint of ['legacy','state']) {
  const body=endpoint==='legacy'?completionBodies[0]:{vipSetup:{completedAt:'2000-01-01T00:00:00Z'}};
  for(const billing of [{kind:'needs_checkout',hasStripeCustomer:true,subscriptionStatus:'expired'},{kind:'trial',hasStripeCustomer:false},null])
    test(endpoint+' completion rejects expired, unverified or missing billing '+JSON.stringify(billing),async()=>{
      const r=route({endpoint,billing});assert.equal((await r.patch(body)).status,409);assert.equal(r.writes.length,0);
    });
  for(const billing of [{kind:'trial',hasStripeCustomer:true},{kind:'platform_exempt',platformExempt:true,hasStripeCustomer:false}])
    test(endpoint+' permits canonical billing/exemption '+billing.kind,async()=>{
      const r=route({endpoint,billing});assert.equal((await r.patch(endpoint==='legacy'?{...body,progress:{...body.progress,industryTemplates:['mortgage-finance-broking']}}:body)).status,200);
      assert.ok(r.writes.length);
    });
  for(const [options,status] of [[{target:'victim'},403],[{target:'victim',operator:true},409],[{permissionDenied:true},403],[{unauthenticated:true},401]])
    test(endpoint+' completion preserves tenant/auth boundary '+JSON.stringify(options),async()=>{
      const r=route({endpoint,...options,billing:{kind:'platform_exempt',platformExempt:true}});assert.equal((await r.patch(body)).status,status);assert.equal(r.writes.length,0);assert.equal(r.billingReads.length,0);
    });
  test(endpoint+' billing lookup failure cannot produce completion',async()=>{
    const r=route({endpoint,billingFailure:true});await assert.rejects(r.patch(body));assert.equal(r.writes.length,0);
  });
}
test('legacy unpaid profile, basket and review navigation remain writable',async()=>{
  const r=route({endpoint:'legacy'});assert.equal((await r.patch({profile:{businessName:'Synthetic'},progress:{premiumApps:['reviews'],platformTier:'professional'},markStepComplete:'order_summary'})).status,200);
  assert.equal(r.writes.length,2);assert.deepEqual(r.writes[1].patch.premiumApps,['reviews']);
});
for(const billing of [null,{kind:'platform_exempt',platformExempt:true}]) test('operator setup requires canonical authority, not slug alone '+JSON.stringify(billing),async()=>{
  const r=route({endpoint:'operator',operator:true,billing});assert.equal((await r.patch({})).status,billing?200:409);assert.equal(r.writes.length,billing?1:0);
});

for(const endpoint of ['state','legacy']) test(endpoint+' rejects a platform-exempt label without authorised exemption',async()=>{
 const r=route({endpoint,billing:{kind:'platform_exempt',platformExempt:false}});
 const body=endpoint==='legacy'?{markStepComplete:'implementation'}:{vipSetup:{completedAt:'forged'}};
 assert.equal((await r.patch(body)).status,409);assert.equal(r.writes.length,0);
});
