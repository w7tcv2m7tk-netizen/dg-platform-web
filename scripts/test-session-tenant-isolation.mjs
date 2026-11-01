import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';
import ts from 'typescript';

// Evaluate actual candidate functions with a closed import map: no provider or DB client loads.
function load(path, modules, env={DATABASE_URL:'synthetic-only',DG_COMMAND_CENTRE_ORG_IDS:'operator'}) {
  const exports={};
  const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports,process:{env},Response,require:name=>{
    if(!(name in modules)) throw Error('Unexpected import '+name);
    return modules[name];
  }});
  return exports;
}
const row=(id='tenant',role='member')=>({id:'membership-'+id,organisationId:id,role,email:'old@fixture.invalid',createdAt:new Date(0),organisation:{name:'Synthetic',slug:'digitalgate',status:'active'}});
function memberships(rows) {
  const reads=[];const writes=[];
  const prisma={membership:new Proxy({
    findMany:async args=>{reads.push(args);return rows.filter(m=>m.status!=='revoked'&&m.organisation.status!=='archived');},
    findFirst:async args=>{reads.push(args);return rows.find(m=>m.organisationId===args.where.organisationId&&m.status!=='revoked'&&m.organisation.status!=='archived')??null;},
  },{get:(target,key)=>key in target?target[key]:(...args)=>{writes.push([key,args]);throw Error('Forbidden write');}})};
  const api=load('packages/platform-core/src/org/memberships.ts',{
    '@dg/database':{prisma},'../apps/org-apps':{getDefaultEnabledAppIds:()=>[]},
    '../demo/types':{isLegacyDemoOrganisation:o=>o.slug==='legacy-demo'},
    '../access/platform-authority':{isPlatformOperatorOrganisationId:id=>id==='operator'},
    './brand-presets':{},'../connectors/wordpress/org-connector':{},
  });
  return {...api,prisma,reads,writes};
}
for(const role of ['member','admin','owner','dg:staff'])test('organisation listing never grants staff or seeds demo: '+role,async()=>{
  const m=memberships([row('operator',role)]);const result=await m.listUserOrganisations('synthetic');
  assert.equal(result.length,1);assert.equal(result[0].role,role);assert.equal(m.reads.length,1);assert.equal(m.writes.length,0);
});
for(const kind of ['missing','revoked','archived','legacy'])test('explicit '+kind+' selection never falls back to valid tenant',async()=>{
  const denied=row('denied');if(kind==='revoked')denied.status='revoked';if(kind==='archived')denied.organisation.status='archived';if(kind==='legacy')denied.organisation.slug='legacy-demo';
  const m=memberships([row(),...(kind==='missing'?[]:[denied])]);
  assert.equal(await m.resolveUserMembership('synthetic','denied'),null);assert.equal(m.reads.length,1);
});
test('no selection chooses existing membership; valid explicit selection is exact',async()=>{
  const m=memberships([row('tenant'),row('operator','owner')]);
  assert.equal((await m.resolveUserMembership('synthetic')).organisationId,'operator');
  assert.equal((await m.resolveUserMembership('synthetic','tenant')).organisationId,'tenant');
});
test('session email mismatch causes no writes and preserves resolved role',async()=>{
  const m=memberships([row()]);m.prisma.platformSubscription={findUnique:async()=>null};
  const session=load('packages/platform-core/src/session/index.ts',{'../org/memberships':m,'@dg/database':{prisma:m.prisma},'../industry/purchase-authority':{authorisedIndustryPurchaseIds:()=>[],authorisedPremiumPurchaseKeys:()=>[]}});
  const result=await session.resolvePlatformSession({clerkUserId:'synthetic',email:'new@fixture.invalid',name:'Synthetic',activeOrganisationId:'tenant'});
  assert.equal(result.role,'member');assert.equal(m.writes.length,0);
  assert.equal(await session.resolvePlatformSession({clerkUserId:'synthetic',activeOrganisationId:'stale-cookie'}),null);
});
function route(membership,principal='synthetic',authenticated=true){
  const writes=[];const invalidations=[];
  const api=load('src/app/api/v1/org/switch/route.ts',{
    '@dg/platform-core':{resolveUserMembership:async()=>membership},
    'next/cache':{revalidateTag:(...args)=>invalidations.push(args)},
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
    '@/lib/active-org-cookie':{writeActiveOrganisationId:async id=>writes.push(id)},
    '@/lib/platform-api':{requirePlatformAuth:async()=>authenticated?{clerkUserId:principal}:Response.json({},{status:401}),isNextResponse:r=>r instanceof Response},
    '@clerk/nextjs/server':{auth:async()=>({userId:authenticated?principal:null})},
  });
  return {writes,invalidations,post:body=>api.POST(new Request('https://fixture.invalid/api/v1/org/switch',{method:'POST',body:JSON.stringify(body)}))};
}
for(const body of [null,{}, {organisationId:3},{organisationId:[]},{organisationId:' ' }])test('invalid switch body rejected '+JSON.stringify(body),async()=>{const r=route(row());assert.equal((await r.post(body)).status,422);assert.equal(r.writes.length,0);});
for(const [label,m,p,auth,status] of [['missing',null,'synthetic',true,403],['fallback mismatch',row('other'),'synthetic',true,403],['api key',row(),'api_key:fixture',true,403],['absent session',row(),'synthetic',false,401]])test('switch rejects '+label,async()=>{
  const r=route(m,p,auth);assert.equal((await r.post({organisationId:'tenant'})).status,status);assert.equal(r.writes.length,0);assert.equal(r.invalidations.length,0);
});
test('exact authorised tenant writes only that cookie and invalidates caches',async()=>{const r=route(row());const response=await r.post({organisationId:'tenant'});assert.equal(response.status,200);assert.deepEqual(r.writes,['tenant']);assert.equal(r.invalidations.length,2);assert.equal((await response.json()).data.organisationId,'tenant');});
test('role changes and membership revocation take effect on next resolution',async()=>{
  const member=row('operator','owner');const m=memberships([member]);
  assert.equal((await m.resolveUserMembership('synthetic','operator')).role,'owner');
  member.role='member';assert.equal((await m.resolveUserMembership('synthetic','operator')).role,'member');
  member.status='revoked';assert.equal(await m.resolveUserMembership('synthetic','operator'),null);
});
test('unconfigured session denies without loading any dependency',async()=>{
  const api=load('packages/platform-core/src/session/index.ts',{},{});
  assert.equal(await api.resolvePlatformSession({clerkUserId:'synthetic'}),null);
});
