import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function harness(session){
 const calls=[];const modules={
 '@dg/platform-core':{GEN2_APEX_WP_RETIRED_MESSAGE:'retired',isGen2MarketingApexBaseUrl:()=>false,resolvePortalProfileFromNeon:async input=>{calls.push(input);return {linked:Boolean(input.organisationId&&input.clerkUserId),organisationId:input.organisationId};}},
 '@/lib/active-platform-session':{resolveActivePlatformSession:async input=>{calls.push({sessionLookup:input.clerkUserId});return session;}},
 };const exports={};const code=ts.transpileModule(readFileSync('src/lib/dg-api.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,process:{env:{DATABASE_URL:'synthetic-only'}},require:name=>{if(!(name in modules))throw Error('Unexpected module '+name);return modules[name];}});return {...exports,calls};
}
test('legacy profile caller resolves exact active membership, never email fallback',async()=>{const h=harness({organisationId:'active'});const r=await h.fetchPortalMe('synthetic@fixture.invalid','clerk-synthetic');assert.equal(r.organisationId,'active');assert.equal(h.calls[1].organisationId,'active');assert.equal(h.calls[1].clerkUserId,'clerk-synthetic')});
test('stale or revoked tenant returns unlinked rather than another organisation',async()=>{const h=harness(null);assert.equal((await h.fetchPortalMe('synthetic@fixture.invalid','clerk-synthetic')).linked,false);assert.equal(h.calls[1].organisationId,null)});
test('explicit null tenant never invokes fallback membership selection',async()=>{const h=harness({organisationId:'other'});assert.equal((await h.fetchPortalMe('synthetic@fixture.invalid','clerk-synthetic',null)).linked,false);assert.equal(h.calls.length,1)});
test('missing Clerk identity cannot resolve a profile through email',async()=>{const h=harness({organisationId:'other'});assert.equal((await h.fetchPortalMe('synthetic@fixture.invalid')).linked,false);assert.equal(h.calls.length,1)});

function syncWebhookFixture(){
 const calls=[];const profile=harness({organisationId:'tenant-a'});
 const modules={
  'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
  '@/lib/dg-api':{fetchPortalMe:profile.fetchPortalMe},
  '@dg/platform-core':{syncOrganisationFromPortal:async input=>{calls.push(input);assert.equal(input.organisationId,'tenant-b');assert.equal(input.portal.organisationId,'tenant-b');return {synced:true};}},
  '@/lib/webhook-auth':{verifyWebhookSecret:()=>({ok:true})},
  '@dg/database':{prisma:{membership:{findFirst:async args=>{assert.equal(args.where.status,'active');assert.equal(args.where.organisation.status.not,'archived');return {organisationId:'tenant-b',clerkUserId:'clerk-synthetic',organisation:{name:'Synthetic B'}};}}}},
 };const exports={};const code=ts.transpileModule(readFileSync('src/app/api/webhooks/dg-onboarding-sync/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,process:{env:{DATABASE_URL:'synthetic-only'}},require:name=>{if(!(name in modules))throw Error('Unexpected module '+name);return modules[name];}});
 return {...exports,calls,profile};
}
test('actual sync webhook pins latest verified membership B rather than first-session A',async()=>{
 const h=syncWebhookFixture();const r=await h.POST(new Request('https://fixture.invalid/api/webhooks/dg-onboarding-sync',{method:'POST',body:JSON.stringify({email:'synthetic@fixture.invalid',organisationId:'attacker-tenant'})}));
 assert.equal(r.status,200);assert.equal(h.calls.length,1);assert.equal(h.profile.calls.length,1);assert.equal(h.profile.calls[0].organisationId,'tenant-b');
});
test('authenticated profile refresh explicitly passes its server tenant',()=>{
 assert.match(readFileSync('src/app/api/v1/org/profile/route.ts','utf8'),/fetchPortalMe\(session\.email, session\.clerkUserId, session\.organisationId\)/);
});
