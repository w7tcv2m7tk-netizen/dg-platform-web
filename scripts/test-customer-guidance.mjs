import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const articles = read("packages/platform-core/src/help/articles.ts");
const support = read("src/app/(shell)/support/page.tsx");
const helpIndex = read("src/app/(shell)/support/help/page.tsx");
const helpArticle = read("src/app/(shell)/support/help/[slug]/page.tsx");
const supportActions = read("src/components/SupportActions.tsx");
const nativeGuides = read("src/lib/native-app-setup-guides.ts");
const guideView = read("src/components/platform/AppSetupGuideView.tsx");
const registry = read("packages/platform-core/src/apps/registry.ts");
const resolutionAction = read("src/components/ui/ResolutionAction.tsx");
const healthDashboard = read("src/components/intelligence/BusinessHealthDashboard.tsx");
const insightsDashboard = read("src/components/intelligence/InsightsDashboard.tsx");
const twinPage = read("src/app/(shell)/dashboard/twin/page.tsx");
const benchmarksPage = read("src/app/(shell)/dashboard/benchmarks/page.tsx");
const performanceStrip = read("src/components/overview/DigitalPerformanceStrip.tsx");
const analyticsPage = read("src/app/(shell)/apps/analytics/page.tsx");
const automationLogs = read("src/app/(shell)/apps/automation/logs/page.tsx");
const hostingPage = read("src/app/(shell)/apps/infrastructure/hosting/page.tsx");
const propertyManagementPage = read("src/app/(shell)/apps/property-management/page.tsx");
const marketplaceBrowser = read("src/components/marketplace/MarketplaceBrowser.tsx");
const aiCallCentre = read("src/app/(shell)/apps/ai-communications/call-centre/page.tsx");
const prospectingPage = read("src/app/(shell)/apps/prospecting/page.tsx");

test("knowledge base covers the launch-critical customer journey", () => {
  for (const slug of [
    "signup-and-organisation",
    "business-profile",
    "crm-contacts-and-opportunities",
    "tasks",
    "automation-defaults",
    "real-estate-workflow",
    "accommodation-workflow",
    "services-workflow",
    "finance-workflow",
    "billing-checkout-and-portal",
    "connections-and-imports",
    "websites-and-publishing",
    "ai-visibility-honesty",
    "getting-help",
  ]) {
    assert.match(articles, new RegExp(`slug: \\"${slug}\\"`));
  }
});

test("customer-facing support copy does not expose internal build-stage language", () => {
  const combined = `${support}\n${helpIndex}\n${helpArticle}\n${articles}`;
  assert.doesNotMatch(
    combined,
    /\bstub(?:s)?\b|Gate 1|dogfood|closed beta|\bpilot\b|for this slice|not a full help centre|coming soon|planned diagnostics/i,
  );
  assert.match(helpIndex, /Practical guidance for setting up DigitalGate/);
});

test("knowledge base teaches native Gen 2 rather than normal WordPress runtime", () => {
  assert.doesNotMatch(articles, /WordPress|wp-json|DG_WP_|re\.beta|acc\.beta/i);
  assert.doesNotMatch(articles, /DOMAIN_API_PATH_PREFIX|STRIPE_SECRET_KEY|Vercel|\.env/i);
  assert.match(articles, /Platform Core/);
  assert.match(articles, /migration step/);
  assert.match(articles, /native Real Estate app/);
  assert.match(articles, /native Accommodation app/);
});

test("knowledge base routes provide a clear support escalation path", () => {
  assert.match(helpIndex, /href=\"\/support\"/);
  assert.match(helpIndex, /SUPPORT_MAILTO/);
  assert.match(helpArticle, /href=\"\/support\"/);
  assert.match(helpArticle, /SUPPORT_MAILTO/);
  assert.match(support, /SupportChatPanel/);
  assert.match(support, /SupportActions/);
});

test("native app setup is authoritative and never falls back to the historical catalogue", () => {
  assert.doesNotMatch(nativeGuides, /getAppSetupGuide/);
  assert.match(nativeGuides, /platformApps\.get\(appId\)/);
  assert.match(nativeGuides, /if \(!registered\?\.enabled\) return undefined/);
  assert.match(nativeGuides, /visibility/);
  assert.doesNotMatch(nativeGuides, /WordPress|DG_WP_|re\.beta|acc\.beta|closed beta|Vercel|\.env/i);
});

test("launch-critical apps have explicit native setup guides", () => {
  for (const appId of [
    "crm",
    "commerce",
    "real-estate",
    "accommodation",
    "finance",
    "services",
    "commercial",
    "property-management",
    "websites",
    "infrastructure",
  ]) {
    assert.match(nativeGuides, new RegExp(`appId: \\"${appId}\\"`));
  }
});

test("disabled scaffold apps cannot receive customer setup guides", () => {
  assert.match(registry, /\{ manifest: creatorApp, enabled: false \}/);
  assert.match(registry, /\{ manifest: automotiveApp, enabled: false \}/);
  assert.match(nativeGuides, /if \(!registered\?\.enabled\) return undefined/);
});

test("customer setup renderer never exposes deployment environment configuration", () => {
  assert.doesNotMatch(guideView, /guide\.envVars/);
  assert.doesNotMatch(guideView, /Environment variables|Vercel|\.env\.local/i);
  assert.doesNotMatch(guideView, /step\.code/);
});

test("support, help and setup navigation meet the native touch-target floor", () => {
  for (const source of [support, helpIndex, helpArticle, supportActions, guideView]) {
    assert.match(source, /min-h-11/);
  }
});

test("migration guidance keeps historical systems outside normal Gen 2 authority", () => {
  assert.match(articles, /migration step/i);
  assert.match(articles, /should not silently become the fallback source/i);
  assert.match(articles, /does not make the old website the runtime data authority/i);
});

test("shared resolution actions support automatic, guided and manual remediation", () => {
  assert.match(resolutionAction, /automatic/);
  assert.match(resolutionAction, /guided/);
  assert.match(resolutionAction, /manual/);
  assert.match(resolutionAction, /Fix now/);
  assert.match(resolutionAction, /Help me fix this/);
});

test("Business Health and Insights findings expose a resolution path", () => {
  assert.match(healthDashboard, /ResolutionAction/);
  assert.match(healthDashboard, /Improve coverage/);
  assert.match(healthDashboard, /Improve this/);
  assert.match(insightsDashboard, /ResolutionAction/);
  assert.match(insightsDashboard, /Get help fixing it/);
});

test("Digital Twin incompleteness gives customers direct repair choices", () => {
  assert.match(twinPage, /ResolutionAction/);
  assert.match(twinPage, /Fix connected data/);
  assert.match(twinPage, /Complete Business Profile/);
  assert.match(twinPage, /Help me improve this/);
});

test("Benchmarks convert missing evidence and opportunities into guided actions", () => {
  assert.match(benchmarksPage, /Connect missing data/);
  assert.match(benchmarksPage, /Help me improve coverage/);
  assert.match(benchmarksPage, /Show me what to fix first/);
});

test("Command Centre growth performance never leaves stale or missing evidence passive", () => {
  assert.match(performanceStrip, /Refresh now/);
  assert.match(performanceStrip, /Fix missing data/);
  assert.match(performanceStrip, /Fix website data/);
});

test("Analytics missing evidence routes users directly to data connection or Advisor", () => {
  assert.match(analyticsPage, /Connect data sources/);
  assert.match(analyticsPage, /Help me choose what to connect/);
  assert.match(analyticsPage, /ResolutionAction/);
});

test("Automation empty activity state provides setup and guidance actions", () => {
  assert.match(automationLogs, /Review automation rules/);
  assert.match(automationLogs, /Open setup guide/);
  assert.match(automationLogs, /Help me automate this/);
});

test("Hosting routes DNS and SSL problems to the exact repair surfaces", () => {
  assert.match(hostingPage, /Hosting needs attention/);
  assert.match(hostingPage, /Fix DNS/);
  assert.match(hostingPage, /Check SSL status/);
  assert.match(hostingPage, /Help me fix hosting/);
});

test("Property Management open maintenance is a direct resolution path", () => {
  assert.match(propertyManagementPage, /\/apps\/property-management\/maintenance/);
  assert.match(propertyManagementPage, /Resolve maintenance/);
});

test("Marketplace zero-result filters always provide a one-click recovery", () => {
  assert.match(marketplaceBrowser, /No listings match this filter/);
  assert.match(marketplaceBrowser, /Clear filters/);
  assert.match(marketplaceBrowser, /href=\"\/dashboard\/marketplace\"/);
});

test("AI Call Centre empty activity directs the customer to setup or help", () => {
  assert.match(aiCallCentre, /No call activity yet/);
  assert.match(aiCallCentre, /Create or publish an agent/);
  assert.match(aiCallCentre, /Help me set this up/);
});

test("Prospecting load failures provide retry and Advisor recovery paths", () => {
  assert.match(prospectingPage, /Try again/);
  assert.match(prospectingPage, /Get help/);
  assert.match(prospectingPage, /kept unavailable signals out of the workspace rather than estimating them/);
});
