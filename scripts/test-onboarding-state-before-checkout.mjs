import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';
import {shouldCheckTenantWriteEntitlement} from '../src/lib/write-entitlement-policy.ts';

function route(options={}) {
  const writes=[];
  const next={json:(body,init)=>Response.json(body,init)};
  const modules={
    '@dg/platform-core':{
      INDUSTRY_TAXONOMY:[{id:'finance',subIndustries:[{id:'mortgage-finance-broking'}]}],
      isGen2OnboardingStep:s=>['welcome','order_summary','operating_profile','implementation'].includes(s),
      getGen2OnboardingProgress:async()=>({vipSetup:{version:1,completedAt:null},operatingProfile:{}}),
      getOrganisationCommercialOffer:async()=>null,
      getOrganisationBillingStatus:async()=>options.billing??null,
      isVerifiedStripeBilling:b=>b?.kind==='stripe'&&b.verified===true,
      saveGen2OnboardingProgress:async(id,patch)=>{writes.push({id,patch});return patch;},
      assertPlatformOperator:()=>options.operator===true,
    },
    '@/lib/platform-api':{
      requirePlatformAuth:async req=>{
        if(options.unauthenticated)return next.json({error:{code:'unauthorised'}},{status:401});
        // Exercise the real central entitlement policy: an unpaid tenant gets
        // no blanket write exemption from this route's authentication stub.
        if(shouldCheckTenantWriteEntitlement({method:req.method,pathname:new URL(req.url).pathname,isPlatformOperator:false}))
          return next.json({error:{code:'entitlement_write_blocked'}},{status:403});
        return {organisationId:'owner',clerkUserId:'fixture',role:'owner'};
      },
      isNextResponse:r=>r instanceof Response,
      requirePermission:()=>options.permissionDenied?next.json({error:{code:'permission_denied'}},{status:403}):null,
      rejectDemoLiveAction:async()=>options.demo?next.json({error:{code:'demo_restricted'}},{status:403}):null,
    },
    'next/server':{NextResponse:next},
  };
  const exports={};
  const source=ts.transpileModule(readFileSync('src/app/api/v1/onboarding/gen2/state/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>{if(!(name in modules))throw Error('Unexpected import '+name);return modules[name];},Response,console});
  return {writes,patch:body=>exports.PATCH(new Request('https://fixture.test/api/v1/onboarding/gen2/state',{method:'PATCH',headers:{'Content-Type':'application/json',...(options.target?{'x-dg-operator-organisation':options.target}:{})},body:JSON.stringify(body)}))};
}
test('unpaid owner can save review position without gaining billing authority',async()=>{
  const r=route();const response=await r.patch({currentStep:'order_summary',journeyPosition:{stage:'order_summary'},industryApps:['finance'],status:'ACTIVE',entitlement:'FULL',platformExempt:true,subscriptionActivatedAt:'forged'});
  assert.equal(response.status,200);assert.equal(r.writes.length,1);assert.equal(r.writes[0].id,'owner');
  for(const key of ['status','entitlement','platformExempt','subscriptionActivatedAt'])assert.equal(r.writes[0].patch[key],undefined);
});
for(const body of [{vipSetup:{completedAt:'2026-10-23T00:00:00Z'}},{currentStep:'implementation'},{journeyPosition:{stage:'implementation'}}])
test('unpaid tenant cannot forge onboarding completion: '+JSON.stringify(body),async()=>{const r=route();assert.equal((await r.patch(body)).status,409);assert.equal(r.writes.length,0);});
for(const billing of [{kind:'stripe',verified:true},{kind:'platform_exempt'}])
test('verified billing or explicit platform exemption permits completion: '+billing.kind,async()=>{const r=route({billing});assert.equal((await r.patch({vipSetup:{completedAt:'2026-10-23T00:00:00Z'}})).status,200);assert.equal(r.writes.length,1);});
test('expired or unpaid checkout return cannot complete setup',async()=>{
  const r=route({billing:{kind:'stripe',verified:false,status:'expired'}});
  assert.equal((await r.patch({vipSetup:{completedAt:'2026-10-23T00:00:00Z'}})).status,409);
  assert.equal(r.writes.length,0);
});
for(const [options,status] of [[{unauthenticated:true},401],[{permissionDenied:true},403],[{demo:true},403],[{target:'victim'},403],[{target:'victim',operator:true},409]])
test('onboarding state retains authentication, role, demo and target checks: '+JSON.stringify(options),async()=>{const r=route(options);assert.equal((await r.patch({currentStep:'order_summary'})).status,status);assert.equal(r.writes.length,0);});
test('onboarding exemption is exact and leaves adjacent tenant writes gated',()=>{
  for(const pathname of ['/api/v1/onboarding/gen2/state/extra','/api/v1/onboarding/gen2/operator','/api/v1/org/apps','/api/v1/finance/applications'])
    assert.equal(shouldCheckTenantWriteEntitlement({method:'PATCH',pathname,isPlatformOperator:false}),true,pathname);
});
