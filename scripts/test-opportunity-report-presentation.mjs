import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as presentation from "../packages/platform-core/src/command-centre/growth-engine/report-presentation.ts";

const require = createRequire(import.meta.url);
const notFound = () => { throw new Error("NOT_FOUND"); };

function moduleFrom(file, mocks) {
  const source = fs.readFileSync(file, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: (id) => id in mocks ? mocks[id] : require(id), console, process, URL }, { filename: file });
  return exports;
}

function fixture({ industry = "Finance", findings = [], scorecard = {}, businessIntelligence = {}, audit = true } = {}) {
  return {
    prospect: { businessName: `${industry} Synthetic`, industry, location: "Brisbane QLD", websiteUrl: "https://synthetic.example.test" },
    report: { generatedAt: new Date("2026-11-16T00:00:00Z") },
    audit: audit ? { auditedAt: new Date("2026-11-10T00:00:00Z"), businessHealth: 62, aiVisibility: 51, seoScore: 69, websiteHealth: 74, findings: { items: findings, scorecard, businessIntelligence } } : null,
  };
}

async function render(snapshot) {
  const page = moduleFrom("src/app/opportunity-report/[token]/page.tsx", {
    "next/navigation": { notFound },
    "@dg/database": { prisma: {} },
    "@dg/platform-core/command-centre/growth-engine/report-snapshot": { loadGrowthReportSnapshot: async () => snapshot },
    "@dg/platform-core/command-centre/growth-engine/report-presentation": presentation,
    "@/lib/prospect-report-access": { prospectReportAccess: async () => ({ kind: "public", recordView: false }) },
  }).default;
  return renderToStaticMarkup(await page({ params: Promise.resolve({ token: "synthetic" }), searchParams: Promise.resolve({}) }));
}

const finding = (overrides = {}) => ({
  title: "Homepage lacks a clear primary action",
  category: "conversion",
  domain: "website",
  severity: "warning",
  observed: "No primary action was observed.",
  detail: "No primary action was observed.",
  recommendedAction: "Establish one clear primary action.",
  ...overrides,
});

test("finance does not inherit real-estate assumptions and aligns all six pillars", async () => {
  const html = await render(fixture({ findings: [finding()] }));
  assert.match(html, /Opportunities specific to Finance/);
  assert.match(html, /AI Discoverability Readiness/);
  assert.match(html, /Reputation/);
  assert.match(html, /Conversion/);
  assert.match(html, /Growth signals/);
  assert.doesNotMatch(html, /Real Estate acquisition intelligence/);
  assert.doesNotMatch(html, /Vendor journey signals/);
  assert.doesNotMatch(html, /appraisal journey/i);
  assert.doesNotMatch(html, /vendor and buyer/i);
  assert.match(html, /Confirmed gap/);
  assert.match(html, /captured/);
  assert.match(html, /AI Discoverability Readiness/);
  assert.match(html, /current evidence|evidence/i);
});

test("commercial language and evidence freshness are presented without hiding technical evidence", async () => {
  const html = await render(fixture({ findings: [finding({ title: "No structured data detected", observed: "No structured data detected on the homepage." })], businessIntelligence: { sourceStatus: { website: { status: "observed" } } } }));
  assert.match(html, /Help Google and AI platforms better understand your business/);
  assert.match(html, /Technical finding · No structured data detected/);
  assert.match(html, /Current evidence|Review suggested|Refresh recommended/);
  assert.match(html, /not actual AI search visibility|AI Discoverability Readiness/);
  assert.match(html, /Strategy Session discovery/);
});



test("public report removes provider configuration and troubleshooting instructions", async () => {
  const html = await render(fixture({
    findings: [finding()],
    businessIntelligence: {
      sourceStatus: {
        businessIdentity: { status: "unavailable", note: "Set GOOGLE_PLACES_API_KEY and configure credentials in the provider environment." },
        googleBusinessProfile: { status: "provider_error", note: "Check Vercel environment variables and retry the provider." },
      },
    },
  }));
  assert.doesNotMatch(html, /GOOGLE_PLACES_API_KEY|API_KEY|Vercel environment|provider environment/i);
  assert.doesNotMatch(html, /credentials in the provider/i);
  assert.match(html, /Not available from the public evidence/);
});

test("insufficient evidence renders Not Assessed, not a fabricated low score or strength", async () => {
  const empty = fixture({ findings: [] });
  empty.audit = {
    ...empty.audit,
    businessHealth: null,
    websiteHealth: null,
    seoScore: null,
    aiVisibility: null,
    findings: { items: [], scorecard: { reputation: null, conversionReadiness: null, growthSignals: null, searchVisibility: null }, assessment: { status: "not_assessed", assessedPillars: [], unavailablePillars: ["website", "seo", "ai", "reputation", "conversion", "growth"], evidenceCoveragePercent: 0, confidence: "low" } },
  };
  const html = await render(empty);
  assert.match(html, /Not Assessed/);
  assert.match(html, /Evidence completeness/);
  assert.match(html, /Unavailable evidence is not treated as a negative result/);
  assert.doesNotMatch(html, /clearest observed strength/i);
  assert.doesNotMatch(html, /mixed but actionable/i);
});


test("technology and marketing is not downgraded to General Business", () => {
  assert.equal(presentation.resolveReportIndustry({ industry: "Business Technology & Marketing" }).key, "technology_marketing");
  assert.equal(presentation.resolveReportIndustry({ industry: "Digital Marketing Agency" }).key, "technology_marketing");
});

test("positive observations are not promoted as improvement priorities", () => {
  const priorities = presentation.buildReportPriorities([
    finding({ title: "Structured data present", observed: "JSON-LD was observed.", detail: "Valid structured data present.", severity: "opportunity" }),
    finding({ title: "No enquiry form detected", observed: "No form was observed on the homepage.", detail: "No form was observed." }),
  ], presentation.resolveReportIndustry({ industry: "Finance" }).pack, null);
  assert.equal(priorities[0].title.includes("structured data"), false);
  assert.equal(priorities.some((priority) => /structured data present/i.test(priority.title)), false);
});

test("strengths and connected footprint consume the same website-linked profiles", async () => {
  const html = await render(fixture({
    findings: [],
    businessIntelligence: { publicProfiles: { facebook: "https://facebook.com/acme", instagram: "https://instagram.com/acme" } },
  }));
  assert.match(html, /facebook/);
  assert.match(html, /instagram/);
  assert.doesNotMatch(html, /No major social profile links were detected/);
});

test("ambiguous property finance resolves to finance, not real estate",()=>{
  for (const industry of ["Property Finance", "Property Finance Broker", "Agency Finance"]) {
    assert.equal(presentation.resolveReportIndustry({ industry }).key, "finance", industry);
  }
});

test("real estate retains vendor-journey context only for the real-estate pack", async () => {
  const html = await render(fixture({ industry: "Real Estate", findings: [finding()], businessIntelligence: { realEstateJourney: { hasAppraisalCta: false, suburbMentions: 2 } } }));
  assert.match(html, /Opportunities specific to Real Estate/);
  assert.match(html, /Vendor journey observations/);
  assert.match(html, /Not observed/);
});

for (const industry of ["Real Estate", "Hospitality & Accommodation", "Finance", "Trades & Services", "Retail & E-commerce", "Music & Creative Industries"]) {
  test(`industry pack renders for ${industry}`, async () => {
    const html = await render(fixture({ industry, findings: [finding({ category: industry.toLowerCase() })] }));
    assert.match(html, new RegExp(`Opportunities specific to ${industry.replace(/&/g, "&amp;").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(html, /What to focus on first/);
    assert.match(html, /All findings and evidence/);
    assert.match(html, /dg-report-print-cover/);
    assert.match(html, /Book a Strategy Session/);
  });
}

test("absence language is a confirmed gap and industry-specific sources are filtered", async () => {
  const finance = await render(fixture({
    industry: "Finance",
    findings: [finding({ title: "No structured data detected", observed: "No structured data detected on the homepage.", detail: "No structured data detected on the homepage." })],
    businessIntelligence: { sourceStatus: {
      businessIdentity: { status: "verified_match" },
      website: { status: "observed", note: "synthetic" },
      propertyMarketIntelligence: { status: "unavailable", note: "Synthetic Cotality" },
      reaMarketplace: { status: "unavailable", note: "Synthetic REA" },
      industryCredentials: { status: "planned", note: "Synthetic OFT" },
    } },
  }));
  assert.match(finance, /Confirmed gap/);
  assert.doesNotMatch(finance, /Cotality|REA Partner|Queensland OFT|propertyMarketIntelligence|reaMarketplace|industryCredentials/i);
  assert.match(finance, /ABR identity|Google Places|Website/);
  const realEstate = await render(fixture({ industry: "Real Estate", findings: [finding()], businessIntelligence: { sourceStatus: { propertyMarketIntelligence: { status: "unavailable", note: "Synthetic Cotality" } } } }));
  assert.match(realEstate, /Property market \(Cotality\)/);
});

test("incomplete and low-confidence evidence is labelled rather than invented", async () => {
  const incomplete = await render(fixture({ audit: false, findings: [] }));
  assert.match(incomplete, /does not contain enough evidence/i);
  assert.match(incomplete, /Framework/);
  assert.match(incomplete, /Unavailable/);
  const low = await render(fixture({ findings: [finding({ confidence: "low", observed: "A limited signal was observed." })], businessIntelligence: {} }));
  assert.match(low, /Limited evidence/);
  assert.match(low, /Source-by-source status was not recorded/);
});
