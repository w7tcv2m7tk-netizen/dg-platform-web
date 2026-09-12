import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const articles = fs.readFileSync("packages/platform-core/src/help/articles.ts", "utf8");
const support = fs.readFileSync("src/app/(shell)/support/page.tsx", "utf8");
const helpIndex = fs.readFileSync("src/app/(shell)/support/help/page.tsx", "utf8");
const helpArticle = fs.readFileSync("src/app/(shell)/support/help/[slug]/page.tsx", "utf8");
const supportActions = fs.readFileSync("src/components/SupportActions.tsx", "utf8");

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

test("customer-facing support copy does not describe launch guidance as unfinished", () => {
  const combined = `${support}\n${helpIndex}\n${helpArticle}\n${articles}`;
  assert.doesNotMatch(combined, /short stubs/i);
  assert.doesNotMatch(combined, /not a full help centre/i);
  assert.doesNotMatch(combined, /placeholder|coming soon|planned diagnostics/i);
});

test("knowledge base routes provide a clear support escalation path", () => {
  assert.match(helpIndex, /href=\"\/support\"/);
  assert.match(helpIndex, /SUPPORT_MAILTO/);
  assert.match(helpArticle, /href=\"\/support\"/);
  assert.match(helpArticle, /SUPPORT_MAILTO/);
  assert.match(support, /SupportChatPanel/);
  assert.match(support, /SupportActions/);
});

test("support and help navigation meet the native touch-target floor", () => {
  for (const source of [support, helpIndex, helpArticle, supportActions]) {
    assert.match(source, /min-h-11/);
  }
  assert.match(supportActions, /Open in email app/);
  assert.match(supportActions, /Copy email/);
});

test("migration guidance keeps legacy systems outside normal Gen 2 authority", () => {
  assert.match(articles, /explicit migration\/import workflow/i);
  assert.match(articles, /should not silently become the fallback source/i);
  assert.match(articles, /does not make the old website the runtime data authority/i);
});
