import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  buildExecutiveVerdict,
  buildReportPillars,
  buildReportPriorities,
  buildReportRoadmap,
  evidenceForFinding,
  resolveReportIndustry,
  type ReportPriority,
} from "@dg/platform-core/command-centre/growth-engine/report-presentation";
import { buildGrowthBlueprint, shortCapability } from "@dg/platform-core/command-centre/growth-engine/growth-blueprint";
import { loadGrowthReportSnapshot } from "@dg/platform-core/command-centre/growth-engine/report-snapshot";

const W = 595.28, H = 841.89, M = 46, CW = W - M * 2;
const IVORY = rgb(0.961,0.945,0.91), PAPER = rgb(1,0.992,0.98), CHAMP = rgb(0.918,0.89,0.835), LAV = rgb(0.91,0.89,0.937);
const GOLD = rgb(0.722,0.604,0.314), PURPLE = rgb(0.475,0.314,0.769), SLATE = rgb(0.125,0.157,0.235), BODY = rgb(0.294,0.333,0.396), STONE = rgb(0.847,0.816,0.761), WHITE = rgb(1,1,1);
type Fonts = { body: PDFFont; bold: PDFFont; serif: PDFFont; serifBold: PDFFont };
type Snapshot = NonNullable<Awaited<ReturnType<typeof loadGrowthReportSnapshot>>>;
type Finding = { title?: string; observed?: string; detail?: string; category?: string; domain?: string; severity?: string; interpretation?: string; recommendedAction?: string };

const clean = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const payload = (value: unknown): Record<string, any> => value && typeof value === "object" ? value as Record<string, any> : {};
const listFindings = (value: unknown): Finding[] => Array.isArray(payload(value).items) ? payload(value).items.filter((item: unknown) => item && typeof item === "object") : [];
const fmt = (value: unknown) => { const d = new Date(value as any); return Number.isNaN(d.getTime()) ? "Not recorded" : d.toLocaleDateString("en-AU", { day:"numeric", month:"long", year:"numeric" }); };

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = [];
  for (const para of String(text || "").split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
      else { if (line) out.push(line); line = word; }
    }
    out.push(line);
  }
  return out.length ? out : [""];
}
function block(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = BODY, lh = 1.4) {
  const lines = wrap(text, font, size, width);
  let cur = y;
  for (const line of lines) { page.drawText(line, { x, y: cur, size, font, color }); cur -= size * lh; }
  return cur;
}
function height(text: string, font: PDFFont, size: number, width: number, lh = 1.4) { return wrap(text, font, size, width).length * size * lh; }
function rule(page: PDFPage, y: number, color = STONE) { page.drawLine({ start:{x:M,y}, end:{x:W-M,y}, thickness:0.7, color }); }
function eyebrow(page: PDFPage, text: string, x: number, y: number, fonts: Fonts, color = PURPLE) { page.drawText(text.toUpperCase(), { x, y, size: 7, font: fonts.bold, color }); }
function pageStart(doc: PDFDocument, fonts: Fonts, title: string, kicker: string) {
  const page = doc.addPage([W,H]);
  page.drawRectangle({ x:0,y:0,width:W,height:H,color:IVORY });
  page.drawRectangle({ x:M,y:H-26,width:26,height:3,color:PURPLE });
  eyebrow(page, kicker, M+34, H-26, fonts);
  page.drawText(title, { x:M, y:H-64, size:24, font:fonts.serifBold, color:SLATE });
  return page;
}
function pill(page: PDFPage, text: string, x: number, y: number, fonts: Fonts, fill = PAPER, color = BODY) {
  const w = fonts.body.widthOfTextAtSize(text,7)+14;
  page.drawRectangle({x,y:y-3,width:w,height:15,color:fill,borderColor:STONE,borderWidth:0.5});
  page.drawText(text,{x:x+7,y:y+1,size:7,font:fonts.body,color});
  return w;
}
function link(page: PDFPage, doc: PDFDocument, x: number, y: number, width: number, height: number, url: string) {
  const annotation = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, y, x + width, y + height], Border: [0,0,0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } });
  const existing = page.node.lookup(PDFName.of("Annots"));
  const arr = existing && "push" in (existing as any) ? existing as any : doc.context.obj([]);
  arr.push(annotation);
  page.node.set(PDFName.of("Annots"), arr);
}

function footer(pages: PDFPage[], fonts: Fonts, logo?: PDFImage) {
  pages.forEach((p,i) => {
    rule(p,27);
    if (logo) p.drawImage(logo,{x:M,y:11,width:62,height:5.75});
    else p.drawText("DIGITALGATE",{x:M,y:13,size:7,font:fonts.bold,color:SLATE});
    p.drawText("Digital Opportunity Report · Private & confidential",{x:M+72,y:13,size:6.4,font:fonts.body,color:BODY});
    p.drawText(`${i+1} / ${pages.length}`,{x:W-M-28,y:13,size:6.4,font:fonts.body,color:BODY});
  });
}
export async function buildOpportunityReportPdf(token: string): Promise<Uint8Array | null> {
  const { prisma } = await import("@dg/database");
  const loaded = await loadGrowthReportSnapshot(prisma, token, { kind:"public", recordView:false });
  if (!loaded) return null;
  const { report, audit, prospect } = loaded as Snapshot;
  const data = payload(audit?.findings);
  const findings = listFindings(audit?.findings) as Finding[];
  const scorecard = payload(data.scorecard);
  const model = payload(data.businessModel);
  const assessment = payload(data.assessment);
  const strengths = Array.isArray(data.strengths) ? data.strengths.filter((x: unknown): x is string => typeof x === "string").slice(0,6) : [];
  const industry = resolveReportIndustry({ industry:prospect.industry, industryPack:clean(data.industryPack), businessModel:model });
  const pillars = buildReportPillars(audit, scorecard);
  const relevantFindings = model.isLocationBased === false
    ? findings.filter((finding) => !/\b(?:local|gbp|google maps|google business|maps|suburb|location|localbusiness|local listing)\b/i.test(`${finding.title || ""} ${finding.category || ""}`))
    : findings;
  const priorities = buildReportPriorities(relevantFindings as any, industry.pack, audit?.auditedAt ?? null);
  const blueprint = buildGrowthBlueprint({ model:model as any, priorities });
  const roadmap = buildReportRoadmap(industry.pack, priorities);
  const verdict = buildExecutiveVerdict({ businessHealth:audit?.businessHealth ?? null, pillars, priorities, pack:industry.pack, auditedAt:audit?.auditedAt ?? null, hasAudit:Boolean(audit) });

  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRoman), serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
  };
  let logo: PDFImage | undefined;
  try { logo = await doc.embedPng(await readFile(path.join(process.cwd(),"public/brand/logo-navy-transparent.png"))); } catch {}

  // 1. Cover
  const cover = doc.addPage([W,H]);
  cover.drawRectangle({x:0,y:0,width:W,height:H,color:IVORY});
  cover.drawRectangle({x:0,y:0,width:7,height:H,color:PURPLE});
  if (logo) cover.drawImage(logo,{x:M,y:H-76,width:198,height:18.4});
  else cover.drawText("DIGITALGATE",{x:M,y:H-70,size:20,font:fonts.bold,color:SLATE});
  cover.drawText("DIGITAL OPPORTUNITY REPORT",{x:M,y:H-130,size:27,font:fonts.serifBold,color:SLATE});
  const nameSize = prospect.businessName.length > 26 ? 28 : 38;
  block(cover,prospect.businessName,M,H-182,CW,fonts.serifBold,nameSize,SLATE,1.08);
  cover.drawText([prospect.industry,prospect.location].filter(Boolean).join(" · ") || industry.pack.label,{x:M,y:H-230,size:8.5,font:fonts.bold,color:PURPLE});
  cover.drawText(`Prepared ${fmt(report.generatedAt)} · Evidence captured ${fmt(audit?.auditedAt)}`,{x:M,y:H-250,size:7.5,font:fonts.body,color:BODY});
  cover.drawLine({start:{x:M,y:H-278},end:{x:M+165,y:H-278},thickness:1,color:GOLD});
  block(cover,"An evidence-led review of the current digital position, with a clear commercial next step.",M,H-308,CW*0.68,fonts.serif,14,SLATE,1.3);
  const sx = W-M-54, sy = H-245;
  cover.drawCircle({x:sx,y:sy,size:46,color:PAPER,borderColor:STONE,borderWidth:1});
  cover.drawCircle({x:sx,y:sy,size:39,color:IVORY});
  cover.drawText(audit?.businessHealth == null ? "—" : String(audit.businessHealth),{x:sx-17,y:sy-8,size:26,font:fonts.serifBold,color:SLATE});
  cover.drawText("/100",{x:sx-14,y:sy-21,size:7,font:fonts.body,color:BODY});
  cover.drawText("BUSINESS HEALTH",{x:sx-32,y:sy+52,size:6.5,font:fonts.bold,color:PURPLE});
  eyebrow(cover,"Inside this report",M,276,fonts);
  priorities.slice(0,3).forEach((priority: ReportPriority,i:number)=>{ cover.drawText(`0${i+1}`,{x:M,y:256-i*18,size:7,font:fonts.bold,color:GOLD}); cover.drawText(priority.title.slice(0,82),{x:M+20,y:256-i*18,size:8.2,font:fonts.body,color:BODY}); });
  cover.drawRectangle({x:M,y:132,width:155,height:30,color:PURPLE});
  cover.drawText("Book a Strategy Session",{x:M+13,y:142,size:9.5,font:fonts.bold,color:WHITE});
  link(cover,doc,M,132,155,30,"https://digitalgate.com.au/strategy-session");
  cover.drawText("digitalgate.com.au/strategy-session",{x:M+168,y:142,size:7.5,font:fonts.body,color:PURPLE});
  cover.drawText("Private & confidential",{x:M,y:94,size:7,font:fonts.body,color:BODY});

  // 2. Executive + business understanding
  const ex = pageStart(doc,fonts,"Executive assessment","The commercial view");
  let y = H-100;
  y = block(ex,report.executiveSummary || verdict,M,y,CW,fonts.serif,10.8,BODY,1.5)-14;
  y -= 10; rule(ex,y); y -= 28;
  eyebrow(ex,"Business understanding",M,y,fonts); y -= 22;
  ex.drawText(clean(model.subtype,industry.pack.label),{x:M,y,size:16,font:fonts.serifBold,color:SLATE}); y -= 24;
  y = block(ex,clean(model.offering,"The available public evidence did not establish a reliable offer description."),M,y,CW,fonts.serif,10,BODY,1.4)-12;
  const understanding = [
    `Apparent audiences: ${Array.isArray(model.audiences) && model.audiences.length ? model.audiences.join(" · ") : "not reliably identified"}`,
    `Market orientation: ${clean(model.marketOrientation,"unknown")}${model.isLocationBased === false ? " · local-service assumptions excluded" : ""}`,
    `Conversion pathways: ${Array.isArray(model.conversionPaths) && model.conversionPaths.length ? model.conversionPaths.join(" · ") : "not recorded"}`,
    `Discovery channels: ${Array.isArray(model.discoveryChannels) && model.discoveryChannels.length ? model.discoveryChannels.join(" · ") : "not recorded"}`,
  ].join("\n");
  y = block(ex,understanding,M,y,CW,fonts.body,8.5,BODY,1.45)-12;
  y = block(ex,"This is an evidence-led starting point, not a substitute for the business's own commercial context. Unverified matters are treated as hypotheses.",M,y,CW,fonts.body,8,BODY,1.4);

  // 3. Digital health
  const hp = pageStart(doc,fonts,"Digital business health","What the public signals show");
  let hy = H-104;
  hy = block(hp,verdict,M,hy,CW,fonts.serif,10.5,BODY,1.45)-12;
  const ringX=M+55, ringY=hy-55;
  hp.drawCircle({x:ringX,y:ringY,size:45,color:CHAMP,borderColor:STONE,borderWidth:1});
  hp.drawCircle({x:ringX,y:ringY,size:36,color:PAPER});
  hp.drawText(audit?.businessHealth == null ? "—" : String(audit.businessHealth),{x:ringX-17,y:ringY-8,size:24,font:fonts.serifBold,color:SLATE});
  hp.drawText("/100",{x:ringX-14,y:ringY-21,size:7,font:fonts.body,color:BODY});
  hp.drawText("Business Health",{x:M+116,y:ringY+10,size:11,font:fonts.serifBold,color:SLATE});
  block(hp,"Weighted only across assessed pillars. Unavailable evidence is never treated as zero.",M+116,ringY-8,CW-120,fonts.body,8.2,BODY,1.35);
  hp.drawText(`Source coverage ${assessment.sourceCoveragePercent ?? 0}% · pillar coverage ${assessment.evidenceCoveragePercent ?? 0}% · ${clean(assessment.confidence,"low")} confidence`,{x:M+116,y:ringY-42,size:7.2,font:fonts.body,color:PURPLE});
  let py = ringY-88;
  for (const pillar of pillars) {
    hp.drawText(pillar.label,{x:M,y:py,size:8.3,font:fonts.bold,color:SLATE});
    hp.drawText(pillar.value == null ? "Not Assessed" : `${pillar.value}/100`,{x:M+290,y:py,size:8,font:fonts.body,color:BODY});
    hp.drawRectangle({x:M+380,y:py+1,width:CW-380,height:6,color:CHAMP});
    if (pillar.value != null) hp.drawRectangle({x:M+380,y:py+1,width:(CW-380)*Math.max(0,Math.min(100,pillar.value))/100,height:6,color:GOLD});
    hp.drawText(pillar.description,{x:M,y:py-10,size:6.5,font:fonts.body,color:BODY});
    py -= 31;
  }

  // 4. Opportunities + strengths
  const op = pageStart(doc,fonts,"What matters commercially","Principal opportunities");
  let oy = H-102;
  priorities.forEach((priority: ReportPriority, i: number) => {
    const titleH = height(priority.title,fonts.serifBold,13,CW,1.1);
    block(op,`0${i+1}  ${priority.title}`,M,oy,CW,fonts.serifBold,13,SLATE,1.15); oy -= titleH+8;
    op.drawText(priority.evidenceLabel,{x:M,y:oy,size:6.8,font:fonts.bold,color:PURPLE}); oy -= 14;
    oy = block(op,priority.meaning,M,oy,CW,fonts.serif,9.2,BODY,1.35)-8;
    oy = block(op,`ACTION  ${priority.action}`,M,oy,CW,fonts.body,7.6,PURPLE,1.3)-12;
    rule(op,oy); oy -= 18;
  });
  oy -= 2; eyebrow(op,"Observed strengths",M,oy,fonts); oy -= 18;
  if (strengths.length) for (const s of strengths.slice(0,5)) { op.drawText("•",{x:M,y:oy,size:7,font:fonts.bold,color:GOLD}); oy = block(op,s,M+13,oy,CW-13,fonts.body,7.8,BODY,1.3)-7; }
  else block(op,"No strength evidence was recorded in this snapshot.",M,oy,CW,fonts.body,8,BODY,1.3);

  // 5. Growth Blueprint
  const bp = pageStart(doc,fonts,"DigitalGate Growth Blueprint","Where capability connects to evidence");
  let by = H-104;
  by = block(bp,"Only relevant capabilities are shown. Verified findings are separated from strategic hypotheses; no financial return is promised.",M,by,CW,fonts.body,8.4,BODY,1.35)-20;
  const cx=W/2, cy=by-66;
  bp.drawCircle({x:cx,y:cy,size:42,color:PURPLE});
  bp.drawText(prospect.businessName.slice(0,18),{x:cx-Math.min(66,prospect.businessName.length*4.2),y:cy+3,size:7.5,font:fonts.bold,color:WHITE});
  bp.drawText("business objective",{x:cx-35,y:cy-10,size:6.3,font:fonts.body,color:LAV});
  blueprint.slice(0,3).forEach((item: any, i: number) => {
    const x=[M+45,cx,W-M-45][i], yn=i===1?by-6:by-65;
    bp.drawLine({start:{x:cx,y:cy},end:{x,y:yn},thickness:1.2,color:GOLD});
    bp.drawCircle({x,y:yn,size:28,color:PAPER,borderColor:i===1?PURPLE:STONE,borderWidth:1});
    bp.drawText(shortCapability(item.capability).slice(0,22),{x:x-Math.min(39,shortCapability(item.capability).length*3.1),y:yn-2,size:6.2,font:fonts.bold,color:SLATE});
  });
  by -= 150;
  blueprint.slice(0,3).forEach((item: any,i:number) => {
    const ev = `${item.evidenceType==="verified_finding"?"Verified finding":"Strategic hypothesis"}: ${item.evidence.replace(/^[^:]+:\s*/,"")}`;
    const evH=height(ev,fonts.body,7.2,CW-28,1.25), actH=height(`Action: ${item.action}`,fonts.body,7.2,CW-28,1.25);
    const cardH=20+18+evH+actH+38;
    bp.drawRectangle({x:M,y:by-cardH,width:CW,height:cardH,color:PAPER,borderColor:STONE,borderWidth:0.6});
    eyebrow(bp,`0${i+1} · ${item.capability}`,M+14,by-18,fonts); 
    let cy2=by-34;
    cy2=block(bp,item.objective,M+14,cy2,CW-28,fonts.serifBold,10.5,SLATE,1.2)-8;
    cy2=block(bp,ev,M+14,cy2,CW-28,fonts.body,7.2,BODY,1.25)-6;
    cy2=block(bp,`Action: ${item.action}`,M+14,cy2,CW-28,fonts.body,7.2,BODY,1.25)-4;
    block(bp,`Benefit: ${item.benefit}  ·  Measure: ${item.measure}`,M+14,cy2,CW-28,fonts.body,7.1,PURPLE,1.25);
    by -= cardH+10;
  });

  // 6. Roadmap + Strategy Session
  const rd = pageStart(doc,fonts,"90-day strategic roadmap","A practical sequence");
  let ry=H-104;
  roadmap.forEach((phase: any,i:number)=>{
    rd.drawCircle({x:M+8,y:ry-3,size:4,color:PURPLE});
    if(i<roadmap.length-1) rd.drawLine({start:{x:M+8,y:ry+4},end:{x:M+8,y:ry-50},thickness:1,color:GOLD});
    eyebrow(rd,phase.period,M+24,ry,fonts);
    ry=block(rd,phase.title,M+24,ry-18,CW-24,fonts.serifBold,13,SLATE,1.2)-8;
    ry=block(rd,phase.action,M+24,ry,CW-24,fonts.serif,9,BODY,1.35)-10;
    rd.drawText(phase.evidenceLed?"Grounded in an observed finding.":"Framework guidance; verify before implementation.",{x:M+24,y:ry,size:6.8,font:fonts.body,color:BODY});
    ry-=38;
  });
  rd.drawRectangle({x:M,y:ry-98,width:CW,height:90,color:CHAMP});
  eyebrow(rd,"Next step",M+16,ry-18,fonts);
  block(rd,"Turn the evidence into a practical plan with a DigitalGate Strategy Session.",M+16,ry-38,CW-32,fonts.serifBold,13,SLATE,1.25);
  block(rd,"No obligation. The session starts with the verified findings and the business context only you can provide.",M+16,ry-62,CW-32,fonts.body,7.8,BODY,1.35);
  rd.drawText("digitalgate.com.au/strategy-session",{x:M+16,y:ry-84,size:7.5,font:fonts.bold,color:PURPLE});
  link(rd,doc,M+10,ry-92,180,16,"https://digitalgate.com.au/strategy-session");

  // 7. Supporting evidence + method
  let evp = pageStart(doc,fonts,"Supporting evidence","Appendix · findings and methodology");
  let ey=H-102;
  ey=block(evp,"The commercial assessment above is based on the public signals listed here. Detailed diagnostics are intentionally separated from the primary narrative.",M,ey,CW,fonts.body,8.2,BODY,1.35)-24;
  for (const finding of findings.slice(0,8)) {
    if(ey<180){ evp=pageStart(doc,fonts,"Supporting evidence continued","Appendix · findings"); ey=H-100; }
    const ev=evidenceForFinding(finding as any,audit?.auditedAt);
    evp.drawText(ev.status.replace(/_/g," ").toUpperCase(),{x:M,y:ey,size:6.2,font:fonts.bold,color:PURPLE}); ey-=13;
    ey=block(evp,finding.title||"Finding",M,ey,CW,fonts.serifBold,9.5,SLATE,1.2)-5;
    ey=block(evp,finding.observed||finding.detail||"No direct observation was recorded.",M,ey,CW,fonts.serif,7.8,BODY,1.3)-11;
    rule(evp,ey); ey-=14;
  }
  if(ey<150){ evp=pageStart(doc,fonts,"Method and limits","Appendix · methodology"); ey=H-100; }
  eyebrow(evp,"Method and limits",M,ey,fonts); ey-=18;
  block(evp,"Scores are directional and evidence-weighted only across assessed pillars. AI, SEO, social and conversion signals are public-website observations, not guaranteed rankings, audiences or revenue. Unavailable evidence is Not Assessed, not a confirmed weakness. PageSpeed, ABR and independent review sources were not queried in this workflow. Recommendations require validation against the business's own systems and objectives.",M,ey,CW,fonts.body,7.2,BODY,1.3);

  footer(doc.getPages(),fonts,logo);
  doc.setTitle(`${prospect.businessName} — Digital Opportunity Report`);
  doc.setAuthor("DigitalGate");
  doc.setSubject("Evidence-led Digital Opportunity Report");
  return doc.save();
}
