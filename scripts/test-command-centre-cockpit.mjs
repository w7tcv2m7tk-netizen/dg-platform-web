import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const page = read("src/app/(shell)/command/[[...segments]]/page.tsx");
const home = read("src/components/command/CommandOpsHome.tsx");
const advisor = read("src/components/command/AiAdvisorPanel.tsx");
const presentation = read("packages/platform-core/src/command-centre/presentation.ts");
const overview = read("packages/platform-core/src/command-centre/overview.ts");

test("Command Centre remains the canonical operator cockpit on /command", () => {
  assert.match(page, /requirePlatformOperatorContext/);
  assert.match(page, /getOperatorCommandCentreOpsHome/);
  assert.match(page, /getOperatorClientIntelligence/);
  assert.match(page, /CommandOpsHome/);
  assert.match(page, /#command-advisor/);
  assert.match(page, /#command-attention/);
  assert.match(page, /\/aida\/aida-thinking\.webp/);
  assert.doesNotMatch(page, /mock|fakeMrr|placeholderCustomers/i);
});

test("Command cockpit uses the seven-layer operator IA", () => {
  for (const id of [
    "command-executive-pulse",
    "command-advisor",
    "command-priorities",
    "command-attention",
    "command-customers",
    "command-commercial",
    "command-platform",
    "command-activity",
  ]) {
    assert.match(home, new RegExp(`id="${id}"`));
  }
  for (const label of [
    "Executive Pulse",
    "Aida Intelligence",
    "Priorities & Alerts",
    "Customers & Growth",
    "Revenue / Commercial",
    "Platform & Delivery Health",
    "Recent Activity",
  ]) {
    assert.match(home, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("Command cockpit keeps live operator capabilities and does not invent trials", () => {
  assert.match(home, /SalesWeekNowBanner/);
  assert.match(home, /AiAdvisorPanel/);
  assert.match(home, /billing\.estimatedMrrLabel/);
  assert.match(home, /pulse\.organisations/);
  assert.match(home, /Ask Aida/);
  assert.match(home, /buildCommandCockpitPresentation/);
  assert.match(advisor, /\/api\/v1\/command\/advisor/);
  assert.match(presentation, /Dedicated trial count is not in this view/);
  assert.doesNotMatch(home, /Math\.random|faker|dummyMrr|mockClients/);
  assert.doesNotMatch(overview, /estimatedMrrCents:\s*[1-9]/);
});

test("Command cockpit presentation is derived from live ops-home fields", () => {
  assert.match(presentation, /buildCommandCockpitPresentation/);
  assert.match(presentation, /Dedicated trial count is not in this view/);
  assert.match(presentation, /Does not invent trials/);
});

test("primary Command cockpit actions keep the native touch-target floor", () => {
  assert.match(page, /min-h-11/);
  assert.match(home, /min-h-11/);
  assert.match(advisor, /min-h-11/);
});

function fixture(overrides = {}) {
  return {
    generatedAt: "2026-09-21T02:00:00.000Z",
    briefing: "DigitalGate Platform Operations — run DigitalGate, not customer industry ops.",
    pulse: {
      organisations: 12,
      users: 18,
      leads: 40,
      leadsThisWeek: 3,
      openOpportunities: 5,
      growthProspects: 2,
      growthInPipeline: 2,
      growthEngagementsThisWeek: 1,
      openTasksDue: 0,
      overdueLeadResponses: 2,
      estimatedMrrCents: 0,
    },
    today: [],
    organisationHealth: {
      totalOrganisations: 12,
      organisationsWithSufficientData: 4,
      averageHealth: null,
      averageHealthLabel: "Insufficient data",
      needsAttentionCount: 1,
    },
    actions: [
      {
        id: "overdue-leads",
        severity: "urgent",
        title: "2 overdue lead responses",
        detail: "Across customer organisations",
        href: "/command/clients",
      },
    ],
    clients: [],
    connectors: {
      stripeOk: true,
      stripeMode: "live",
      orgsWithBillingCustomer: 2,
      wordpressConfiguredCount: 1,
      wordpressSyncedRecently: 0,
      orgs: [],
    },
    billing: {
      activeSubscriptions: 0,
      estimatedMrrCents: 0,
      invoicePaidMtdCents: 0,
      orgsWithBillingCustomer: 2,
      stripeOk: true,
      stripeMode: "live",
      estimatedMrrLabel: "A$0",
      invoicePaidMtdLabel: "A$0",
    },
    referEarn: {
      totalReferrals: 0,
      invited: 0,
      signedUp: 0,
      paid: 0,
      creditsMtdCents: 0,
    },
    growth: { totalProspects: 2, byStage: {}, engagementsThisWeek: 1 },
    growthEngine: {
      prospects: 2,
      engagementsThisWeek: 1,
      activePipeline: 2,
      topPriorityLabel: null,
      topPriorityScore: null,
      href: "/apps/prospecting",
    },
    delivery: {
      activeImplementations: 0,
      awaitingCustomerInfo: 0,
      blocked: 0,
      inTraining: 0,
      inQa: 0,
      readyForGoLive: 0,
    },
    partnerPulse: {
      foundingResellers: 0,
      activeProspects: 0,
      referredCustomers: 0,
      onboardingCount: 0,
      pendingCommissionsCents: 0,
    },
    recentActivity: [],
    platformOperations: [],
    ...overrides,
  };
}

test("cockpit presentation never fabricates trial or health numbers", async () => {
  const { buildCommandCockpitPresentation } = await import(
    pathToFileURL(
      path.join(root, "packages/platform-core/src/command-centre/presentation.ts"),
    ).href
  );

  const cockpit = buildCommandCockpitPresentation(fixture());
  assert.equal(cockpit.status, "critical");
  assert.match(cockpit.statusDetail, /urgent/);
  const trials = cockpit.pulseMetrics.find((metric) => metric.id === "trials");
  assert.equal(trials.available, false);
  assert.equal(trials.value, "—");
  assert.match(trials.detail, /not in this view/i);
  const health = cockpit.pulseMetrics.find((metric) => metric.id === "health");
  assert.equal(health.available, false);
  assert.equal(health.value, "Insufficient data");
  const mrr = cockpit.pulseMetrics.find((metric) => metric.id === "mrr");
  assert.equal(mrr.value, "A$0");
  assert.equal(mrr.available, true);
});

test("quiet cockpit recedes to a steady status from live empty queues", async () => {
  const { buildCommandCockpitPresentation } = await import(
    pathToFileURL(
      path.join(root, "packages/platform-core/src/command-centre/presentation.ts"),
    ).href
  );

  const cockpit = buildCommandCockpitPresentation(
    fixture({
      actions: [],
      organisationHealth: {
        totalOrganisations: 3,
        organisationsWithSufficientData: 3,
        averageHealth: 82,
        averageHealthLabel: "Healthy",
        needsAttentionCount: 0,
      },
      pulse: {
        organisations: 3,
        users: 4,
        leads: 0,
        leadsThisWeek: 0,
        openOpportunities: 0,
        growthProspects: 0,
        growthInPipeline: 0,
        growthEngagementsThisWeek: 0,
        openTasksDue: 0,
        overdueLeadResponses: 0,
        estimatedMrrCents: 0,
      },
      growthEngine: {
        prospects: 0,
        engagementsThisWeek: 0,
        activePipeline: 0,
        topPriorityLabel: null,
        topPriorityScore: null,
        href: "/apps/prospecting",
      },
    }),
  );

  assert.equal(cockpit.status, "steady");
  assert.equal(cockpit.criticalAlertCount, 0);
  assert.match(cockpit.needsAttention[0].text, /Nothing requires/);
});
