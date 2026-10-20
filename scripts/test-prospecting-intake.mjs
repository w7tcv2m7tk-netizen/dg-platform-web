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
function searchFixture({ abrDown=false, googleDown=false, configured=true, identityRecord=identity }={}) {
 const calls=[];
 const deps={ searchName: async query => { calls.push(['abrName',query]); if(abrDown) throw Error('ABR outage'); return { configured, matches:[{ abn: identity.identifiers.abn, businessName: identity.entity.legalName }], query }; }, verifyAbn: async query => { calls.push(['verify',query]); if(abrDown) throw Error('ABR outage'); return { abn: identityRecord.identifiers.abn, provenance: {snapshot:identityRecord} }; }, google: { isConfigured:()=>configured, search:async ctx=>{ calls.push(['google',ctx.textQuery]); if(googleDown) throw Error('Google outage'); return [candidate]; } } };
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
test('sole-trader ABN exposes registered names without inventing a legal name',async()=>{
 const record={...identity,entity:{...identity.entity,legalName:undefined,businessNames:['Synthetic Alpha','Synthetic Beta','Synthetic Alpha']}};
 const {search,calls}=searchFixture({identityRecord:record});
 const result=await search({mode:'abn',query:'10000000003',location:'QLD'});
 assert.deepEqual(Array.from(result.registry,r=>r.businessName),['Synthetic Alpha','Synthetic Beta']);
 assert.equal(result.verifiedIdentity.entity.legalName,undefined);
 assert.deepEqual(calls,[['verify','10000000003'],['google','Synthetic Alpha QLD']]);
 assert.match(result.warnings.join(' '),/multiple registered names/);
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

test('registry review keeps the explicitly selected registered business name for a sole trader',async()=>{
 const selections=[];
 const soleTrader={...identity,entity:{...identity.entity,legalName:undefined,businessNames:['Synthetic Alpha','Synthetic Beta']}};
 const render=mount('src/components/prospecting/ProspectBusinessSearch.tsx','ProspectBusinessSearch',{}, {fetch:async(url,options)=>({ok:true,json:async()=>({data:options?{registry:soleTrader.entity.businessNames.map(businessName=>({abn:'10000000003',businessName})),google:[],warnings:[],verifiedIdentity:soleTrader}:{identity:soleTrader}})})});
 const props={onSelect:value=>selections.push(value),disabled:false};
 find(render(props),n=>n.type==='input'&&n.props.maxLength===200).props.onChange({target:{value:'10000000003'}});
 button(render(props),'Search ABR and Google').props.onClick();await new Promise(setImmediate);
 const choices=nodes(render(props)).filter(n=>n.type==='button'&&text(n)==='Verify ABN and review');
 assert.equal(choices.length,2);choices[1].props.onClick();await new Promise(setImmediate);
 assert.equal(selections[0].businessName,'Synthetic Beta');assert.equal(selections[0].abn,'10000000003');assert.equal(selections[0].identity.entity.legalName,undefined);
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


test('Pipeline labels research/contact priorities and never averages mixed priority types', async () => {
 const renderToStaticMarkup = require('react-dom/server').renderToStaticMarkup;
 const scoreEngine = load('packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts', {});
 const stages = [{id:'discovered',label:'Discovered',actionLabel:'Review'}];
 const research = {id:'research',businessName:'Unresearched synthetic',stage:'prospect',industry:'Real estate',updatedAt:new Date().toISOString()};
 const contact = {...research,id:'contact',businessName:'Qualified synthetic',stage:'qualified',contactEmail:'test@example.invalid',websiteUrl:'https://example.invalid'};
 const render = async prospects => {
  const surface = load('src/components/prospecting/ProspectingPipelineSurface.tsx', {
   'react/jsx-runtime':require('react/jsx-runtime'), 'next/link':({children})=>children,
   '@dg/platform-core':{PROSPECT_WORKSPACE_STAGES:stages,growthPipelineStages:()=>[],workspaceStageForProspectStage:()=> 'discovered',listGrowthProspects:async()=>prospects,computeProspectOpportunityScore:scoreEngine.computeProspectOpportunityScore},
   '@dg/database':{prisma:{growthProspectAudit:{findMany:async()=>prospects.filter(p=>p.id==='contact').map(p=>({prospectId:p.id,businessHealth:50,aiVisibility:40,seoScore:45,websiteHealth:50,findings:{probes:{contentAccessible:true}}}))}}},
   '@/components/prospecting/ProspectingPageHeader':{ProspectingPageHeader:()=>null},
   '@/components/prospecting/ProspectingCustomerActions':{},
  },{process:{env:{DATABASE_URL:'synthetic'}}}).ProspectingPipelineSurface;
  return renderToStaticMarkup(await surface({organisationId:'synthetic',showArchived:false,variant:'apps'}));
 };
 const researchHtml = await render([research]);
 assert.match(researchHtml,/Research priority/); assert.doesNotMatch(researchHtml.match(/<ul.*?<\/ul>/s)[0],/Opportunity Score/);
 const contactHtml = await render([contact]);
 assert.match(contactHtml,/Contact priority/);
 const mixedHtml = await render([research,contact]);
 assert.match(mixedHtml,/Research priority/); assert.match(mixedHtml,/Contact priority/);
 const table = mixedHtml.match(/<tbody>(.*?)<\/tbody>/s)[1];
 assert.doesNotMatch(table,/priority/); assert.match(table,/—/);
});

test('research entry uses the existing audit action and blocks premature decision-maker requests',async()=>{
 const calls=[];let refreshed=0;
 const deps={'next/navigation':{useRouter:()=>({refresh(){refreshed++;}})}};
 const fetch=async(url,options)=>{calls.push([url,options.method]);return {ok:true,json:async()=>({data:{candidates:[]}})};};
 const audit=mount('src/components/prospecting/ProspectAuditRefresh.tsx','ProspectAuditRefresh',deps,{fetch});
 await button(audit({prospectId:'synthetic',hasAudit:false}),'Start research').props.onClick();await new Promise(setImmediate);
 assert.deepEqual(calls,[['/api/v1/prospecting/prospects/synthetic/audit','POST']]);assert.equal(refreshed,1);
 assert.ok(button(audit({prospectId:'synthetic',hasAudit:true}),'Re-run Research'));
 const decision=mount('src/components/prospecting/DecisionMakerResearch.tsx','DecisionMakerResearch',deps,{fetch});
 const blocked=button(decision({prospectId:'synthetic',disabledReason:'Start research first.'}),'Find decision-maker');assert.equal(blocked.props.disabled,true);
 await blocked.props.onClick();await new Promise(setImmediate);assert.equal(calls.length,1);
 const enabled=button(decision({prospectId:'synthetic'}),'Find decision-maker');assert.equal(enabled.props.disabled,false);
 await enabled.props.onClick();await new Promise(setImmediate);assert.deepEqual(calls[1],['/api/v1/prospecting/prospects/synthetic/decision-maker','POST']);
});

test('prospect detail distinguishes Discover, Research without website, and qualified stages',async()=>{
 const react=require('react');const navigation={'next/navigation':{useRouter:()=>({refresh(){}})}};
 const DecisionMakerResearch=load('src/components/prospecting/DecisionMakerResearch.tsx',{'react':react,'react/jsx-runtime':require('react/jsx-runtime'),...navigation}).DecisionMakerResearch;
 const ProspectAuditRefresh=load('src/components/prospecting/ProspectAuditRefresh.tsx',{'react':react,'react/jsx-runtime':require('react/jsx-runtime'),...navigation}).ProspectAuditRefresh;
 const score=load('packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts',{}).computeProspectOpportunityScore;
 const renderToStaticMarkup=require('react-dom/server').renderToStaticMarkup;
 const render=async(stage,websiteUrl,canWrite=true)=>{
  const prospect={id:'synthetic',businessName:'Synthetic business',stage,websiteUrl,updatedAt:new Date().toISOString(),metadata:{}};
  const page=load('src/app/(shell)/apps/prospecting/prospects/[prospectId]/page.tsx',{
   'react/jsx-runtime':require('react/jsx-runtime'),'next/link':({children})=>children,'next/navigation':{notFound(){throw Error('not_found');}},
   '@dg/platform-core':{computeProspectOpportunityScore:score,getGrowthProspect:async()=>prospect,organisationGrowthScope:id=>({organisationId:id}),sessionHasFeature:()=>canWrite},
   '@dg/database':{prisma:{growthProspectAudit:{findFirst:async()=>null},company:{findMany:async()=>[]},contact:{findMany:async()=>[]},membership:{findMany:async()=>[]}}},
   '@/components/prospecting/ProspectRelationshipForm':{ProspectRelationshipForm:()=>null},
   '@/components/prospecting/ProspectingCustomerActions':{ProspectEditControl:()=>react.createElement('button',null,'Edit')},
   '@/components/prospecting/ProspectingPageHeader':{ProspectingPageHeader:()=>null},
   '@/components/prospecting/ProspectQualificationActions':{ProspectQualificationActions:()=>react.createElement('button',null,'Qualify')},
   '@/components/prospecting/DecisionMakerResearch':{DecisionMakerResearch},'@/components/prospecting/ProspectAuditRefresh':{ProspectAuditRefresh},
   '@/components/prospecting/ProspectReportActions':{ProspectReportActions:()=>null},
   '@/lib/platform-page-feature':{getAuthorisedPlatformPageSession:async()=>({organisationId:'synthetic-owner',clerkUserId:'synthetic-user'})},
  }).default;
  return renderToStaticMarkup(await page({params:Promise.resolve({prospectId:'synthetic'})}));
 };
 const discovered=await render('prospect',null);assert.match(discovered,/>Start research</);assert.match(discovered,/Research has not started/);assert.match(discovered,/disabled=""[^>]*>Find decision-maker/);assert.doesNotMatch(discovered,/already moved beyond/);
 const missing=await render('audit_created',null);assert.match(missing,/Use Edit to add the business website/);assert.match(missing,/disabled=""[^>]*>Find decision-maker/);
 const research=await render('audit_created','https://example.invalid');assert.doesNotMatch(research,/disabled=""[^>]*>Find decision-maker/);assert.match(research,/>Qualify</);
 const qualified=await render('qualified','https://example.invalid');assert.match(qualified,/Qualification complete/);assert.match(qualified,/disabled=""[^>]*>Find decision-maker/);
 const readOnly=await render('prospect',null,false);assert.doesNotMatch(readOnly,/>Start research<|>Find decision-maker<|>Edit</);
});

test('audit endpoint rejects missing websites and foreign/archived prospects before research',async()=>{
 let session={organisationId:'synthetic-owner',clerkUserId:'synthetic-user'},denied=null,prospect={id:'synthetic',websiteUrl:null},reads=0,audits=0;
 const route=load('src/app/api/v1/prospecting/prospects/[id]/audit/route.ts',{
  '@dg/platform-core':{organisationGrowthScope:organisationId=>({organisationId}),getGrowthProspect:async(id,scope)=>{reads++;assert.equal(scope.organisationId,'synthetic-owner');return prospect;},runGrowthProspectAudit:async(input)=>{audits++;assert.equal(input.scope.organisationId,'synthetic-owner');return {id:'synthetic-audit'};}},
  'next/server':{NextResponse:{json:(body,{status})=>({body,status})}},
  '@/lib/platform-api':{requirePlatformAuth:async()=>session,isNextResponse:x=>Boolean(x?.status),requireFeature:()=>denied},
 },{URL}).POST;
 const call=()=>route({}, {params:Promise.resolve({id:'synthetic'})});
 assert.equal((await call()).status,422);assert.equal(audits,0);
 for(const websiteUrl of ['invalid','javascript:alert(1)','']){prospect={id:'synthetic',websiteUrl};assert.equal((await call()).status,422);}
 prospect=null;assert.equal((await call()).status,404);prospect={archivedAt:new Date(),websiteUrl:'https://example.invalid'};assert.equal((await call()).status,404);assert.equal(audits,0);
 prospect={id:'synthetic',websiteUrl:'https://example.invalid'};assert.equal((await call()).status,201);assert.equal(audits,1);
 const before=reads;denied={status:403};assert.equal((await call()).status,403);session={status:401};assert.equal((await call()).status,401);assert.equal(reads,before);assert.equal(audits,1);
});
