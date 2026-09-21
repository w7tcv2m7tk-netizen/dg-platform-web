import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardPath = "src/app/(shell)/dashboard/page.tsx";

test("Business Overview always renders the Aida-led dashboard for signed-in organisations", async () => {
  const source = await readFile(dashboardPath, "utf8");

  assert.match(source, /<BusinessOverviewDashboard/);
  assert.doesNotMatch(source, /FoundingOperatorHome/);
  assert.doesNotMatch(source, /isFoundingCustomerMode/);
  assert.doesNotMatch(source, /foundingCustomerMode/);
});

test("Aida is the named intelligence layer and Command Centre links to the real command surface", async () => {
  const [model, advisor] = await Promise.all([
    readFile("src/components/intelligence/intelligence-model.ts", "utf8"),
    readFile("src/components/intelligence/AiAdvisorDashboard.tsx", "utf8"),
  ]);

  assert.match(model, /id: "advisor",[\s\S]*label: "Aida"/);
  assert.match(model, /id: "command",[\s\S]*href: "\/command"/);
  assert.doesNotMatch(model, /label: "AI Advisor"/);
  assert.match(advisor, /Ask Aida/);
  assert.match(advisor, /What Aida recommends you do next/);
  assert.match(advisor, /href="\/command"[\s\S]*Open Command Centre/);
});

test("Aida stays available across customer and Command Centre surfaces", async () => {
  const [provider, panel] = await Promise.all([
    readFile("src/components/platform/ChatWidgetProvider.tsx", "utf8"),
    readFile("src/components/support/SupportChatPanel.tsx", "utf8"),
  ]);

  assert.doesNotMatch(provider, /pathname\.startsWith\("\/command"\)/);
  assert.match(provider, /pathname\.startsWith\("\/support"\)/);
  assert.match(panel, /href="\/onboarding"/);
  assert.doesNotMatch(panel, /digitalgate\.com\.au\/onboarding/);
});

test("Aida is named consistently across the intelligence surfaces", async () => {
  const paths = [
    "src/app/(shell)/dashboard/insights/page.tsx",
    "src/app/(shell)/dashboard/health/page.tsx",
    "src/app/(shell)/dashboard/benchmarks/page.tsx",
    "src/app/(shell)/dashboard/twin/page.tsx",
  ];
  const sources = await Promise.all(paths.map((path) => readFile(path, "utf8")));

  for (const source of sources) {
    assert.doesNotMatch(source, /AI Advisor/);
    assert.doesNotMatch(source, /\bAdvisor can\b/);
    assert.doesNotMatch(source, /ask Advisor\b/);
  }
  assert.match(sources[0], /What is Aida noticing\?/);
  assert.match(sources[0], /Ask Aida →/);
  assert.match(sources[1], /Ask Aida →/);
  assert.match(sources[2], /Aida can prioritise the next action/);
  assert.match(sources[3], /Health, Benchmarks and Aida read/);
});
