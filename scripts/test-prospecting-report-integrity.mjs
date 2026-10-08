import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { generateGrowthReportSnapshot, loadGrowthReportSnapshot } from "../packages/platform-core/src/command-centre/growth-engine/report-snapshot.ts";

const require = createRequire(import.meta.url);
const publicAccess = { kind: "public", recordView: true };
const previewAccess = { kind: "preview", organisationId: "tenant-a" };
function fixture() {
  const prospect = { id: "p1", organisationId: "tenant-a", archivedAt: null, businessName: "Agency A", websiteUrl: "https://example.test", industry: "Real Estate", location: "Tugun", stage: "qualified" };
  const audits = [{ id: "audit-a", prospectId: "p1", auditedAt: new Date("2026-10-01"), businessHealth: 61, aiVisibility: 51, seoScore: 71, websiteHealth: 81, findings: { items: [{ title: "Evidence A", domain: "website", severity: "warning", detail: "Frozen A" }], strengths: ["Strength A"] } }];
  const reports = [];
  const engagements = [];
  let now = new Date("2026-10-02");
  const tx = {
    growthProspect: { findFirst: async ({ where }) => prospect.id === where.id && prospect.organisationId === where.organisationId && !prospect.archivedAt ? { ...prospect } : null },
    growthProspectAudit: { findFirst: async ({ where, orderBy }) => {
      const rows = audits.filter(a => a.prospectId === where.prospectId && (!where.id || a.id === where.id));
      return orderBy ? [...rows].sort((a,b) => b.auditedAt-a.auditedAt)[0] ?? null : rows[0] ?? null;
    } },
    growthProspectReport: {
      findFirst: async ({ where, include }) => {
        const rows = reports.filter(r => (!where.id || r.id === where.id) && (!where.shareToken || r.shareToken === where.shareToken) && (!where.prospectId || r.prospectId === where.prospectId) && (!where.auditId || r.auditId === where.auditId) && r.revokedAt === null && (!where.prospect || (!prospect.archivedAt && (!where.prospect.organisationId || prospect.organisationId === where.prospect.organisationId))));
        const r = rows.at(-1);
        return r ? { ...r, ...(include ? { prospect: { ...prospect } } : {}) } : null;
      },
      create: async ({ data }) => {
        const r = { id: `r${reports.length+1}`, generatedAt: new Date(now), revokedAt: null, viewCount: 0, firstViewedAt: null, ...data };
        reports.push(r); return { ...r };
      },
      updateMany: async ({ where, data }) => {
        const r = reports.find(r => r.id === where.id && !r.revokedAt && !prospect.archivedAt);
        if (!r) return { count: 0 };
        r.viewCount += data.viewCount.increment; r.firstViewedAt = data.firstViewedAt; return { count: 1 };
      },
    },
    growthProspectEngagement: { create: async ({ data }) => { engagements.push(data); return data; } },
  };
  const db = { $transaction: async fn => fn(tx) };
  return { db, tx, prospect, audits, reports, engagements, setDate: date => { now = new Date(date); } };
}
async function generated() { const f=fixture(); const { report }=await generateGrowthReportSnapshot(f.db,"p1","tenant-a"); f.engagements.length=0; return { ...f, report }; }

// Execute the real server pages/auth helper with only external boundaries mocked.
function moduleFrom(file, mocks) {
  const source=fs.readFileSync(file,"utf8");
  const code=ts.transpileModule(source,{ compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX } }).outputText;
  const exports={};
  const context={ exports, require: id => id in mocks ? mocks[id] : require(id), console, process, URL };
  vm.runInNewContext(code,context,{filename:file}); return exports;
}
const notFound=()=>{ throw new Error("NOT_FOUND"); };
function renderer(f,access) {
  return moduleFrom("src/app/opportunity-report/[token]/page.tsx",{
    "next/navigation":{notFound}, "@dg/database":{prisma:f.db},
    "@dg/platform-core/command-centre/growth-engine/report-snapshot":{loadGrowthReportSnapshot},
    "@/lib/prospect-report-access":{prospectReportAccess:async()=>access},
  }).default;
}
async function render(page,token,preview) { return renderToStaticMarkup(await page({params:Promise.resolve({token}),searchParams:Promise.resolve({preview})})); }

for(const state of ["active","archived","revoked","missing","auditless","missing-audit","foreign-audit"]) {
  test(`direct public token: ${state}`,async()=>{
    const f=await generated(); let token=f.report.shareToken;
    if(state==="archived") f.prospect.archivedAt=new Date();
    if(state==="revoked") f.reports[0].revokedAt=new Date();
    if(state==="missing") token="hostile-guessed-token";
    if(state==="auditless") f.reports[0].auditId=null;
    if(state==="missing-audit") f.audits.length=0;
    if(state==="foreign-audit") f.audits[0].prospectId="other-tenant-prospect";
    const page=renderer(f,publicAccess);
    if(state==="active") { assert.match(await render(page,token),/Evidence A/); assert.equal(f.reports[0].viewCount,1); }
    else { await assert.rejects(render(page,token),/NOT_FOUND/); assert.equal(f.reports[0].viewCount,0); assert.equal(f.engagements.length,0); }
  });
}
test("attached audit A and business identity survive audit B and prospect edits; new report renders B with new date/token",async()=>{
  const f=await generated(); const tokenA=f.report.shareToken;
  const before=await render(renderer(f,previewAccess),tokenA);
  f.audits.push({...f.audits[0],id:"audit-b",auditedAt:new Date("2026-10-04"),findings:{items:[{title:"Evidence B",detail:"Frozen B"}]}});
  f.prospect.businessName="Edited Agency"; f.prospect.location="Edited locality";
  assert.equal(await render(renderer(f,previewAccess),tokenA),before);
  f.setDate("2026-10-05"); const b=await generateGrowthReportSnapshot(f.db,"p1","tenant-a");
  assert.equal(b.created,true); assert.notEqual(b.report.shareToken,tokenA);
  assert.equal(b.report.auditId,"audit-b"); assert.equal(f.reports[0].generatedAt.toISOString(),"2026-10-02T00:00:00.000Z");
  const htmlB=await render(renderer(f,previewAccess),b.report.shareToken);
  assert.match(htmlB,/Evidence B/); assert.doesNotMatch(htmlB,/Evidence A/); assert.match(htmlB,/Edited Agency/);
  assert.equal(b.report.generatedAt.toISOString(),"2026-10-05T00:00:00.000Z");
});
test("generation reuses only the same attached audit without resetting its date",async()=>{
  const f=await generated(); f.setDate("2026-10-06"); const same=await generateGrowthReportSnapshot(f.db,"p1","tenant-a");
  assert.equal(same.created,false); assert.equal(same.report.shareToken,f.report.shareToken); assert.equal(f.reports.length,1);
});
test("revoked snapshot is not resurrected by generation",async()=>{
  const f=await generated(); f.reports[0].revokedAt=new Date(); const fresh=await generateGrowthReportSnapshot(f.db,"p1","tenant-a");
  assert.equal(fresh.created,true); assert.notEqual(fresh.report.shareToken,f.report.shareToken);
  assert.equal(await loadGrowthReportSnapshot(f.db,f.report.shareToken,publicAccess),null);
});
for(const [name,access,allowed] of [["tenant preview",previewAccess,true],["cross-tenant preview",{kind:"preview",organisationId:"tenant-b"},false],["empty preview authority",{kind:"preview",organisationId:""},false],["signed-in or bot access",{kind:"public",recordView:false},true]]) {
  test(`${name} never records engagement`,async()=>{
    const f=await generated(); const page=renderer(f,access);
    if(allowed) assert.match(await render(page,f.report.shareToken),/Evidence A/); else await assert.rejects(render(page,f.report.shareToken),/NOT_FOUND/);
    assert.equal(f.reports[0].viewCount,0); assert.equal(f.engagements.length,0); assert.equal(f.reports[0].firstViewedAt,null);
  });
}
test("public access records anonymous URL access without changing qualification",async()=>{
  const f=await generated(); await loadGrowthReportSnapshot(f.db,f.report.shareToken,publicAccess);
  assert.equal(f.engagements.length,1); assert.deepEqual(f.engagements[0].metadata,{meaning:"public_url_accessed",recipientIdentity:"unknown"});
  assert.equal(f.prospect.stage,"qualified"); assert.ok(f.reports[0].firstViewedAt);
});
test("generation cannot cross tenants or generate from archived/missing prospects",async()=>{
  const f=fixture(); assert.equal(await generateGrowthReportSnapshot(f.db,"p1","tenant-b"),null);
  assert.equal(await generateGrowthReportSnapshot(f.db,"missing","tenant-a"),null);
  f.prospect.archivedAt=new Date(); assert.equal(await generateGrowthReportSnapshot(f.db,"p1","tenant-a"),null); assert.equal(f.reports.length,0);
});
test("revocation between read and view update prevents engagement",async()=>{
  const f=await generated(); const find=f.tx.growthProspectAudit.findFirst;
  f.tx.growthProspectAudit.findFirst=async args=>{ const a=await find(args); f.reports[0].revokedAt=new Date(); return a; };
  assert.equal(await loadGrowthReportSnapshot(f.db,f.report.shareToken,publicAccess),null); assert.equal(f.engagements.length,0);
});
for(const [name,preview,session,user,headers,expected] of [
  ["anonymous public",undefined,null,null,{},true],
  ["anonymous preview","1",null,null,{},"deny"],
  ["preview without read feature","1",{organisationId:"tenant-a",read:false},{id:"u"},{},"deny"],
  ["authenticated preview","1",{organisationId:"tenant-a",read:true},{id:"u"},{},"preview"],
  ["signed-in public",undefined,{organisationId:"tenant-a",read:true},{id:"u"},{},false],
  ["crawler",undefined,null,null,{"user-agent":"Googlebot"},false],
  ["prefetch",undefined,null,null,{"next-router-prefetch":"1"},false],
]) {
  test(`request access classification: ${name}`,async()=>{
    const api=moduleFrom("src/lib/prospect-report-access.ts",{
      "next/headers":{headers:async()=>new Headers(headers)},"next/navigation":{notFound},
      "@dg/platform-core":{sessionHasFeature:s=>s.read},
      "@/lib/platform-page-context":{getPlatformPageContext:async()=>({session,user})},
    });
    if(expected==="deny") await assert.rejects(api.prospectReportAccess(preview),/NOT_FOUND/);
    else { const access=await api.prospectReportAccess(preview); assert.equal(expected==="preview"?access.kind:access.recordView,expected); }
  });
}
test("legacy report service uses same boundary and never selects newest audit or advances stage",async()=>{
  const f=await generated(); const core=moduleFrom("packages/platform-core/src/command-centre/growth-engine/reports.ts",{
    "./report-snapshot":{loadGrowthReportSnapshot},"@dg/database":{prisma:f.db},"./audits":{},"./scope":{},
    "./prospects":{updateGrowthProspect:()=>{throw new Error("unexpected stage write");}},
  });
  assert.equal((await core.getPublicGrowthOpportunityReport(f.report.shareToken,{previewOrganisationId:"tenant-a"})).scores.businessHealth,61);
  f.prospect.archivedAt=new Date(); assert.equal(await core.getPublicGrowthOpportunityReport(f.report.shareToken,{recordView:true}),null);
});
test("internal open/print use authenticated preview; downstream copy never identifies anonymous readers",()=>{
  const actions=fs.readFileSync("src/components/prospecting/ProspectReportActions.tsx","utf8");
  assert.match(actions,/window\.open\(`\$\{url\}\?preview=1`/); assert.match(actions,/href=\{`\$\{shareUrl\}\?preview=1`\}/);
  const today=fs.readFileSync("src/components/prospecting/ProspectingTodayActions.tsx","utf8");
  assert.doesNotMatch(today,/I saw you had a look/); assert.match(today,/Public report URL accessed/);
  for(const file of ["src/app/opportunity/[token]/page.tsx","src/app/opportunity-report/[token]/page.tsx"]) assert.match(fs.readFileSync(file,"utf8"),/prospectReportAccess\(preview\)/);
});

test("legacy identityless snapshot fails closed and generation creates a new token without rewriting history",async()=>{
  const f=await generated(); f.reports[0].prospectSnapshot=null;
  assert.equal(await loadGrowthReportSnapshot(f.db,f.report.shareToken,publicAccess),null);
  const fresh=await generateGrowthReportSnapshot(f.db,"p1","tenant-a");
  assert.equal(fresh.created,true); assert.notEqual(fresh.report.shareToken,f.report.shareToken);
  assert.equal(f.reports[0].prospectSnapshot,null); assert.equal(f.engagements.filter(e=>e.type==="report_viewed").length,0);
});

test("generation endpoint retains tenant/write checks and returns the explicitly generated snapshot",async()=>{
  const f=fixture();
  const route=moduleFrom("src/app/api/v1/prospecting/prospects/[id]/report/route.ts",{
    "@dg/platform-core/command-centre/growth-engine/report-snapshot":{generateGrowthReportSnapshot},
    "@dg/platform-core":{organisationGrowthScope:id=>id,getGrowthProspect:async(id,org)=>f.tx.growthProspect.findFirst({where:{id,organisationId:org}})},
    "next/server":{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    "@/lib/platform-api":{requirePlatformAuth:async()=>({organisationId:"tenant-a"}),isNextResponse:()=>false,requireFeature:()=>null},
    "@dg/database":{prisma:f.db},
  });
  const first=await route.POST(new Request("https://app.example.test/api/report"),{params:Promise.resolve({id:"p1"})});
  assert.equal(first.status,201); const body=await first.json(); assert.equal(body.data.id,f.reports[0].id);
  assert.match(body.data.shareUrl,/^https:\/\/app.example.test\/opportunity-report\/[a-f0-9]{48}$/);
  const missing=await route.POST(new Request("https://app.example.test/api/report"),{params:Promise.resolve({id:"other-tenant-prospect"})});
  assert.equal(missing.status,404);
});

test("record delivery binds to selected report audit, never latest audit",()=>{
  const route=fs.readFileSync("src/app/api/v1/prospecting/prospects/[id]/report/route.ts","utf8");
  const patch=route.slice(route.indexOf("export async function PATCH"));
  assert.match(patch,/id: body.reportId, prospectId: id, revokedAt: null/);
  assert.match(patch,/id: report.auditId, prospectId: id/);
  assert.doesNotMatch(patch,/orderBy: \{ auditedAt: "desc" \}/);
});

test("both token routes are dynamic and send cache/referrer/index protections",async()=>{
  const config=moduleFrom("next.config.ts",{}).default;
  const rules=await config.headers();
  for(const source of ["/opportunity/:token","/opportunity-report/:token"]) {
    const rule=rules.find(r=>r.source===source); assert.ok(rule);
    assert.ok(rule.headers.some(h=>h.key==="Cache-Control" && h.value.includes("no-store")));
    assert.ok(rule.headers.some(h=>h.key==="Referrer-Policy" && h.value==="no-referrer"));
    assert.ok(rule.headers.some(h=>h.key==="X-Robots-Tag" && h.value.includes("noindex")));
  }
  for(const file of ["src/app/opportunity/[token]/page.tsx","src/app/opportunity-report/[token]/page.tsx"]) assert.match(fs.readFileSync(file,"utf8"),/dynamic = "force-dynamic"/);
});

test("delivery recording executes against audit A after B and rejects a foreign report ID",async()=>{
  const f=await generated();
  f.audits.push({...f.audits[0],id:"audit-b",auditedAt:new Date("2026-10-05")});
  await generateGrowthReportSnapshot(f.db,"p1","tenant-a");
  const queried=[]; const findAudit=f.tx.growthProspectAudit.findFirst;
  f.tx.growthProspectAudit.findFirst=async args=>{ queried.push(args.where.id); return findAudit(args); };
  const prisma={...f.tx,growthProspectReport:{...f.tx.growthProspectReport,update:async({where,data})=>{
    const r=f.reports.find(r=>r.id===where.id); assert.ok(r); Object.assign(r,data); return r;
  }}};
  const route=moduleFrom("src/app/api/v1/prospecting/prospects/[id]/report/route.ts",{
    "@dg/platform-core/command-centre/growth-engine/report-snapshot":{generateGrowthReportSnapshot},
    "@dg/platform-core":{organisationGrowthScope:id=>id,getGrowthProspect:async(id,org)=>f.tx.growthProspect.findFirst({where:{id,organisationId:org}})},
    "next/server":{NextResponse:{json:(body,options)=>Response.json(body,options)}},
    "@/lib/platform-api":{requirePlatformAuth:async()=>({organisationId:"tenant-a"}),isNextResponse:()=>false,requireFeature:()=>null},
    "@dg/database":{prisma},
  });
  const request=reportId=>new Request("https://app.example.test/api/report",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"email_sent",reportId})});
  const response=await route.PATCH(request(f.report.id),{params:Promise.resolve({id:"p1"})});
  assert.equal(response.status,200); assert.deepEqual(queried,["audit-a"]); assert.ok(f.reports[0].sentAt); assert.equal(f.reports[1].sentAt,undefined);
  const prior=f.engagements.length;
  const refused=await route.PATCH(request("foreign-report-id"),{params:Promise.resolve({id:"p1"})});
  assert.equal(refused.status,409); assert.equal(f.engagements.length,prior);
});
