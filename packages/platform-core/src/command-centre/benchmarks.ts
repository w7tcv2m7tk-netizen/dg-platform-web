/**
 * Anonymous cohort benchmarking across client organisations.
 * @see docs/COMMAND-CENTRE.md
 */

import { getClientIntelligence } from "./client-intelligence";
import type { BenchmarkComparison } from "./types";

export type OrgBenchmarkCard = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  successScore: number;
  rank: number;
  percentile: number;
  cohortLabel: string;
  comparisons: BenchmarkComparison[];
};

export type BenchmarksBundle = {
  generatedAt: string;
  cohortLabel: string;
  cohortSize: number;
  averages: Record<string, number>;
  topDecile: Record<string, number>;
  orgs: OrgBenchmarkCard[];
};

function percentileRank(sortedDesc: number[], value: number): number {
  if (sortedDesc.length === 0) return 50;
  const better = sortedDesc.filter((v) => v > value).length;
  return Math.round(((sortedDesc.length - better) / sortedDesc.length) * 100);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function topDecileValue(sortedDesc: number[]): number {
  if (!sortedDesc.length) return 0;
  const idx = Math.max(0, Math.ceil(sortedDesc.length * 0.1) - 1);
  return sortedDesc[idx] ?? sortedDesc[0];
}

/** Cross-client performance benchmarks (anonymous cohort stats). */
export async function getCommandBenchmarks(input?: {
  organisationId?: string;
}): Promise<BenchmarksBundle> {
  const intelligence = await getClientIntelligence();
  const now = new Date();
  const clients = intelligence.clients;
  const cohortLabel =
    clients.length >= 10 ? "All platform clients" : "Early cohort (all tenants)";

  const successScores = clients.map((c) => c.successScore).sort((a, b) => b - a);
  const connectors = clients
    .map((c) => c.scoreBreakdown.connectors)
    .sort((a, b) => b - a);
  const crm = clients.map((c) => c.scoreBreakdown.crm).sort((a, b) => b - a);
  const usage = clients.map((c) => c.scoreBreakdown.usage).sort((a, b) => b - a);
  const billing = clients.map((c) => c.scoreBreakdown.billing).sort((a, b) => b - a);
  const leads = clients.map((c) => c.leadCount).sort((a, b) => b - a);
  const contacts = clients.map((c) => c.contactCount).sort((a, b) => b - a);

  const averages = {
    success_score: average(successScores),
    connectors: average(connectors),
    crm: average(crm),
    usage: average(usage),
    billing: average(billing),
    leads: average(leads),
    contacts: average(contacts),
  };

  const top = {
    success_score: topDecileValue(successScores),
    connectors: topDecileValue(connectors),
    crm: topDecileValue(crm),
    usage: topDecileValue(usage),
    billing: topDecileValue(billing),
    leads: topDecileValue(leads),
    contacts: topDecileValue(contacts),
  };

  let targetClients = clients;
  if (input?.organisationId) {
    targetClients = clients.filter((c) => c.organisationId === input.organisationId);
  }

  const orgs: OrgBenchmarkCard[] = targetClients.map((client) => {
    const metrics: Array<{
      metricId: BenchmarkComparison["metricId"];
      yourValue: number;
      cohortAverage: number;
      topDecile: number;
      sorted: number[];
    }> = [
      {
        metricId: "success_score",
        yourValue: client.successScore,
        cohortAverage: averages.success_score,
        topDecile: top.success_score,
        sorted: successScores,
      },
      {
        metricId: "conversion",
        yourValue: client.scoreBreakdown.crm,
        cohortAverage: averages.crm,
        topDecile: top.crm,
        sorted: crm,
      },
      {
        metricId: "automation",
        yourValue: client.scoreBreakdown.usage,
        cohortAverage: averages.usage,
        topDecile: top.usage,
        sorted: usage,
      },
      {
        metricId: "website_health",
        yourValue: client.scoreBreakdown.connectors,
        cohortAverage: averages.connectors,
        topDecile: top.connectors,
        sorted: connectors,
      },
    ];

    const comparisons: BenchmarkComparison[] = metrics.map((m) => ({
      organisationId: client.organisationId,
      cohortLabel,
      metricId: m.metricId,
      yourValue: m.yourValue,
      cohortAverage: m.cohortAverage,
      topDecile: m.topDecile,
      percentile: percentileRank(m.sorted, m.yourValue),
    }));

    return {
      organisationId: client.organisationId,
      organisationName: client.organisationName,
      organisationSlug: client.organisationSlug,
      successScore: client.successScore,
      rank: client.rank,
      percentile: percentileRank(successScores, client.successScore),
      cohortLabel,
      comparisons,
    };
  });

  return {
    generatedAt: now.toISOString(),
    cohortLabel,
    cohortSize: clients.length,
    averages,
    topDecile: top,
    orgs,
  };
}
