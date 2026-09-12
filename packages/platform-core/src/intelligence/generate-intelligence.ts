import type { DigitalTwinSnapshot } from "../twin/types";
import type { OverviewConnectorProbes } from "../overview/connector-probes";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import type {
  OverviewInsight,
  OverviewPriority,
  OverviewRecommendedAction,
} from "../overview/types";
import { enquiryInboxHref, hasRealEstateWorkspace } from "../leads/inbox-href";
import { greetingForName } from "../time/display";
import {
  evaluateOrganisationGoals,
  type OrganisationGoal,
} from "../org/goals";

export interface GenerateIntelligenceInput {
  organisationName: string;
  userDisplayName: string;
  enabledAppIds: string[];
  metrics: OverviewLiveMetrics;
  connectors: OverviewConnectorProbes;
  snapshot: DigitalTwinSnapshot;
  scores: OrgScoresResult;
  goals?: OrganisationGoal[];
}

export interface GeneratedIntelligence {
  dailyBriefing: string;
  priorities: OverviewPriority[];
  prioritiesImpact?: string;
  insights: OverviewInsight[];
  recommendedActions: OverviewRecommendedAction[];
}

function formatAud(cents: number) {
  if (cents <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPipeline(value?: number) {
  if (!value || value <= 0) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

/**
 * Deterministic evidence layer for the Business Overview.
 * It describes observed business state only; model reasoning may phrase or explain
 * this evidence elsewhere, but this layer never invents work just to fill a card.
 */
export function generateBusinessIntelligence(
  input: GenerateIntelligenceInput,
): GeneratedIntelligence {
  const { userDisplayName, enabledAppIds, metrics, connectors, snapshot, scores, goals = [] } = input;
  const firstName = userDisplayName.split(" ")[0] || userDisplayName;
  const enquiryHref = enquiryInboxHref(enabledAppIds);
  const reWorkspace = hasRealEstateWorkspace(enabledAppIds);

  const revenueLabel = formatAud(metrics.revenueMtdCents);
  const pipelineLabel = formatPipeline(snapshot.metrics.pipelineValue);
  const websiteScore = connectors.website?.score;

  const briefingParts: string[] = [greetingForName(firstName) + "."];
  if (scores.scoresLive) {
    briefingParts.push(
      `Business Health is ${scores.businessHealth}/100 from ${scores.evidenceCoveragePercent}% weighted evidence (${scores.confidence} confidence).`,
    );
  } else {
    briefingParts.push(
      `Business Health is still collecting measured evidence (${scores.evidenceCoveragePercent}% coverage), so no overall score is being published yet.`,
    );
  }

  if (websiteScore && websiteScore >= 80) {
    briefingParts.push(
      `Your website health score is ${websiteScore}/100${connectors.website?.warn ? ` with ${connectors.website.warn} items to review` : ""}.`,
    );
  }

  if (metrics.newLeadsThisWeek > 0) {
    briefingParts.push(
      `You received ${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y" : "ies"} this week.`,
    );
  }

  if (connectors.reSummary?.bookingsThisMonth) {
    briefingParts.push(
      `${connectors.reSummary.bookingsThisMonth} appraisal booking${connectors.reSummary.bookingsThisMonth === 1 ? "" : "s"} this month.`,
    );
  }

  if (pipelineLabel) {
    briefingParts.push(`Recorded pipeline value is ${pipelineLabel}.`);
  } else if (revenueLabel) {
    briefingParts.push(`Revenue this month is ${revenueLabel}.`);
  }

  if (metrics.overdueFollowUps > 0) {
    briefingParts.push(
      `${metrics.overdueFollowUps} follow-up${metrics.overdueFollowUps === 1 ? " is" : "s are"} overdue.`,
    );
  } else if (metrics.openTasksDue > 0) {
    briefingParts.push(`${metrics.openTasksDue} task${metrics.openTasksDue === 1 ? "" : "s"} due today.`);
  }

  const goalProgress = evaluateOrganisationGoals(
    goals.filter((goal) => goal.status === "active"),
    snapshot,
    enabledAppIds,
  );
  const laggingGoal = goalProgress.find((item) => item.percent < 70);
  if (laggingGoal) {
    briefingParts.push(
      `${laggingGoal.goal.title} is at ${laggingGoal.percent}% of target (${laggingGoal.currentLabel} of ${laggingGoal.targetLabel}).`,
    );
  }

  const priorities: OverviewPriority[] = [];
  let rank = 1;

  if (laggingGoal) {
    priorities.push({
      rank: rank++,
      text: `Move ${laggingGoal.goal.title} — currently ${laggingGoal.currentLabel} of ${laggingGoal.targetLabel}.`,
    });
  }

  if (metrics.overdueFollowUps > 0) {
    priorities.push({
      rank: rank++,
      text: `Follow up ${metrics.overdueFollowUps} overdue lead${metrics.overdueFollowUps === 1 ? "" : "s"}.`,
    });
  }

  if (metrics.newLeadsThisWeek > 0) {
    priorities.push({
      rank: rank++,
      text: `Respond to ${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y" : "ies"} received this week.`,
    });
  }

  if (connectors.website?.fail && connectors.website.fail > 0) {
    priorities.push({
      rank: rank++,
      text: `Fix ${connectors.website.fail} critical website health check${connectors.website.fail === 1 ? "" : "s"}.`,
    });
  } else if (connectors.website?.warn && connectors.website.warn > 0) {
    priorities.push({
      rank: rank++,
      text: `Review ${connectors.website.warn} website recommendation${connectors.website.warn === 1 ? "" : "s"}.`,
    });
  }

  if (reWorkspace && metrics.vendorLeadCount > 0) {
    priorities.push({
      rank: rank++,
      text: `Work ${metrics.vendorLeadCount} vendor lead${metrics.vendorLeadCount === 1 ? "" : "s"} in your pipeline.`,
    });
  }

  if (priorities.length < 3 && metrics.openTasksDue > 0) {
    priorities.push({
      rank: rank++,
      text: `Complete ${metrics.openTasksDue} task${metrics.openTasksDue === 1 ? "" : "s"} due today.`,
    });
  }

  if (priorities.length < 3 && !metrics.hasContacts) {
    priorities.push({
      rank: rank++,
      text: "Add or import CRM contacts so DigitalGate has relationship evidence to analyse.",
    });
  }

  if (priorities.length < 3 && scores.evidenceCoveragePercent < 80) {
    priorities.push({
      rank: rank++,
      text: `Increase Business Health evidence coverage from ${scores.evidenceCoveragePercent}% by connecting or using measured business sources.`,
    });
  }

  // Do not pad the priority list with speculative generic work. Fewer factual
  // priorities are better than three invented recommendations.

  const insights: OverviewInsight[] = [];

  if (metrics.newLeadsThisWeek > 0) {
    insights.push({
      text: `${metrics.newLeadsThisWeek} new lead${metrics.newLeadsThisWeek === 1 ? "" : "s"} this week.`,
      tone: "positive",
    });
  }

  if (websiteScore) {
    insights.push({
      text: `Website health score: ${websiteScore}/100.`,
      tone: websiteScore >= 85 ? "positive" : websiteScore >= 70 ? "neutral" : "warning",
    });
  }

  const aiVis = getScoreValue(scores.scores, "ai_visibility");
  if (scores.scores.some((score) => score.scoreId === "ai_visibility")) {
    insights.push({
      text: `AI Visibility Score: ${aiVis}/100.`,
      tone: aiVis >= 80 ? "positive" : aiVis >= 60 ? "neutral" : "warning",
    });
  }

  if (connectors.reSummary?.vendorPipelineTotal) {
    insights.push({
      text: `${connectors.reSummary.vendorPipelineTotal} vendor leads in pipeline.`,
      tone: "positive",
    });
  }

  if (connectors.accommodation?.occupancyRate != null) {
    insights.push({
      text: `Occupancy at ${connectors.accommodation.occupancyRate}%.`,
      tone: connectors.accommodation.occupancyRate >= 70 ? "positive" : "warning",
    });
  }

  if (metrics.overdueFollowUps > 0) {
    insights.push({
      text: `${metrics.overdueFollowUps} follow-up${metrics.overdueFollowUps === 1 ? "" : "s"} overdue.`,
      tone: "warning",
    });
  } else if (metrics.vendorLeadCount + metrics.buyerLeadCount > 0) {
    insights.push({
      text: "Lead response queue is clear.",
      tone: "positive",
    });
  }

  if (revenueLabel) {
    insights.push({
      text: `Revenue this month: ${revenueLabel}.`,
      tone: "positive",
    });
  }

  if (goalProgress.length) {
    const onTrack = goalProgress.filter((item) => item.percent >= 70).length;
    insights.push({
      text: `${onTrack} of ${goalProgress.length} active goal${goalProgress.length === 1 ? "" : "s"} on track.`,
      tone: laggingGoal ? "warning" : "positive",
    });
  }

  if (insights.length === 0) {
    insights.push({
      text: "There is not enough measured activity yet to produce a factual business insight.",
      tone: "neutral",
    });
  }

  const recommendedActions: OverviewRecommendedAction[] = [];

  if (laggingGoal) {
    recommendedActions.push({
      id: `goal-${laggingGoal.goal.id}`,
      label: `Push toward ${laggingGoal.goal.title}`,
      impact: `${laggingGoal.percent}% of target`,
      href: laggingGoal.href ?? "/dashboard/goals",
      buttonLabel: "Review goal",
    });
  } else if (!goalProgress.length) {
    recommendedActions.push({
      id: "set-goals",
      label: "Set business goals",
      impact: "No active target is currently available to Advisor",
      href: "/dashboard/goals",
      buttonLabel: "Set goals",
    });
  }

  if (metrics.overdueFollowUps > 0) {
    recommendedActions.push({
      id: "overdue-leads",
      label: `Follow up ${metrics.overdueFollowUps} overdue lead${metrics.overdueFollowUps === 1 ? "" : "s"}`,
      impact: `${metrics.overdueFollowUps} overdue follow-up${metrics.overdueFollowUps === 1 ? "" : "s"}`,
      href: enquiryHref,
      buttonLabel: "View leads",
    });
  }

  if (connectors.website?.fail || connectors.website?.warn) {
    recommendedActions.push({
      id: "website-health",
      label: "Review website health checks",
      impact: connectors.website.fail
        ? `${connectors.website.fail} critical issue${connectors.website.fail === 1 ? "" : "s"}`
        : `${connectors.website.warn} recommendation${connectors.website.warn === 1 ? "" : "s"}`,
      href: "/apps/websites/health",
      buttonLabel: "Review",
    });
  }

  if (metrics.newLeadsThisWeek > 0) {
    recommendedActions.push({
      id: "new-leads",
      label: `Respond to ${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y" : "ies"}`,
      impact: `${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y" : "ies"} recorded this week`,
      href: enquiryHref,
      buttonLabel: reWorkspace ? "Open leads" : "Open enquiries",
    });
  }

  if (aiVis > 0 && aiVis < 60) {
    recommendedActions.push({
      id: "ai-vis",
      label: "Review AI Visibility",
      impact: `Measured AI Visibility is ${aiVis}/100`,
      href: "/apps/ai-visibility",
      buttonLabel: "Review",
    });
  }

  if (metrics.overdueArCents > 0) {
    recommendedActions.push({
      id: "overdue-ar",
      label: "Review overdue invoices",
      impact: formatAud(metrics.overdueArCents) ?? "Outstanding receivables",
      href: "/apps/commerce/invoices",
      buttonLabel: "View invoices",
    });
  }

  if (recommendedActions.length === 0 && scores.evidenceCoveragePercent < 80) {
    recommendedActions.push({
      id: "connectors",
      label: "Increase measured business coverage",
      impact: `${scores.evidenceCoveragePercent}% of Business Health evidence currently available`,
      href: "/dashboard/settings/connectors",
      buttonLabel: "Connected Services",
    });
  }

  let prioritiesImpact: string | undefined;
  if (pipelineLabel && metrics.overdueFollowUps > 0) {
    prioritiesImpact = `${pipelineLabel} recorded pipeline · ${metrics.overdueFollowUps} overdue follow-ups`;
  } else if (pipelineLabel) {
    prioritiesImpact = `${pipelineLabel} recorded pipeline value`;
  } else if (metrics.newLeadsThisWeek > 0) {
    prioritiesImpact = `${metrics.newLeadsThisWeek} new opportunit${metrics.newLeadsThisWeek === 1 ? "y" : "ies"} this week`;
  }

  return {
    dailyBriefing: briefingParts.join(" "),
    priorities: priorities.slice(0, 3),
    prioritiesImpact,
    insights: insights.slice(0, 5),
    recommendedActions: recommendedActions.slice(0, 4),
  };
}
