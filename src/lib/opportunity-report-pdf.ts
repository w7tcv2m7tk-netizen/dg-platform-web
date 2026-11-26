import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import {
  buildExecutiveVerdict,
  buildReportPillars,
  buildReportPriorities,
  buildReportRoadmap,
  evidenceForFinding,
  reconcileReportFindings,
  resolveReportIndustry,
  type ReportPriority,
} from "@dg/platform-core/command-centre/growth-engine/report-presentation";
import { buildGrowthBlueprint, shortCapability } from "@dg/platform-core/command-centre/growth-engine/growth-blueprint";
import { loadGrowthReportSnapshot } from "@dg/platform-core/command-centre/growth-engine/report-snapshot";

const W = 595.28, H = 841.89, M = 46, CW = W - M * 2;
const PREMIUM_REPORT_VERSION = "V1";
const IVORY = rgb(0.957, 0.941, 0.906);
const PAPER = rgb(1, 0.992, 0.976);
const NAVY = rgb(0.043, 0.063, 0.11);
const NAVY_SOFT = rgb(0.078, 0.106, 0.176);
const CHAMP = rgb(0.925, 0.89, 0.82);
const LAV = rgb(0.86, 0.82, 0.93);
const GOLD = rgb(0.725, 0.604, 0.337);
const PURPLE = rgb(0.435, 0.286, 0.69);
const SLATE = rgb(0.1, 0.13, 0.2);
const BODY = rgb(0.28, 0.31, 0.37);
const MUTED = rgb(0.43, 0.45, 0.5);
const STONE = rgb(0.81, 0.78, 0.71);
const WHITE = rgb(1, 1, 1);

type Fonts = { body: PDFFont; bold: PDFFont; serif: PDFFont; serifBold: PDFFont };
type Snapshot = NonNullable<Awaited<ReturnType<typeof loadGrowthReportSnapshot>>>;
type Finding = { title?: string; observed?: string; detail?: string; category?: string; domain?: string; severity?: string; interpretation?: string; recommendedAction?: string };
type Lane = { capability: string; benefit: string; measure: string };

const clean = (value: unknown, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const payload = (value: unknown): Record<string, any> => value && typeof value === "object" ? value as Record<string, any> : {};
const listFindings = (value: unknown): Finding[] => Array.isArray(payload(value).items) ? payload(value).items.filter((item: unknown) => item && typeof item === "object") : [];
const fmt = (value: unknown) => { const d = new Date(value as any); return Number.isNaN(d.getTime()) ? "Not recorded" : d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }); };
const num = (value: unknown, fallback = 0) => typeof value === "number" && Number.isFinite(value) ? value : fallback;

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
function para(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = BODY, lh = 1.4) {
  let cur = y;
  for (const line of wrap(text, font, size, width)) { page.drawText(line, { x, y: cur, size, font, color }); cur -= size * lh; }
  return cur;
}
function text(page: PDFPage, value: string, x: number, y: number, size: number, font: PDFFont, color = BODY) {
  page.drawText(value, { x, y, size, font, color });
}
function h(page: PDFPage, y: number, color = STONE) { page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color }); }
function v(page: PDFPage, x: number, y1: number, y2: number, color = STONE) { page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: 0.7, color }); }
function box(page: PDFPage, x: number, y: number, width: number, height: number, fill = PAPER, border = STONE) {
  page.drawRectangle({ x, y, width, height, color: fill, borderColor: border, borderWidth: border ? 0.6 : 0 });
}
function eyebrow(page: PDFPage, value: string, x: number, y: number, fonts: Fonts, color = PURPLE, size = 6.8) {
  text(page, value.toUpperCase(), x, y, size, fonts.bold, color);
}
function pill(page: PDFPage, value: string, x: number, y: number, fonts: Fonts, fill = PAPER, color = BODY, border = STONE) {
  const width = fonts.body.widthOfTextAtSize(value, 6.8) + 15;
  page.drawRectangle({ x, y: y - 2, width, height: 14, color: fill, borderColor: border, borderWidth: 0.5 });
  text(page, value, x + 7, y + 2, 6.8, fonts.body, color);
  return width;
}
function link(page: PDFPage, doc: PDFDocument, x: number, y: number, width: number, height: number, url: string) {
  const annotation = doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [x, y, x + width, y + height], Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } });
  const existing = page.node.lookup(PDFName.of("Annots"));
  const arr = existing && "push" in (existing as any) ? existing as any : doc.context.obj([]);
  arr.push(annotation);
  page.node.set(PDFName.of("Annots"), arr);
}
function arc(page: PDFPage, cx: number, cy: number, radius: number, start: number, end: number, color: typeof GOLD, thickness = 2) {
  const steps = Math.max(4, Math.ceil(Math.abs(end - start) / 4));
  let prev: { x: number; y: number } | null = null;
  for (let i = 0; i <= steps; i++) {
    const a = (start + (end - start) * (i / steps)) * Math.PI / 180;
    const point = { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
    if (prev) page.drawLine({ start: prev, end: point, thickness, color });
    prev = point;
  }
}
function scoreDial(page: PDFPage, cx: number, cy: number, radius: number, score: number | null, fonts: Fonts, dark = false) {
  page.drawCircle({ x: cx, y: cy, size: radius + 8, color: dark ? NAVY_SOFT : PAPER, borderColor: dark ? GOLD : STONE, borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: radius, color: dark ? NAVY : IVORY });
  if (score != null) arc(page, cx, cy, radius - 1, 90, 90 - 360 * Math.max(0, Math.min(100, score)) / 100, GOLD, 3.2);
  text(page, score == null ? "—" : String(score), cx - 16, cy - 9, 26, fonts.serifBold, dark ? WHITE : SLATE);
  text(page, "/100", cx - 13, cy - 22, 7, fonts.body, dark ? LAV : BODY);
}
function footer(page: PDFPage, index: number, total: number, fonts: Fonts, logo: PDFImage | undefined, dark = false) {
  const lineColor = dark ? rgb(0.32, 0.34, 0.4) : STONE;
  page.drawLine({ start: { x: M, y: 30 }, end: { x: W - M, y: 30 }, thickness: 0.6, color: lineColor });
  const fg = dark ? LAV : BODY;
  if (logo) page.drawImage(logo, { x: M, y: 15, width: 74, height: 6.9 });
  else text(page, "DIGITALGATE", M, 17, 7, fonts.bold, fg);
  text(page, "Digital Opportunity Report · Private & confidential", M + 86, 17, 6.3, fonts.body, fg);
  text(page, `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - M - 28, 17, 6.3, fonts.body, fg);
}
function pageBase(doc: PDFDocument, fonts: Fonts, number: string, kicker: string, title: string, opts: { band?: boolean } = {}) {
  const page = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  page.drawRectangle({ x: M, y: H - 27, width: 24, height: 2.5, color: PURPLE });
  if (opts.band) {
    page.drawRectangle({ x: 0, y: H - 154, width: W, height: 154, color: NAVY });
    page.drawRectangle({ x: 0, y: H - 154, width: W, height: 2, color: GOLD });
    eyebrow(page, kicker, M, H - 37, fonts, GOLD);
    text(page, title, M, H - 78, 24, fonts.serifBold, WHITE);
    text(page, number, W - M - 24, H - 37, 7, fonts.bold, GOLD);
  } else {
    eyebrow(page, kicker, M + 32, H - 31, fonts, PURPLE);
    text(page, title, M, H - 66, 24, fonts.serifBold, SLATE);
    text(page, number, W - M - 24, H - 31, 7, fonts.bold, PURPLE);
    h(page, H - 84, STONE);
  }
  return page;
}
function laneFor(priority: ReportPriority, index: number, blueprint: any[]): Lane {
  const title = priority.title.toLowerCase();
  const search = `${priority.title} ${priority.meaning} ${priority.action}`.toLowerCase();
  if (/analytics|tracking|measurement/.test(search)) return { capability: "DigitalGate Analytics", benefit: "A verified measurement baseline rather than assumed tracking.", measure: "Analytics presence and key enquiry events confirmed." };
  if (/booking|event|appointment|reservation/.test(title)) return { capability: "DigitalGate CRM & Automation", benefit: "A clear booking enquiry path with fewer dead ends.", measure: "Booking enquiry route and response expectation validated." };
  if (/proof|review|trust|credential/.test(search)) return { capability: "Review & Trust", benefit: "More verifiable proof at the point of decision.", measure: "A verified proof source linked to the relevant conversion path." };
  if (/owner/.test(title)) return { capability: "DigitalGate CRM + owner path", benefit: "A clear owner route with fewer dead ends.", measure: "Owner guidance live; one appraisal route with response expectation." };
  if (/primary|heading|\boffer\b|clarity/.test(title)) return { capability: "Website Manager + clarity", benefit: "The primary offer is understood in one pass.", measure: "One primary heading live on desktop and mobile." };
  if (/local|suburb|gbp|google business|map/.test(title)) return { capability: "Local visibility", benefit: "A local footprint search and AI can verify.", measure: "Service-area and local-entity evidence validated." };
  if (/artist|artist identity|artist profile/.test(title)) return { capability: "Website Manager + Artist Profile", benefit: "A coherent artist identity and booking path.", measure: "Artist identity and booking evidence validated." };
  if (/identity|verify|search|\bai\b|machine-readable/.test(search)) return { capability: "DigitalGate AI Visibility", benefit: "A business identity that search and AI can verify.", measure: "Identity data and AI guidance validated." };
  const item = blueprint[index];
  return { capability: shortCapability(item?.capability || "DigitalGate Growth"), benefit: item?.benefit || "A clearer path from interest to a commercial conversation.", measure: item?.measure || "A defined enquiry or conversion outcome, measured after implementation." };
}
function thesisFor(industryKey: string): string {
  if (industryKey === "real_estate") return "The evidence points to a different first question: making the seller and owner journey, and the business identity, easier to understand and act on.";
  if (industryKey === "hospitality_accommodation") return "The evidence points to a different first question: making direct booking and guest trust easier to understand and act on.";
  if (industryKey === "technology_marketing") return "The evidence points to a different first question: making the commercial offer, proof and qualification path easier to verify.";
  if (industryKey === "music_artist" || industryKey === "music_creative") return "The evidence points to a different first question: making the artist identity and booking evidence easier to understand.";
  return "The evidence points to a different first question: making the offer and enquiry path easier to understand and act on.";
}
function decisionFor(industryKey: string): string {
  if (industryKey === "real_estate") return "Confirm the actual service model and seller/owner journey before publishing a new path.";
  if (industryKey === "hospitality_accommodation") return "Confirm the direct-booking path and availability truth before promoting it.";
  if (industryKey === "technology_marketing") return "Confirm the primary commercial offer and qualification path before adding more proof.";
  if (industryKey === "music_artist" || industryKey === "music_creative") return "Confirm which booking or collaboration path is active before expanding promotion.";
  return "Confirm the offer and enquiry path before publishing a new journey.";
}
function identityInsight(industryKey: string): string {
  if (industryKey === "music_artist" || industryKey === "music_creative") return "The artist identity, release evidence and booking path are not yet consistent for search and AI.";
  if (industryKey === "hospitality_accommodation") return "The business identity omits location, booking and guest-service detail that visitors and AI systems rely on.";
  if (industryKey === "technology_marketing") return "The public offer and proof are not yet easy for buyers and AI systems to verify.";
  return "The public identity omits local, contact and service-area detail that buyers and AI systems rely on.";
}
function insightLine(priority: ReportPriority, industryKey: string) {
  if (priority.framework) return "Framework guidance to clarify the next commercial step.";
  const title = priority.title.toLowerCase();
  const search = `${priority.title} ${priority.meaning}`.toLowerCase();
  if (/analytics|tracking|measurement/.test(search)) return "Analytics signals were not identified on the homepage; verification is required.";
  if (/review|trust|proof|credential/.test(search)) return "The public evidence shows client proof, but not yet a clearly verifiable review source.";
  if (/owner/.test(title)) return "Owner-facing guidance is linked but does not yet lead to a clear next step.";
  if (/local|suburb|gbp|google business|map/.test(title)) return "Local and suburb evidence are not yet presented consistently on the public site.";
  if (/primary|heading|\boffer\b|clarity/.test(title)) return "The primary heading is empty; supporting copy carries the offer alone.";
  if (/identity|verify|search|\bai\b|machine-readable/.test(search)) return identityInsight(industryKey);
  return "The public evidence points to a practical next question for the Strategy Session.";
}
function evidenceLine(priority: ReportPriority) {
  if (priority.framework) return "Framework guidance only; not observed in this snapshot.";
  const title = priority.title.toLowerCase();
  const search = `${priority.title} ${priority.meaning}`.toLowerCase();
  if (/analytics|tracking|measurement/.test(search)) return "Analytics/tracking was not identified on the homepage; verification is required.";
  if (/review|trust|proof|credential/.test(search)) return "Public proof signals need a clearer, verifiable source.";
  if (/owner/.test(title)) return "Owner-facing guidance lacks a clear next step in the fetched pages.";
  if (/local|suburb|gbp|google business|map/.test(title)) return "Local entity and suburb evidence need verification.";
  if (/primary|heading|\boffer\b|clarity/.test(title)) return "The primary heading is empty.";
  if (/identity|verify|search|\bai\b|machine-readable/.test(search)) return "The public identity is incomplete for search and AI.";
  return "Further public evidence is required before a commercial decision.";
}
function evidenceLabel(finding: Finding, auditedAt: unknown) {
  return evidenceForFinding(finding as any, auditedAt as any).status.replace(/_/g, " ").toUpperCase();
}
function concise(value: string, max = 150) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max - 1);
  const last = cut.lastIndexOf(" ");
  return `${cut.slice(0, last > 40 ? last : max - 1)}…`;
}

export type OpportunityReportPdfSnapshot = Snapshot;

export async function buildOpportunityReportPdf(token: string): Promise<Uint8Array | null> {
  const { prisma } = await import("@dg/database");
  const loaded = await loadGrowthReportSnapshot(prisma, token, { kind: "public", recordView: false });
  if (!loaded) return null;
  return buildOpportunityReportPdfFromSnapshot(loaded);
}

/** Pure renderer used by the hosted route and the local acceptance harness. */
export async function buildOpportunityReportPdfFromSnapshot(loaded: OpportunityReportPdfSnapshot): Promise<Uint8Array> {
  const { report, audit, prospect } = loaded;
  const data = payload(audit?.findings);
  const findings = listFindings(audit?.findings) as Finding[];
  const scorecard = payload(data.scorecard);
  const model = payload(data.businessModel);
  const assessment = payload(data.assessment);
  const strengths = Array.isArray(data.strengths) ? data.strengths.filter((x: unknown): x is string => typeof x === "string").slice(0, 6) : [];
  const cleanFindings = reconcileReportFindings(findings as any, strengths);
  const industry = resolveReportIndustry({ industry: prospect.industry, industryPack: clean(data.industryPack), businessModel: model });
  const pillars = buildReportPillars(audit, scorecard);
  const relevantFindings = model.isLocationBased === false
    ? cleanFindings.filter((finding) => !/\b(?:local|gbp|google maps|google business|maps|suburb|location|localbusiness|local listing)\b/i.test(`${finding.title || ""} ${finding.category || ""}`))
    : cleanFindings;
  const priorities = buildReportPriorities(relevantFindings as any, industry.pack, audit?.auditedAt ?? null);
  const blueprint = buildGrowthBlueprint({ model: model as any, priorities });
  const lanes = priorities.map((priority, index) => laneFor(priority, index, blueprint));
  const roadmapPriorities = [...priorities].sort((a, b) => {
    const rank = (value: ReportPriority) => {
      const title = value.title.toLowerCase();
      if (/owner|appraisal|artist|local|suburb|booking|event|review|proof/.test(title)) return 2;
      if (/primary|heading|clarity/.test(title)) return 0;
      if (/identity|\bai\b|llms|machine-readable|analytics|tracking|measurement|structured/.test(`${value.title} ${value.meaning}`.toLowerCase())) return 1;
      return 2;
    };
    return rank(a) - rank(b);
  });
  const roadmap = buildReportRoadmap(industry.pack, roadmapPriorities);
  const roadmapLanes = roadmapPriorities.map((priority, index) => laneFor(priority, index, blueprint));
  const verdict = buildExecutiveVerdict({ businessHealth: audit?.businessHealth ?? null, pillars, priorities, pack: industry.pack, auditedAt: audit?.auditedAt ?? null, hasAudit: Boolean(audit) });
  const pillarLabel = (pillar: { key: string; label: string }) => pillar.key === "ai" ? "AI discoverability readiness" : pillar.label;
  const verdictDisplay = verdict.replace(/\bai discoverability readiness\b/gi, "AI discoverability readiness");
  const sourceCoverage = num(assessment.sourceCoveragePercent, 0);
  const pillarCoverage = num(assessment.evidenceCoveragePercent, 0);
  const confidence = clean(assessment.confidence, "low");
  const auditedAt = audit?.auditedAt ?? null;
  const evidenceAgeDays = auditedAt ? Math.max(0, Math.floor((Date.now() - new Date(auditedAt).getTime()) / 86_400_000)) : null;
  const freshnessLabel = evidenceAgeDays == null ? "Evidence date not recorded" : evidenceAgeDays <= 30 ? `Current evidence · ${evidenceAgeDays} ${evidenceAgeDays === 1 ? "day" : "days"} old` : evidenceAgeDays <= 90 ? `Refresh recommended · ${evidenceAgeDays} ${evidenceAgeDays === 1 ? "day" : "days"} old` : `Historical evidence · ${evidenceAgeDays} ${evidenceAgeDays === 1 ? "day" : "days"} old`;

  const doc = await PDFDocument.create();
  const fonts: Fonts = { body: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold), serif: await doc.embedFont(StandardFonts.TimesRoman), serifBold: await doc.embedFont(StandardFonts.TimesRomanBold) };
  let logo: PDFImage | undefined, logoOnDark: PDFImage | undefined;
  try { logo = await doc.embedPng(await readFile(path.join(process.cwd(), "public/brand/logo-navy-transparent.png"))); } catch {}
  try { logoOnDark = await doc.embedPng(await readFile(path.join(process.cwd(), "public/brand/logo-on-dark.png"))); } catch {}

  // 01 · Cover
  const cover = doc.addPage([W, H]);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  cover.drawRectangle({ x: 0, y: 0, width: 7, height: H, color: PURPLE });
  if (logo) cover.drawImage(logo, { x: M, y: H - 66, width: 198, height: 18.4 });
  else text(cover, "DIGITALGATE", M, H - 58, 19, fonts.bold, SLATE);
  text(cover, "PRIVATE & CONFIDENTIAL", W - M - 104, H - 59, 6.3, fonts.bold, MUTED);
  cover.drawLine({ start: { x: M, y: H - 91 }, end: { x: W - M, y: H - 91 }, thickness: 0.8, color: GOLD });
  eyebrow(cover, "Digital Opportunity Report", M, H - 125, fonts, PURPLE, 7.5);
  const nameSize = prospect.businessName.length > 29 ? 30 : 34;
  let cy = para(cover, prospect.businessName, M, H - 177, 372, fonts.serifBold, nameSize, NAVY, 1.02);
  text(cover, [prospect.industry, prospect.location].filter(Boolean).join(" · ") || industry.pack.label, M, cy - 12, 8.2, fonts.bold, PURPLE);
  text(cover, `Prepared ${fmt(report.generatedAt)} · Evidence captured ${fmt(auditedAt)}`, M, cy - 28, 7, fonts.body, MUTED);
  para(cover, "An evidence-led review of the public signals shaping discovery, trust and the next commercial conversation.", M, cy - 58, 340, fonts.serif, 12, BODY, 1.35);
  const dialX = W - M - 70, dialY = H - 230;
  scoreDial(cover, dialX, dialY, 43, audit?.businessHealth ?? null, fonts);
  text(cover, "BUSINESS HEALTH", dialX - 35, dialY + 58, 6.2, fonts.bold, PURPLE);
  // Deep navy feature panel with the commercial agenda.
  cover.drawRectangle({ x: 0, y: 0, width: W, height: 477, color: NAVY });
  cover.drawRectangle({ x: 0, y: 477, width: W, height: 2, color: GOLD });
  eyebrow(cover, "The first three priorities", M, 442, fonts, GOLD, 7.2);
  roadmapPriorities.slice(0, 3).forEach((priority, i) => {
    const rowY = 402 - i * 74;
    text(cover, `0${i + 1}`, M, rowY, 9, fonts.bold, GOLD);
    text(cover, priority.title, M + 31, rowY, 9.2, fonts.bold, WHITE);
    text(cover, priority.evidenceLabel, M + 31, rowY - 14, 6.5, fonts.body, LAV);
    cover.drawLine({ start: { x: M, y: rowY - 30 }, end: { x: W - M, y: rowY - 30 }, thickness: 0.5, color: rgb(0.24, 0.27, 0.34) });
  });
  cover.drawRectangle({ x: M, y: 64, width: 187, height: 35, color: PURPLE });
  text(cover, "Book a Strategy Session", M + 12, 76, 9, fonts.bold, WHITE);
  link(cover, doc, M, 64, 187, 35, "https://digitalgate.com.au/strategy-session");
  text(cover, "digitalgate.com.au/strategy-session", M + 200, 76, 7, fonts.body, LAV);
  text(cover, "Public evidence only · No customer data", M, 119, 6.8, fonts.body, LAV);
  footer(cover, 1, 7, fonts, logoOnDark, true);

  // 02 · Executive assessment
  const ex = pageBase(doc, fonts, "02", "The commercial view", "Executive assessment", { band: true });
  const summaryEnd = para(ex, report.executiveSummary || verdict, M, H - 190, 302, fonts.serif, 12.5, SLATE, 1.38);
  box(ex, W - M - 184, H - 362, 184, 168, PAPER, STONE);
  eyebrow(ex, "At a glance", W - M - 168, H - 214, fonts, PURPLE, 6.3);
  let gy = H - 238;
  gy = para(ex, clean(model.subtype, industry.pack.label), W - M - 168, gy, 160, fonts.serifBold, 9.5, SLATE, 1.1) - 10;
  gy = para(ex, concise(clean(model.offering, "The public evidence did not establish a reliable offer description."), 110), W - M - 168, gy, 160, fonts.body, 7.2, BODY, 1.3) - 9;
  eyebrow(ex, "Audience", W - M - 168, gy, fonts, MUTED, 6.1); gy -= 11;
  para(ex, (Array.isArray(model.audiences) ? model.audiences.slice(0, 3).join(" · ") : "Not reliably identified"), W - M - 168, gy, 160, fonts.body, 7, BODY, 1.25);
  eyebrow(ex, "Three evidence-backed insights", M, Math.max(470, summaryEnd - 20), fonts, PURPLE, 6.5);
  const insightTop = 452;
  priorities.slice(0, 3).forEach((priority, i) => {
    const x = M + i * (CW + 8) / 3;
    const width = (CW - 16) / 3;
    box(ex, x, insightTop - 125, width, 125, i === 0 ? PAPER : IVORY, STONE);
    ex.drawRectangle({ x, y: insightTop - 3, width, height: 3, color: i === 0 ? PURPLE : GOLD });
    text(ex, `0${i + 1}`, x + 12, insightTop - 24, 7, fonts.bold, GOLD);
    para(ex, priority.title, x + 12, insightTop - 40, width - 24, fonts.serifBold, 8.2, SLATE, 1.15);
    para(ex, insightLine(priority, industry.key), x + 12, insightTop - 67, width - 24, fonts.body, 6.9, BODY, 1.22);
    text(ex, priority.evidenceLabel, x + 12, insightTop - 112, 6.1, fonts.bold, PURPLE);
  });
  const contextY = 300;
  text(ex, "Business context", M, contextY, 13, fonts.serifBold, SLATE);
  para(ex, concise(`The public evidence points to ${clean(model.offering, "the public offer")}. The report does not assume unconfirmed services.`, 190), M, contextY - 18, 220, fonts.body, 7.2, BODY, 1.35);
  text(ex, "How to read this report", M + 260, contextY, 13, fonts.serifBold, SLATE);
  para(ex, "This is a public-evidence snapshot, not a CRM, Google Business Profile or analytics audit. Gaps are evidence to discuss, not proof of commercial failure. Private systems can change the next step.", M + 260, contextY - 18, 235, fonts.body, 7.2, BODY, 1.35);
  ex.drawRectangle({ x: M, y: 105, width: CW, height: 105, color: NAVY });
  eyebrow(ex, "Commercial thesis", M + 18, 188, fonts, GOLD, 6.3);
  para(ex, thesisFor(industry.key), M + 18, 168, 340, fonts.serifBold, 10.5, WHITE, 1.2);
  text(ex, "Evidence boundary", M + 382, 188, 6.3, fonts.bold, GOLD);
  para(ex, `${freshnessLabel} · public web only`, M + 382, 172, 120, fonts.body, 6.3, LAV, 1.2);
  para(ex, "No customer contact, CRM or private data used.", M + 382, 145, 120, fonts.body, 6, LAV, 1.2);
  footer(ex, 2, 7, fonts, logo);

  // 03 · Digital health
  const hp = pageBase(doc, fonts, "03", "What the public signals show", "Digital business health");
  hp.drawRectangle({ x: M, y: H - 365, width: 215, height: 245, color: NAVY });
  scoreDial(hp, M + 107, H - 245, 52, audit?.businessHealth ?? null, fonts, true);
  text(hp, "BUSINESS HEALTH", M + 61, H - 181, 6.5, fonts.bold, GOLD);
  text(hp, "Directional, public signals only", M + 33, H - 337, 6.8, fonts.body, LAV);
  text(hp, "What the score means", M + 238, H - 133, 13, fonts.serifBold, SLATE);
  para(hp, verdictDisplay, M + 238, H - 154, 260, fonts.body, 7.4, BODY, 1.35);
  eyebrow(hp, "Coverage & confidence", M + 238, H - 229, fonts, PURPLE, 6.3);
  para(hp, `Source coverage ${sourceCoverage}% · pillar coverage ${pillarCoverage}% · ${confidence} confidence.`, M + 238, H - 247, 260, fonts.body, 7.3, BODY, 1.3);
  para(hp, `Confidence is ${confidence} because ${sourceCoverage}% of the planned public-source set was available, even though all six pillars could be assessed from the public evidence. Source coverage is the share available; pillar coverage is the share assessable; confidence reflects the strength and consistency of those public signals, not completeness of private data.`, M + 238, H - 264, 260, fonts.body, 6.8, MUTED, 1.3);
  pill(hp, `Source ${sourceCoverage}%`, M + 238, H - 338, fonts, PAPER, PURPLE, STONE);
  pill(hp, `Pillars ${pillarCoverage}%`, M + 321, H - 338, fonts, PAPER, PURPLE, STONE);
  pill(hp, `${confidence} confidence`, M + 421, H - 338, fonts, PAPER, PURPLE, STONE);
  const pillarTop = 445;
  pillars.forEach((pillar, i) => {
    const column = i % 2, row = Math.floor(i / 2);
    const x = M + column * 254, y = pillarTop - row * 69;
    box(hp, x, y - 55, 245, 55, i % 3 === 0 ? PAPER : IVORY, STONE);
    text(hp, pillarLabel(pillar), x + 12, y - 17, 7.5, fonts.bold, SLATE);
    text(hp, pillar.value == null ? "Not Assessed" : `${pillar.value}/100`, x + 155, y - 17, 7.5, fonts.bold, pillar.value == null ? MUTED : PURPLE);
    hp.drawRectangle({ x: x + 12, y: y - 30, width: 190, height: 4, color: CHAMP });
    if (pillar.value != null) hp.drawRectangle({ x: x + 12, y: y - 30, width: 190 * Math.max(0, Math.min(100, pillar.value)) / 100, height: 4, color: GOLD });
    para(hp, pillar.key === "growth" ? "Public growth infrastructure; not demand" : concise(pillar.description, 64), x + 12, y - 44, 218, fonts.body, 7, MUTED, 1.2);
  });
  const assessed = pillars.filter((pillar) => pillar.value != null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const best = assessed[0], weakest = assessed[assessed.length - 1];
  hp.drawRectangle({ x: M, y: 150, width: CW, height: 82, color: NAVY });
  eyebrow(hp, "How to read this view", M + 16, 210, fonts, GOLD, 6.2);
  text(hp, best ? `Best observed: ${pillarLabel(best)} ${best.value}/100` : "No assessed pillar", M + 16, 190, 7, fonts.body, LAV);
  text(hp, weakest ? `Largest gap: ${pillarLabel(weakest)} ${weakest.value}/100` : "No assessed gap", M + 180, 190, 7, fonts.body, LAV);
  text(hp, "Private performance data: Not assessed", M + 340, 190, 7, fonts.body, LAV);
  text(hp, "The view is directional and public-evidence weighted; unavailable evidence is never treated as zero.", M + 16, 168, 7, fonts.body, LAV);
  footer(hp, 3, 7, fonts, logo);

  // 04 · Opportunities
  const op = pageBase(doc, fonts, "04", "The commercial agenda", "What matters commercially");
  const lead = priorities[0];
  op.drawRectangle({ x: M, y: 520, width: CW, height: 178, color: NAVY });
  text(op, "01", M + 18, 670, 9, fonts.bold, GOLD);
  text(op, "PRIORITY ONE", M + 48, 670, 6.5, fonts.bold, GOLD);
  text(op, "Why it matters", M + 48, 604, 7, fonts.bold, LAV);
  text(op, "Next move", M + 310, 604, 7, fonts.bold, LAV);
  para(op, lead.title, M + 18, 653, 470, fonts.serifBold, 20, WHITE, 1.1);
  text(op, lead.evidenceLabel, M + 18, 617, 6.4, fonts.bold, GOLD);
  para(op, concise(lead.meaning, 220), M + 48, 584, 235, fonts.body, 7.1, LAV, 1.3);
  para(op, concise(lead.action, 190), M + 310, 584, 185, fonts.body, 7.1, LAV, 1.3);
  const secondary = priorities.slice(1, 3);
  secondary.forEach((priority, i) => {
    const x = M + i * 257;
    box(op, x, 300, 246, 195, PAPER, STONE);
    op.drawRectangle({ x, y: 494, width: 246, height: 3, color: GOLD });
    text(op, `0${i + 2}`, x + 14, 469, 8, fonts.bold, PURPLE);
    text(op, priority.evidenceLabel, x + 14, 450, 6.2, fonts.bold, PURPLE);
    para(op, priority.title, x + 14, 432, 215, fonts.serifBold, 13, SLATE, 1.1);
    para(op, concise(priority.meaning, 150), x + 14, 386, 215, fonts.body, 7.1, BODY, 1.3);
    text(op, "NEXT MOVE", x + 14, 331, 6.2, fonts.bold, PURPLE);
    para(op, concise(priority.action, 145), x + 14, 319, 215, fonts.body, 6.8, BODY, 1.25);
  });
  eyebrow(op, "What is already working", M, 260, fonts, PURPLE, 6.5);
  const strengthItems = strengths.slice(0, 3);
  strengthItems.forEach((strength, i) => {
    const x = M + i * 166;
    text(op, "•", x, 236, 9, fonts.bold, GOLD);
    para(op, strength, x + 10, 236, 145, fonts.body, 6.3, BODY, 1.2);
  });
  op.drawRectangle({ x: M, y: 105, width: CW, height: 105, color: NAVY });
  eyebrow(op, "The first decision", M + 18, 188, fonts, GOLD, 6.3);
  para(op, decisionFor(industry.key), M + 18, 168, CW - 36, fonts.serifBold, 10.5, WHITE, 1.2);
  text(op, "This is a Strategy Session question, not an assumed product.", M + 18, 128, 6.8, fonts.body, LAV);
  footer(op, 4, 7, fonts, logo);

  // 05 · Growth Blueprint
  const bp = pageBase(doc, fonts, "05", "Where capability connects to evidence", "DigitalGate Growth Blueprint");
  para(bp, "A connected strategy: the verified finding, the DigitalGate response, the business benefit and the evidence that progress is real.", M, H - 108, CW, fonts.body, 7.8, BODY, 1.35);
  const cardTop = 682, cardHeight = 160, cardGap = 14;
  roadmapPriorities.slice(0, 3).forEach((priority, i) => {
    const lane = roadmapLanes[i];
    const top = cardTop - i * (cardHeight + cardGap);
    const leftWidth = 154, rightX = M + leftWidth, rightWidth = CW - leftWidth;
    bp.drawRectangle({ x: M, y: top - cardHeight, width: leftWidth, height: cardHeight, color: NAVY });
    box(bp, rightX, top - cardHeight, rightWidth, cardHeight, PAPER, STONE);
    bp.drawRectangle({ x: M, y: top - 3, width: CW, height: 3, color: GOLD });
    eyebrow(bp, `0${i + 1} · Verified finding`, M + 14, top - 21, fonts, GOLD, 6.1);
    const titleEnd = para(bp, priority.title, M + 14, top - 40, leftWidth - 28, fonts.serifBold, 9.3, WHITE, 1.12);
    text(bp, priority.evidenceLabel, M + 14, titleEnd - 9, 6.2, fonts.bold, GOLD);
    para(bp, evidenceLine(priority), M + 14, titleEnd - 27, leftWidth - 28, fonts.body, 6.5, LAV, 1.2);
    eyebrow(bp, "DigitalGate response", rightX + 16, top - 21, fonts, PURPLE, 6.1);
    para(bp, lane.capability, rightX + 16, top - 40, rightWidth - 32, fonts.serifBold, 9.4, SLATE, 1.1);
    para(bp, priority.action, rightX + 16, top - 56, rightWidth - 32, fonts.body, 7.2, BODY, 1.25);
    const bottomLabelY = top - 108;
    eyebrow(bp, "Expected benefit", rightX + 16, bottomLabelY, fonts, PURPLE, 5.9);
    eyebrow(bp, "Success indicator", rightX + 178, bottomLabelY, fonts, PURPLE, 5.9);
    para(bp, lane.benefit, rightX + 16, bottomLabelY - 14, 146, fonts.body, 6.7, BODY, 1.2);
    para(bp, lane.measure, rightX + 178, bottomLabelY - 14, 150, fonts.body, 6.7, BODY, 1.2);
  });
  para(bp, "Directional public evidence only. No revenue, ranking or AI-placement outcome is promised. Measures are proposed checks for the Strategy Session.", M, 135, CW, fonts.body, 6.4, MUTED, 1.25);
  footer(bp, 5, 7, fonts, logo);

  // 06 · Roadmap
  const rd = pageBase(doc, fonts, "06", "A practical sequence", "90-day strategic roadmap");
  para(rd, "A realistic sequence starts with the foundational correction, then builds verifiable evidence, then develops the strongest commercial path.", M, H - 108, CW, fonts.body, 7.8, BODY, 1.35);
  rd.drawLine({ start: { x: M + 12, y: 675 }, end: { x: M + 12, y: 275 }, thickness: 1, color: GOLD });
  roadmap.forEach((phase, i) => {
    const top = 665 - i * 145;
    const dark = i === 1;
    rd.drawCircle({ x: M + 12, y: top + 9, size: 5, color: dark ? GOLD : PURPLE });
    box(rd, M + 34, top - 102, CW - 34, 102, dark ? NAVY : PAPER, dark ? NAVY : STONE);
    text(rd, phase.period, M + 50, top - 16, 6.3, fonts.bold, dark ? GOLD : PURPLE);
    const roadmapPriority = roadmapPriorities[i];
    para(rd, roadmapPriority?.title || phase.title, M + 50, top - 33, 420, fonts.serifBold, 13, dark ? WHITE : SLATE, 1.1);
    para(rd, roadmapPriority?.action || phase.action, M + 50, top - 58, 410, fonts.body, 7.3, dark ? LAV : BODY, 1.3);
    text(rd, phase.evidenceLed ? "EVIDENCE-LED" : "FRAMEWORK GUIDANCE", M + 50, top - 87, 5.9, fonts.bold, dark ? GOLD : PURPLE);
    text(rd, `PROGRESS · ${concise(roadmapLanes[i]?.measure || "Confirm the indicator in the session.", 96)}`, M + 182, top - 87, 6.3, fonts.body, dark ? LAV : MUTED);
  });
  rd.drawRectangle({ x: M, y: 112, width: CW, height: 95, color: NAVY });
  eyebrow(rd, "Next step", M + 18, 181, fonts, GOLD, 6.5);
  para(rd, "Turn the evidence into a practical plan with a DigitalGate Strategy Session.", M + 18, 164, 350, fonts.serifBold, 13, WHITE, 1.15);
  text(rd, "digitalgate.com.au/strategy-session", M + 18, 130, 7.2, fonts.bold, GOLD);
  link(rd, doc, M + 18, 124, 200, 16, "https://digitalgate.com.au/strategy-session");
  footer(rd, 6, 7, fonts, logo);

  // 07 · Evidence and method
  const ev = pageBase(doc, fonts, "07", "Appendix · traceable observations", "Evidence and method");
  para(ev, "The assessment above is grounded in these public observations. Technical detail is separated from the executive narrative so the commercial argument remains readable.", M, H - 108, CW, fonts.body, 7.8, BODY, 1.35);
  const evidenceItems = cleanFindings.slice(0, 4);
  evidenceItems.forEach((finding, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * 254, top = 675 - row * 130;
    box(ev, x, top - 115, 245, 115, i === 3 ? PAPER : IVORY, STONE);
    text(ev, evidenceLabel(finding, auditedAt), x + 12, top - 16, 5.9, fonts.bold, PURPLE);
    para(ev, finding.title || "Finding", x + 12, top - 32, 220, fonts.serifBold, 9.2, SLATE, 1.15);
    para(ev, finding.observed || finding.detail || "No direct observation was recorded.", x + 12, top - 57, 220, fonts.body, 6.8, BODY, 1.2);
    text(ev, concise(clean(finding.source, "Public website observation"), 64), x + 12, top - 104, 6.1, fonts.body, MUTED);
  });
  ev.drawRectangle({ x: M, y: 105, width: CW, height: 300, color: NAVY });
  eyebrow(ev, "Method and limits", M + 18, 380, fonts, GOLD, 6.5);
  const methodX = [M + 18, M + 185, M + 352];
  text(ev, "How to read the score", methodX[0], 359, 8.2, fonts.serifBold, WHITE);
  para(ev, `Source coverage ${sourceCoverage}%. Pillar coverage ${pillarCoverage}%. Confidence ${confidence}. The score is directional, weighted only across assessed public-evidence pillars.`, methodX[0], 343, 145, fonts.body, 6.8, LAV, 1.3);
  text(ev, "What is not included", methodX[1], 359, 8.2, fonts.serifBold, WHITE);
  para(ev, "No private analytics, CRM, call tracking, Google Business Profile or customer outcome data. Unavailable evidence is marked Not Assessed, never zero.", methodX[1], 343, 145, fonts.body, 6.8, LAV, 1.3);
  text(ev, "What changes the view", methodX[2], 359, 8.2, fonts.serifBold, WHITE);
  para(ev, "Confirmed service scope, current first-party follow-up, analytics/GBP access and a short conversation with the principal could change the priority order.", methodX[2], 343, 145, fonts.body, 6.8, LAV, 1.3);
  ev.drawLine({ start: { x: M + 18, y: 319 }, end: { x: W - M - 18, y: 319 }, thickness: 0.5, color: rgb(0.27, 0.3, 0.38) });
  const statusCounts = cleanFindings.reduce((acc, finding) => { const status = evidenceLabel(finding, auditedAt); acc[status] = (acc[status] || 0) + 1; return acc; }, {} as Record<string, number>);
  text(ev, "Evidence ledger", M + 18, 296, 7, fonts.bold, GOLD);
  text(ev, `${statusCounts["CONFIRMED GAP"] || 0} confirmed gaps · ${statusCounts["LIMITED"] || 0} limited · ${statusCounts["OBSERVED"] || 0} positive · ${statusCounts["UNAVAILABLE"] || 0} unavailable`, M + 18, 279, 6.4, fonts.body, LAV);
  text(ev, `Page 4 records ${Math.min(3, strengths.length)} observed public foundations.`, M + 18, 262, 6.4, fonts.body, LAV);
  para(ev, `Evidence date and public source are retained per observation. Recommendations require validation against ${prospect.businessName}'s own systems, service scope and commercial objectives.`, M + 18, 240, CW - 36, fonts.body, 6.4, LAV, 1.3);
  ev.drawLine({ start: { x: M + 18, y: 218 }, end: { x: W - M - 18, y: 218 }, thickness: 0.5, color: rgb(0.27, 0.3, 0.38) });
  text(ev, "The next step is a conversation, not a conclusion.", M + 18, 198, 12, fonts.serifBold, WHITE);
  para(ev, "Use the Strategy Session to confirm service scope, first-party context and the strongest commercial path before the next iteration.", M + 18, 182, CW - 36, fonts.body, 6.6, LAV, 1.3);
  footer(ev, 7, 7, fonts, logo);

  doc.setTitle(`${prospect.businessName} — Digital Opportunity Report`);
  doc.setAuthor("DigitalGate");
  doc.setSubject(`DigitalGate Premium Report ${PREMIUM_REPORT_VERSION} — Evidence-led Digital Opportunity Report`);
  return doc.save();
}
