import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, dependencies, extra = {}) {
 const loaded = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
 runInNewContext(code, { module: loaded, exports: loaded.exports, require: name => { assert.ok(name in dependencies, `Unexpected dependency ${name}`); return dependencies[name]; }, ...extra });
 return loaded.exports;
}
class AcquisitionError extends Error { constructor(code, message, status) { super(message); this.code=code; this.status=status; } }
const identity = { countryPack: 'AU', identifiers: { abn: '10000000003' }, entity: { legalName: 'AIM Financial — synthetic', status: 'Active', address: { state: 'QLD', postcode: '4000' } }, sources: { abr: {} }, retrievedAt: '2026-10-20T00:00:00Z' };
const candidate = { key: 'google_places:synthetic', provider: 'google_places', externalId: 'synthetic', businessName: identity.entity.legalName, location: 'Other address', websiteUrl: 'https://synthetic.example', phone: '0000000000', providerRefs: { googlePlaceId: 'synthetic' }, confidence: .9 };
function searchFixture({ abrDown=false, googleDown=false, configured=true }={}) {
 const calls=[];
 const deps={ searchName: async query => { calls.push(['abrName',query]); if(abrDown) throw Error('ABR outage'); return { configured, matches:[{ abn: identity.identifiers.abn, businessName: identity.entity.legalName }], query }; }, verifyAbn: async query => { calls.push(['verify',query]); if(abrDown) throw Error('ABR outage'); return { abn: identity.identifiers.abn, provenance: {snapshot:identity} }; }, google: { isConfigured:()=>configured, search:async ctx=>{ calls.push(['google',ctx.textQuery]); if(googleDown) throw Error('Google outage'); return [candidate]; } } };
 const {searchProspectIntake}=load('packages/platform-core/src/prospecting-engine/intake-search.ts', {'../business-identity':{searchBusinessIdentityByName:deps.searchName},'../business-discovery/providers/google-places':{googlePlacesProvider:deps.google},'./identity':{AcquisitionError, verifyAcquisitionAbn:deps.verifyAbn}});
 return {search:input=>searchProspectIntake(input),calls};
}
test('name search returns separate ABR and Google results even with identical names',async()=>{
 const {search}=searchFixture(); const result=await search({mode:'name',query:'AIM Financial — synthetic'});
 assert.equal(result.registry.length,1); assert.equal(result.google.length,1); assert.equal(result.verifiedIdentity,null);
 assert.equal(result.google[0].providerRefs.abn,undefined);
});
test('ABN search verifies first and searches Google by registry name and optional location',async()=>{
 const {search,calls}=searchFixture();const result=await search({mode:'abn',query:'10000000003',location:'Brisbane'});
 assert.equal(result.verifiedIdentity.identifiers.abn,'10000000003');
 assert.deepEqual(calls,[['verify','10000000003'],['google','AIM Financial — synthetic Brisbane']]);
});
test('failed ABN lookup cannot infer a business identity or search Google using an identifier',async()=>{
 const {search,calls}=searchFixture({abrDown:true}); const result=await search({mode:'abn',query:'10000000003'});
 assert.equal(result.verifiedIdentity,null);assert.equal(result.registry.length,0);assert.equal(result.google.length,0);assert.equal(calls.length,1);assert.ok(result.warnings.length);
});
test('name search can return Google during an ABR outage; Google failure preserves ABR',async()=>{
 const a=await searchFixture({abrDown:true}).search({mode:'name',query:'Synthetic'});assert.equal(a.google.length,1);assert.equal(a.registry.length,0);
 const b=await searchFixture({googleDown:true}).search({mode:'name',query:'Synthetic'});assert.equal(b.registry.length,1);assert.equal(b.google.length,0);assert.ok(b.warnings.length);
});
test('unconfigured Google is honest and empty/oversized input makes no provider calls',async()=>{
 const {search,calls}=searchFixture({configured:false});const result=await search({mode:'name',query:'Synthetic'});assert.equal(result.google.length,0);assert.ok(result.warnings.length);
 const before=calls.length;await assert.rejects(()=>search({mode:'name',query:'ab'}), e=>e.status===422);await assert.rejects(()=>search({mode:'name',query:'x'.repeat(201)}));assert.equal(calls.length,before);
});

// Exercise the actual component handlers with synthetic responses, without authentication bypass or live providers.
function mount(file, exportName, dependencies={}, extra={}) {
 const slots=[];let cursor=0;
 const hooks={ useState(initial) { const index=cursor++; if(!(index in slots)) slots[index]=initial;return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}]; } };
 const component=load(file, {'react':hooks,'react/jsx-runtime':require('react/jsx-runtime'),...dependencies},extra)[exportName];
 return props=>{cursor=0;return component(props);};
}
function nodes(tree) { if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)]; }
function text(node) { const c=node?.props?.children; return Array.isArray(c)?c.map(v=>typeof v==='object'?text(v):v).join(''):typeof c==='object'?text(c):String(c??''); }
function find(tree,predicate) {const node=nodes(tree).find(predicate);assert.ok(node,'UI control missing');return node;}
const button=(tree,label)=>find(tree,n=>n.type==='button'&&text(n)===label);
const input=(tree,name)=>find(tree,n=>n.type==='input'&&n.props.name===name);

test('Google selection populates review fields; ABN requires verification and explicit confirmation; save uses selected details',async()=>{
 const requests=[];let pushed;
 const Search=()=>null;
 const render=mount('src/components/command/CreateProspectForm.tsx','CreateProspectForm',{'next/navigation':{useRouter:()=>({push:p=>pushed=p,refresh(){}})},'@/components/prospecting/ProspectBusinessSearch':{ProspectBusinessSearch:Search,fetchProspectIdentity:async()=>identity}}, { fetch:async(url,options)=>{requests.push([url,JSON.parse(options.body)]);return {ok:true,json:async()=>({data:{id:'synthetic-prospect'}})};} });
 let tree=render();find(tree,n=>n.type===Search).props.onSelect({businessName:candidate.businessName,websiteUrl:candidate.websiteUrl,phone:candidate.phone,googlePlaceId:'synthetic'});
 tree=render();assert.equal(input(tree,'websiteUrl').props.value,candidate.websiteUrl);assert.equal(input(tree,'abn').props.value,'');assert.equal(requests.length,0);
 input(tree,'abn').props.onChange({target:{value:'10000000003'}});tree=render();await tree.props.onSubmit({preventDefault(){}});assert.equal(requests.length,0);
 await button(render(),'Verify ABN').props.onClick();await new Promise(setImmediate);tree=render();
 assert.equal(button(tree,'Add to pipeline').props.disabled,true);
 find(tree,n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});tree=render();
 await tree.props.onSubmit({preventDefault(){}});
 assert.equal(requests.length,1);assert.equal(requests[0][1].abn,'10000000003');assert.equal(requests[0][1].googlePlaceId,'synthetic');assert.equal(pushed,'/apps/prospecting/pipeline');
});
test('choosing a different result clears the previous verified ABN and contact details',()=>{
 const Search=()=>null;const render=mount('src/components/command/CreateProspectForm.tsx','CreateProspectForm',{'next/navigation':{useRouter:()=>({})},'@/components/prospecting/ProspectBusinessSearch':{ProspectBusinessSearch:Search}});
 find(render(),n=>n.type===Search).props.onSelect({businessName:'Registry',identity,abn:'10000000003',phone:'0000000000'});
 find(render(),n=>n.type===Search).props.onSelect({businessName:'My Venue Clean — synthetic'});
 const tree=render();assert.equal(input(tree,'abn').props.value,'');assert.equal(input(tree,'contactPhone').props.value,'');assert.ok(!nodes(tree).some(n=>n.type==='input'&&n.props.type==='checkbox'));
});
test('Delete uses existing soft-delete API; cancellation does not send a request; restore remains available',async()=>{
 const calls=[];let confirm=true;
 const render=mount('src/components/prospecting/ProspectingCustomerActions.tsx','ProspectArchiveControl',{'next/navigation':{useRouter:()=>({refresh(){}})},'@dg/platform-core':{},'next/link':()=>null}, {window:{confirm:()=>confirm}, fetch:async(url,options)=>{calls.push([url,options.method]);return {ok:true};}});
 const props={prospectId:'synthetic-id',businessName:'DigitalGate — synthetic'};
 confirm=false;await button(render(props),'Delete').props.onClick();assert.equal(calls.length,0);
 confirm=true;await button(render(props),'Delete').props.onClick();await new Promise(setImmediate);assert.deepEqual(calls[0],['/api/v1/prospecting/prospects/synthetic-id','DELETE']);
 await button(render({...props,archived:true}),'Restore').props.onClick();assert.equal(calls[1][1],'POST');
});

test('intake API rejects unauthorised sessions and malformed requests before any provider call',async()=>{
 let allowed=false,calls=0;
 const route=load('src/app/api/v1/prospecting/intake/search/route.ts',{
  '@dg/platform-core':{AcquisitionError,searchProspectIntake:async()=>{calls++;return {registry:[],google:[]};}},
  'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},
  '@/lib/platform-api':{isNextResponse:value=>Boolean(value.status)},
  '@/lib/prospecting-api':{requireProspectingEngine:async(req,feature)=>{assert.equal(feature,'command.growth.manage');return allowed?{organisationId:'synthetic-tenant'}:{status:403};}},
 });
 const request=body=>({json:async()=>body});
 assert.equal((await route.POST(request({mode:'name',query:'Synthetic'}))).status,403);assert.equal(calls,0);
 allowed=true;assert.equal((await route.POST(request({mode:'anything',query:'Synthetic'}))).status,422);assert.equal(calls,0);
 assert.equal((await route.POST(request({mode:'name',query:'Synthetic'}))).status,200);assert.equal(calls,1);
});

test('search renders provider results before selection; registry selection verifies while Google carries no ABN',async()=>{
 const requests=[],selections=[];
 const render=mount('src/components/prospecting/ProspectBusinessSearch.tsx','ProspectBusinessSearch',{}, { fetch:async(url,options)=>{
  requests.push([url,options?.method||'GET']);
  return {ok:true,json:async()=>({data:options?{registry:[{abn:'10000000003',businessName:identity.entity.legalName}],google:[candidate],warnings:[],verifiedIdentity:null}:{identity}})};
 } });
 const props={onSelect:value=>selections.push(value),disabled:false};
 let tree=render(props);find(tree,n=>n.type==='input'&&n.props.maxLength===200).props.onChange({target:{value:'AIM Financial — synthetic'}});
 button(render(props),'Search ABR and Google').props.onClick();await new Promise(setImmediate);tree=render(props);
 assert.equal(selections.length,0);assert.equal(requests.length,1);
 button(tree,'Verify ABN and review').props.onClick();await new Promise(setImmediate);
 assert.equal(selections[0].abn,'10000000003');assert.equal(selections[0].identity.entity.legalName,identity.entity.legalName);assert.match(requests[1][0],/business-identity\/abn/);
 button(render(props),'Review this Google business').props.onClick();
 assert.equal(selections[1].googlePlaceId,'synthetic');assert.equal(selections[1].abn,undefined);assert.equal(selections[1].identity,undefined);
 assert.ok(requests.every(([url])=>!url.includes('/growth/prospects')));
});

test('default Priorities page renders retry/help recovery for missing database and query failure',async()=>{
 const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
 for(const database of [undefined,'postgresql://synthetic-local-test-only']) {
  let queries=0;
  const page=load('src/app/(shell)/apps/prospecting/today/page.tsx',{
   'react/jsx-runtime':require('react/jsx-runtime'),
   '@/components/prospecting/ProspectingPageHeader':{ProspectingPageHeader:({title})=>React.createElement('h1',null,title)},
   'next/navigation':{notFound(){throw Error('not_found');}},
   '@dg/platform-core':{getDailyOpportunityBriefing:async()=>{queries++;throw Error('Synthetic database failure');}},
   '@/components/prospecting/ProspectingTodayActions':{ProspectingTodayActions:()=>{throw Error('Unavailable data must not render actions');}},
   '@/lib/platform-page-feature':{getAuthorisedPlatformPageSession:async()=>({organisationId:'synthetic'})},
  },{process:{env:{DATABASE_URL:database}},console:{error(){}}}).default;
  const html=renderToStaticMarkup(await page());
  assert.match(html,/Try again/);assert.match(html,/Get help/);assert.match(html,/rather than estimating/);
  assert.match(html,/href="\/apps\/prospecting"/);assert.equal(queries,database?1:0);
 }
});

test('Priorities recovery does not catch or bypass the authentication gate',async()=>{
 let reads=0;
 const page=load('src/app/(shell)/apps/prospecting/today/page.tsx',{
  'react/jsx-runtime':require('react/jsx-runtime'),
  '@/components/prospecting/ProspectingPageHeader':{},'next/navigation':{notFound(){throw Error('auth_denied');}},
  '@dg/platform-core':{getDailyOpportunityBriefing:async()=>{reads++;}},
  '@/components/prospecting/ProspectingTodayActions':{},
  '@/lib/platform-page-feature':{getAuthorisedPlatformPageSession:async()=>null},
 },{process:{env:{}}}).default;
 await assert.rejects(page,/auth_denied/);assert.equal(reads,0);
});
