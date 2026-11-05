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
