import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import {
  buildExecutiveVerdict,
  buildReportPillars,
  buildReportPriorities,
  buildReportRoadmap,
  evidenceForFinding,
  resolveReportIndustry,
  type ReportPriority,
  type ReportPresentationFinding,
} from "@dg/platform-core/command-centre/growth-engine/report-presentation";
import { buildGrowthBlueprint, shortCapability } from "@dg/platform-core/command-centre/growth-engine/growth-blueprint";
import { loadGrowthReportSnapshot } from "@dg/platform-core/command-centre/growth-engine/report-snapshot";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 46;
const CONTENT = PAGE_W - M * 2;
const IVORY = rgb(0.961, 0.945, 0.91);
const PORCELAIN = rgb(1, 0.992, 0.98);
const CHAMPAGNE = rgb(0.918, 0.89, 0.835);
const LAVENDER = rgb(0.91, 0.89, 0.937);
const GOLD = rgb(0.722, 0.604, 0.314);
const PURPLE = rgb(0.475, 0.314, 0.769);
const SLATE = rgb(0.125, 0.157, 0.235);
const BODY = rgb(0.294, 0.333, 0.396);
const STONE = rgb(0.847, 0.816, 0.761);
const WHITE = rgb(1, 1, 1);

type Snapshot = Awaited<ReturnType<typeof loadGrowthReportSnapshot>>;
type AnyRecord = Record<string, any>;

function listFindings(value: unknown): ReportPresentationFinding[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) ? items as ReportPresentationFinding[] : [];
}

function payload(value: unknown): AnyRecord {
  return value && typeof value === "object" ? value as AnyRecord : {};
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function safe(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of String(text || "").split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) line = next;
      else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (!words.length) lines.push("");
  }
  return lines;
}

function textBlock(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = BODY, lineHeight = 1.45) {
  const lines = wrap(text, font, size, width);
  let cursor = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cursor, size, font, color });
    cursor -= size * lineHeight;
  }
  return cursor;
}

function label(page: PDFPage, text: string, x: number, y: number, font: PDFFont, color = PURPLE, size = 8) {
  page.drawText(text.toUpperCase(), { x, y, size, font, color });
}

function rule(page: PDFPage, y: number, x = M, width = CONTENT, color = STONE) {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.8, color });
}

function pageBase(doc: PDFDocument, title: string, eyebrow: string, fonts: { serif: PDFFont; sans: PDFFont }) {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: IVORY });
  page.drawRectangle({ x: M, y: PAGE_H - 26, width: 28, height: 3, color: PURPLE });
  label(page, eyebrow, M + 36, PAGE_H - 26, fonts.sans, PURPLE, 7.5);
  page.drawText(title, { x: M, y: PAGE_H - 64, size: 24, font: fonts.serif, color: SLATE });
  return page;
}

function addPageFooter(pages: PDFPage[], fonts: { sans: PDFFont }, logo?: Awaited<ReturnType<PDFDocument["embedPng"]>>) {
  pages.forEach((page, index) => {
    rule(page, 34, M, CONTENT, STONE);
    if (logo) page.drawImage(logo, { x: M, y: 18, width: 62, height: 6 });
    else page.drawText("DigitalGate", { x: M, y: 20, size: 8, font: fonts.sans, color: SLATE });
    page.drawText("Digital Opportunity Report · Private & confidential", { x: M + 74, y: 20, size: 7, font: fonts.sans, color: BODY });
    page.drawText(`${index + 1} / ${pages.length}`, { x: PAGE_W - M - 32, y: 20, size: 7, font: fonts.sans, color: BODY });
  });
}

function drawPill(page: PDFPage, text: string, x: number, y: number, font: PDFFont, fill = PORCELAIN, color = BODY) {
  const w = font.widthOfTextAtSize(text, 7.5) + 14;
  page.drawRectangle({ x, y: y - 3, width: w, height: 16, color: fill, borderColor: STONE, borderWidth: 0.6 });
  page.drawText(text, { x: x + 7, y: y + 1, size: 7.5, font, color });
  return w;
}

export async function buildOpportunityReportPdf(token: string): Promise<Uint8Array | null> {
  const { prisma } = await import("@dg/database");
  const loaded = await loadGrowthReportSnapshot(prisma, token, { kind: "public", recordView: false });
  if (!loaded) return null;
  const { report, audit, prospect } = loaded as NonNullable<Snapshot>;
  const findings = listFindings(audit?.findings);
  const data = payload(audit?.findings);
  const scorecard = payload(data.scorecard);
  const intelligence = payload(data.businessIntelligence);
  const model = payload(data.businessModel);
  const assessment = payload(data.assessment);
  const industry = resolveReportIndustry({ industry: prospect.industry, industryPack: safe(data.industryPack), businessModel: model });
  const pillars = buildReportPillars(audit, scorecard);
  const priorities = buildReportPriorities(findings, industry.pack, audit?.auditedAt ?? null);
  const blueprint = buildGrowthBlueprint({ model: model as any, priorities });
  const roadmap = buildReportRoadmap(industry.pack, priorities);
  const verdict = buildExecutiveVerdict({ businessHealth: audit?.businessHealth ?? null, pillars, priorities, pack: industry.pack, auditedAt: audit?.auditedAt ?? null, hasAudit: Boolean(audit) });
  const evidence = findings.map((finding) => ({ finding, evidence: evidenceForFinding(finding, audit?.auditedAt) }));

  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { serif, serifBold, sans, sansBold };
  let logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | undefined;
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public/brand/logo-navy-transparent.png"));
    logo = await doc.embedPng(logoBytes);
  } catch { /* text fallback only if the approved asset cannot be embedded */ }

  // 1. Cover
  const cover = doc.addPage([PAGE_W, PAGE_H]);
  cover.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: IVORY });
  cover.drawRectangle({ x: 0, y: 0, width: 8, height: PAGE_H, color: PURPLE });
  if (logo) cover.drawImage(logo, { x: M, y: PAGE_H - 74, width: 190, height: 17.6 });
  cover.drawText("DIGITAL OPPORTUNITY REPORT", { x: M, y: PAGE_H - 126, size: 26, font: serifBold, color: SLATE });
  textBlock(cover, prospect.businessName, M, PAGE_H - 177, CONTENT, serifBold as PDFFont, 38, SLATE, 1.05);
  cover.drawText([prospect.industry, prospect.location].filter(Boolean).join(" · ") || industry.pack.label, { x: M, y: PAGE_H - 224, size: 9, font: sans, color: PURPLE });
  textBlock(cover, `${fmtDate(report.generatedAt)}  ·  Evidence captured ${fmtDate(audit?.auditedAt)}`, M, PAGE_H - 250, CONTENT, sans, 8, BODY);
  cover.drawRectangle({ x: M, y: PAGE_H - 290, width: 160, height: 1, color: GOLD });
  textBlock(cover, "An evidence-led review of the current digital position, with a clear commercial next step.", M, PAGE_H - 330, CONTENT * 0.72, serif as PDFFont, 13, SLATE, 1.3);
  const score = audit?.businessHealth;
  const ringX = PAGE_W - M - 52;
  const ringY = PAGE_H - 250;
  cover.drawCircle({ x: ringX, y: ringY, size: 46, color: PORCELAIN, borderColor: STONE, borderWidth: 1 });
  cover.drawCircle({ x: ringX, y: ringY, size: 39, color: IVORY });
  cover.drawText(score == null ? "—" : String(score), { x: ringX - (score == null ? 7 : score > 9 ? 17 : 8), y: ringY - 8, size: 26, font: serifBold, color: SLATE });
  cover.drawText("/100", { x: ringX - 14, y: ringY - 21, size: 7, font: sans, color: BODY });
  cover.drawText("BUSINESS HEALTH", { x: ringX - 31, y: ringY + 54, size: 6.5, font: sansBold, color: PURPLE });
  textBlock(cover, report.executiveSummary || verdict, M, 250, CONTENT, serif as PDFFont, 11.2, BODY, 1.5);
  cover.drawRectangle({ x: M, y: 125, width: 150, height: 30, color: PURPLE });
  cover.drawText("Book a Strategy Session", { x: M + 14, y: 135, size: 9.5, font: sansBold, color: WHITE });
  cover.drawText("digitalgate.com.au/strategy-session", { x: M + 162, y: 135, size: 8, font: sans, color: PURPLE });

  // 2. Executive + health
  const health = pageBase(doc, "Digital business health", "Executive assessment", fonts);
  textBlock(health, verdict, M, PAGE_H - 102, CONTENT, serif as PDFFont, 11, BODY, 1.5);
  let hy = PAGE_H - 178;
  label(health, `Assessment coverage: ${assessment.sourceCoveragePercent ?? 0}% source · ${assessment.evidenceCoveragePercent ?? 0}% pillar`, M, hy, sans, PURPLE, 7.5); hy -= 20;
  health.drawCircle({ x: M + 50, y: hy - 34, size: 42, color: CHAMPAGNE, borderColor: STONE, borderWidth: 0.8 });
  health.drawCircle({ x: M + 50, y: hy - 34, size: 34, color: PORCELAIN });
  health.drawText(score == null ? "—" : String(score), { x: M + 32, y: hy - 45, size: 22, font: serifBold, color: SLATE });
  health.drawText("Business Health", { x: M + 108, y: hy - 4, size: 8, font: sansBold, color: SLATE });
  textBlock(health, "Directional composite across assessed pillars only. Unavailable evidence is not scored as zero.", M + 108, hy - 20, CONTENT - 110, sans, 8.5, BODY, 1.35);
  let py = hy - 105;
  for (const pillar of pillars) {
    health.drawText(pillar.label, { x: M, y: py, size: 8.5, font: sansBold, color: SLATE });
    health.drawText(pillar.value == null ? "Not Assessed" : `${pillar.value}/100`, { x: M + 260, y: py, size: 8.5, font: sans, color: BODY });
    const barX = M + 350; const barW = CONTENT - 350;
    health.drawRectangle({ x: barX, y: py + 1, width: barW, height: 6, color: CHAMPAGNE });
    if (pillar.value != null) health.drawRectangle({ x: barX, y: py + 1, width: barW * Math.max(0, Math.min(100, pillar.value)) / 100, height: 6, color: GOLD });
    py -= 28;
  }

  // 3. Understanding + opportunities
  const opp = pageBase(doc, "What matters commercially", "Business understanding and opportunities", fonts);
  let oy = PAGE_H - 102;
  textBlock(opp, `${safe(model.offering, "The public website evidence did not establish a reliable offer description.")} Apparent audiences: ${Array.isArray(model.audiences) ? model.audiences.join(" · ") : "not reliably identified"}. Market: ${safe(model.marketOrientation, "unknown")}.`, M, oy, CONTENT, serif as PDFFont, 10.5, BODY, 1.45); oy -= 58;
  if (Array.isArray(model.conversionPaths) && model.conversionPaths.length) { textBlock(opp, `Observed or inferred conversion paths: ${model.conversionPaths.join(" · ")}`, M, oy, CONTENT, sans, 8.5, BODY, 1.35); oy -= 28; }
  oy -= 8;
  priorities.forEach((priority: ReportPriority, index: number) => {
    if (oy < 190) return;
    label(opp, `0${index + 1} · ${priority.evidenceLabel}`, M, oy, sans, PURPLE, 7.5); oy -= 18;
    textBlock(opp, priority.title, M, oy, CONTENT, serifBold as PDFFont, 14, SLATE, 1.2); oy -= 28;
    textBlock(opp, priority.meaning, M, oy, CONTENT, serif as PDFFont, 9.5, BODY, 1.4); oy -= 44;
    textBlock(opp, `Action: ${priority.action}`, M, oy, CONTENT, sans, 8.5, PURPLE, 1.35); oy -= 34;
    rule(opp, oy, M, CONTENT, STONE); oy -= 16;
  });

  // 4. Growth Blueprint
  const bp = pageBase(doc, "DigitalGate Growth Blueprint", "Where capability connects to evidence", fonts);
  let by = PAGE_H - 106;
  textBlock(bp, "Only relevant capabilities are shown. Verified findings are separated from strategic hypotheses; no financial return is promised.", M, by, CONTENT, sans, 8.5, BODY, 1.4); by -= 32;
  // Capability map
  const cx = PAGE_W / 2; const cy = by - 72;
  bp.drawCircle({ x: cx, y: cy, size: 42, color: PURPLE });
  bp.drawText(prospect.businessName.slice(0, 18), { x: cx - Math.min(70, prospect.businessName.length * 4.4), y: cy + 2, size: 8, font: sansBold, color: WHITE });
  bp.drawText("business objective", { x: cx - 36, y: cy - 10, size: 6.5, font: sans, color: LAVENDER });
  blueprint.slice(0, 3).forEach((item, index) => {
    const x = [M + 44, cx, PAGE_W - M - 44][index];
    const y = index === 1 ? by - 8 : by - 70;
    bp.drawLine({ start: { x: cx, y: cy }, end: { x, y }, thickness: 1.4, color: GOLD });
    bp.drawCircle({ x, y, size: 28, color: PORCELAIN, borderColor: index === 1 ? PURPLE : STONE, borderWidth: 1 });
    bp.drawText(shortCapability(item.capability).slice(0, 20), { x: x - Math.min(38, shortCapability(item.capability).length * 3.2), y: y - 2, size: 6.5, font: sansBold, color: SLATE });
    bp.drawText(`0${index + 1}`, { x: x - 5, y: y + 30, size: 7, font: sansBold, color: PURPLE });
  });
  by -= 160;
  blueprint.forEach((item: any, index: number) => {
    if (by < 160) return;
    const boxH = 116;
    bp.drawRectangle({ x: M, y: by - boxH, width: CONTENT, height: boxH, color: PORCELAIN, borderColor: STONE, borderWidth: 0.7 });
    label(bp, `0${index + 1} · ${item.capability}`, M + 14, by - 20, sans, PURPLE, 7);
    textBlock(bp, item.objective, M + 14, by - 36, CONTENT - 28, serifBold as PDFFont, 10.5, SLATE, 1.2);
    let tx = by - 64;
    textBlock(bp, `${item.evidenceType === "verified_finding" ? "Verified finding" : "Strategic hypothesis"}: ${item.evidence.replace(/^[^:]+:\s*/, "")}`, M + 14, tx, CONTENT - 28, sans, 7.2, BODY, 1.25);
    tx -= 26;
    textBlock(bp, `Action: ${item.action}`, M + 14, tx, CONTENT - 28, sans, 7.2, BODY, 1.25);
    bp.drawText(`Benefit: ${item.benefit}`, { x: M + 14, y: tx - 20, size: 7.2, font: sans, color: PURPLE });
    bp.drawText(`Measure: ${item.measure}`, { x: M + 14, y: tx - 31, size: 7.2, font: sans, color: BODY });
    by -= boxH + 12;
  });

  // 5. Roadmap + strategy
  const road = pageBase(doc, "90-day strategic roadmap", "A practical sequence", fonts);
  let ry = PAGE_H - 102;
  roadmap.forEach((phase: any, index: number) => {
    road.drawCircle({ x: M + 8, y: ry - 3, size: 4, color: PURPLE });
    if (index < roadmap.length - 1) road.drawLine({ start: { x: M + 8, y: ry + 4 }, end: { x: M + 8, y: ry - 48 }, thickness: 1, color: GOLD });
    label(road, phase.period, M + 24, ry, sans, PURPLE, 7);
    textBlock(road, phase.title, M + 24, ry - 18, CONTENT - 24, serifBold as PDFFont, 13, SLATE, 1.2);
    textBlock(road, phase.action, M + 24, ry - 40, CONTENT - 24, serif as PDFFont, 9, BODY, 1.4);
    textBlock(road, phase.evidenceLed ? "Grounded in an observed finding." : "Framework guidance; verify before implementation.", M + 24, ry - 76, CONTENT - 24, sans, 7.5, BODY);
    ry -= 126;
  });
  ry -= 6;
  road.drawRectangle({ x: M, y: ry - 96, width: CONTENT, height: 88, color: CHAMPAGNE });
  label(road, "Next step", M + 16, ry - 18, sans, PURPLE, 7);
  textBlock(road, "Turn the evidence into a practical plan with a DigitalGate Strategy Session.", M + 16, ry - 38, CONTENT - 32, serifBold as PDFFont, 13, SLATE, 1.25);
  textBlock(road, "No obligation. The session starts with the verified findings and the business context only you can provide.", M + 16, ry - 62, CONTENT - 32, sans, 8, BODY, 1.35);
  road.drawText("digitalgate.com.au/strategy-session", { x: M + 16, y: ry - 82, size: 8, font: sansBold, color: PURPLE });

  // 6. Supporting evidence + methodology
  const ev = pageBase(doc, "Supporting evidence", "Appendix · findings and method", fonts);
  let ey = PAGE_H - 102;
  textBlock(ev, "The commercial assessment above is based on the public signals listed here. Detailed diagnostics are intentionally separated from the primary narrative.", M, ey, CONTENT, sans, 8.5, BODY, 1.4); ey -= 32;
  const shown = evidence.slice(0, 8);
  shown.forEach(({ finding, evidence: evd }) => {
    if (ey < 180) return;
    label(ev, evd.status.replace(/_/g, " "), M, ey, sans, PURPLE, 6.8); ey -= 14;
    textBlock(ev, finding.title || "Finding", M, ey, CONTENT, serifBold as PDFFont, 10, SLATE, 1.2); ey -= 22;
    textBlock(ev, finding.observed || finding.detail || "No direct observation was recorded.", M, ey, CONTENT, serif as PDFFont, 8, BODY, 1.3); ey -= 30;
    rule(ev, ey, M, CONTENT, STONE); ey -= 14;
  });
  const methodY = 170;
  rule(ev, methodY + 32, M, CONTENT, STONE);
  label(ev, "Method and limits", M, methodY + 14, sans, PURPLE, 7);
  textBlock(ev, "Scores are directional and evidence-weighted only across assessed pillars. AI, SEO, social and conversion signals are public-website observations, not guaranteed rankings, audiences or revenue. Unavailable evidence is Not Assessed, not a confirmed weakness. PageSpeed, ABR and independent review sources were not queried in this workflow. Strategy recommendations require validation against the business's own systems and objectives.", M, methodY - 4, CONTENT, sans, 7.2, BODY, 1.3);

  const pages = doc.getPages();
  // Custom footer with approved asset and page numbers. Cover included.
  pages.forEach((page, index) => {
    rule(page, 28, M, CONTENT, STONE);
    if (logo) page.drawImage(logo, { x: M, y: 12, width: 62, height: 5.75 });
    page.drawText("DigitalGate · Digital Opportunity Report · Private & confidential", { x: M + 72, y: 14, size: 6.5, font: sans, color: BODY });
    page.drawText(`${index + 1} / ${pages.length}`, { x: PAGE_W - M - 30, y: 14, size: 6.5, font: sans, color: BODY });
  });
  doc.setTitle(`${prospect.businessName} — Digital Opportunity Report`);
  doc.setAuthor("DigitalGate");
  doc.setSubject("Evidence-led Digital Opportunity Report");
  return doc.save();
}
