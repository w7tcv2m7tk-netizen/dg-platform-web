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
