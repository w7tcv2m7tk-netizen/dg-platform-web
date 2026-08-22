import type { BusinessBrainSnapshot } from "../brain/types";
import type { BusinessBenchmarksBundle } from "../benchmarks/types";
import type { BusinessHealthBundle } from "../business-health/types";
import type { GeneratedIntelligence } from "../intelligence/generate-intelligence";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import type {
  AdvisorQuestionAnswer,
  AdvisorQuestionId,
  AdvisorRecommendation,
  BusinessAdvisorBundle,
} from "./types";

export type BuildAdvisorBriefingInput = {
  userDisplayName: string;
  enabledAppIds: string[];
  metrics?: OverviewLiveMetrics | null;
  scores?: OrgScoresResult | null;
  intelligence?: GeneratedIntelligence | null;
  brain?: BusinessBrainSnapshot | null;
  health?: BusinessHealthBundle | null;
  benchmarks?: BusinessBenchmarksBundle | null;
};

const SUGGESTED_QUESTIONS: BusinessAdvisorBundle["suggestedQuestions"] = [
  { id: "focus_this_week", label: "What should I focus on this week?" },
  { id: "leads_dropped", label: "Why have my leads dropped?" },
  { id: "losing_opportunities", label: "Where am I losing opportunities?" },
  { id: "automate", label: "What should I automate?" },
  { id: "compare", label: "How does my business compare with others?" },
  { id: "revenue_impact", label: "What would have the biggest impact on revenue?" },
];

function formatAud(cents: number) {
  if (cents <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function buildRecommendations(input: BuildAdvisorBriefingInput): AdvisorRecommendation[] {
  const items: AdvisorRecommendation[] = [];
  const metrics = input.metrics;
  const scores = input.scores;
  const health = input.health;
  const benchmarks = input.benchmarks;
  const enabled = input.enabledAppIds;
  let priority = 1;

  if (metrics && metrics.overdueFollowUps > 0) {
    const risingDemand = metrics.newLeadsThisWeek > 0;
    items.push({
      id: "follow-up-backlog",
      priority: priority++,
      whatISee: risingDemand
        ? `${metrics.overdueFollowUps} follow-up${metrics.overdueFollowUps === 1 ? "" : "s"} overdue while ${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y arrived" : "ies arrived"} this week.`
        : `${metrics.overdueFollowUps} enquir${metrics.overdueFollowUps === 1 ? "y is" : "ies are"} overdue for response or follow-up.`,
      whyItMatters: risingDemand
        ? "Enquiry volume is increasing while response capacity is falling behind, which creates a real risk of losing otherwise qualified opportunities."
        : "Unresolved follow-up usually precedes conversion drop-off — prospects move on when response slows.",
      whatIRecommend: "Automate first-response and qualification for new enquiries, then clear the overdue queue.",
      whatDigitalGateCanDo: enabled.includes("ai-communications")
        ? "Configure an AI Communications agent and create the required follow-up workflow."
        : "Enable AI Communications and wire automated first-response plus CRM follow-up tasks.",
      actionLabel: "Take action →",
      href: enabled.includes("ai-communications") ? "/apps/ai-communications" : "/apps/crm/leads",
    });
  }

  if (health?.predictiveAlerts.length) {
    for (const alert of health.predictiveAlerts.slice(0, 2)) {
      if (items.some((item) => item.href === alert.href)) continue;
      items.push({
        id: `health-${alert.id}`,
        priority: priority++,
        whatISee: alert.body,
        whyItMatters: "Business Health flagged this as an emerging risk before it shows up in revenue.",
        whatIRecommend: alert.recommendedAction,
        whatDigitalGateCanDo: "Apply the recommended workflow inside DigitalGate using your connected CRM, automation, and communications apps.",
        actionLabel: "Take action →",
        href: alert.href,
      });
    }
  }

  if (benchmarks) {
    const gap = benchmarks.opportunities[0];
    const benchmarkAction = benchmarks.recommendedActions[0];
    if (gap && (gap.percentile ?? 100) < 55) {
      items.push({
        id: `benchmark-${gap.id}`,
        priority: priority++,
        whatISee: `${gap.label} is at ${gap.yourScore}/100 compared with a ${benchmarks.cohortLabel} median of ${gap.industryAverage}.`,
        whyItMatters: "Benchmarks show where similar businesses are outperforming you — closing this gap usually lifts trust, discovery, or conversion.",
        whatIRecommend: benchmarkAction?.title ?? `Improve ${gap.label.toLowerCase()}.`,
        whatDigitalGateCanDo: benchmarkAction?.impact ?? "Use the connected DigitalGate apps tied to this benchmark area.",
        actionLabel: benchmarkAction?.actionLabel ?? "Explore gap →",
        href: benchmarkAction?.href ?? "/dashboard/benchmarks",
      });
    }
  }

  if (scores) {
    const aiVis = getScoreValue(scores.scores, "ai_visibility");
    if (aiVis > 0 && aiVis < 60) {
      items.push({
        id: "ai-visibility",
        priority: priority++,
        whatISee: `AI Visibility is ${aiVis}/100 while website and CRM activity show you are operating digitally.`,
        whyItMatters: "Answer engines and AI assistants may not surface your business as readily as competitors with stronger structured presence.",
        whatIRecommend: "Improve AI Visibility and ensure your public business profile is complete.",
        whatDigitalGateCanDo: "Run AI Visibility analysis and update Business Brain context, GBP, and website signals.",
        actionLabel: "Take action →",
        href: "/apps/ai-visibility",
      });
    }
  }

  if (metrics && metrics.overdueArCents > 0) {
    items.push({
      id: "overdue-ar",
      priority: priority++,
      whatISee: `${formatAud(metrics.overdueArCents)} in overdue receivables is outstanding.`,
      whyItMatters: "Cash-flow pressure can constrain marketing, hiring, and response capacity before pipeline issues appear.",
      whatIRecommend: "Prioritise collection on overdue invoices and tighten payment follow-up.",
      whatDigitalGateCanDo: "Review overdue invoices in Commerce and trigger payment reminder workflows.",
      actionLabel: "Take action →",
      href: "/apps/commerce/invoices",
    });
  }

  if (scores && getScoreValue(scores.scores, "automation") < 55 && (metrics?.openTasksDue ?? 0) >= 3) {
    items.push({
      id: "automation-gap",
      priority: priority++,
      whatISee: `${metrics?.openTasksDue ?? 0} tasks are due and automation adoption is below your operating potential.`,
      whyItMatters: "Manual backlog compounds — similar businesses automate first-response, reminders, and admin before growth stalls.",
      whatIRecommend: "Automate repetitive follow-up, reminders, and hand-offs first.",
      whatDigitalGateCanDo: "Create automation workflows for lead response, task reminders, and CRM updates.",
      actionLabel: "Take action →",
      href: "/apps/automation",
    });
  }

  if ((input.brain?.percent ?? 0) < 65) {
    items.push({
      id: "brain-gap",
      priority: priority++,
      whatISee: `Business Brain completeness is ${input.brain?.percent ?? 0}% — DigitalGate still has material gaps in business context.`,
      whyItMatters: "Advisor, automation, and AI Communications can only reason from what the Brain knows. Missing context weakens every recommendation.",
      whatIRecommend: "Complete the highest-value Business Brain fields first: services, audience, goals, and connectors.",
      whatDigitalGateCanDo: "Fill Business Brain dimensions so Advisor and AI agents can act with full business context.",
      actionLabel: "Explore Business Brain →",
      href: "/dashboard/brain",
    });
  }

  if (items.length === 0 && input.intelligence) {
    for (const action of input.intelligence.recommendedActions.slice(0, 2)) {
      items.push({
        id: action.id,
        priority: priority++,
        whatISee: input.intelligence.dailyBriefing,
        whyItMatters: action.impact,
        whatIRecommend: action.label,
        whatDigitalGateCanDo: "Execute this directly from the connected DigitalGate app.",
        actionLabel: action.buttonLabel ?? "Take action →",
        href: action.href ?? "/dashboard",
      });
    }
  }

  if (items.length === 0) {
    items.push({
      id: "connect",
      priority: 1,
      whatISee: "Core business systems are not fully connected yet.",
      whyItMatters: "Advisor needs live CRM, website, and finance signals to reason about your business accurately.",
      whatIRecommend: "Connect your website, CRM, and review sources first.",
      whatDigitalGateCanDo: "Run connector setup and sync live business data into the Business Brain.",
      actionLabel: "Connect systems →",
      href: "/dashboard/settings/connectors",
    });
  }

  return items.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

function withFallback(
  picked: AdvisorRecommendation[],
  all: AdvisorRecommendation[],
  limit = 2,
): AdvisorRecommendation[] {
  return picked.length ? picked : all.slice(0, limit);
}

function answerForQuestion(
  id: AdvisorQuestionId,
  input: BuildAdvisorBriefingInput,
  recommendations: AdvisorRecommendation[],
): AdvisorQuestionAnswer {
  const metrics = input.metrics;
  const health = input.health;
  const benchmarks = input.benchmarks;
  const intelligence = input.intelligence;
  const firstName = input.userDisplayName.split(" ")[0] || input.userDisplayName;

  switch (id) {
    case "today":
      return {
        id,
        question: "What should I know about my business today?",
        summary:
          intelligence?.dailyBriefing ??
          `Good morning ${firstName}. Connect your business systems so Advisor can reason from live signals.`,
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
    case "focus_this_week":
      return {
        id,
        question: "What should I focus on this week?",
        summary:
          intelligence?.priorities.map((p) => p.text).join(" ") ||
          "Focus on connecting live data first, then clear any overdue follow-ups and benchmark gaps.",
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
    case "leads_dropped":
      return {
        id,
        question: "Why have my leads dropped?",
        summary:
          metrics && metrics.newLeadsThisWeek === 0
            ? "No new enquiries were recorded this week in connected CRM feeds. That may reflect marketing activity, seasonality, or a capture gap — not necessarily lost demand."
            : metrics && metrics.newLeadsThisWeek > 0
              ? `Lead flow is active (${metrics.newLeadsThisWeek} this week). If volume feels lower than usual, compare marketing activity and benchmark lead generation.`
              : "Connect CRM and marketing sources to diagnose lead flow with evidence.",
        recommendations: withFallback(
          recommendations.filter(
            (r) =>
              r.id.includes("follow-up") ||
              r.id.includes("ai-visibility") ||
              r.id.startsWith("benchmark"),
          ),
          recommendations,
        ),
      };
    case "losing_opportunities":
      return {
        id,
        question: "Where am I losing opportunities?",
        summary:
          metrics && metrics.overdueFollowUps > 0
            ? `The clearest leak is follow-up: ${metrics.overdueFollowUps} overdue response${metrics.overdueFollowUps === 1 ? "" : "s"} in CRM.`
            : health?.attention.length
              ? `Attention areas today: ${health.attention.join(", ")}.`
              : "No major opportunity leaks detected in connected data right now.",
        recommendations: withFallback(
          recommendations.filter((r) =>
            ["follow-up", "health-", "overdue"].some((token) => r.id.includes(token)),
          ),
          recommendations,
        ),
      };
    case "automate":
      return {
        id,
        question: "What should I automate?",
        summary:
          health?.operationalInsight ??
          "Start with first-response, follow-up reminders, and repetitive admin tasks tied to CRM enquiries.",
        recommendations: withFallback(
          recommendations.filter(
            (r) => r.id.includes("automation") || r.id.includes("follow-up"),
          ),
          recommendations,
        ),
      };
    case "compare":
      return {
        id,
        question: "How does my business compare with others?",
        summary: benchmarks
          ? `Your Benchmark Score is ${benchmarks.benchmarkScore ?? "—"}/100 — better than ${benchmarks.overallPercentile ?? "—"}% of ${benchmarks.cohortLabel}. Strongest: ${benchmarks.strongest.map((s) => s.label).join(", ") || "connect more data"}. Biggest gap: ${benchmarks.opportunities[0]?.label ?? "none flagged"}.`
          : "Open Benchmarks after connecting live scores to compare against similar businesses.",
        recommendations: withFallback(
          benchmarks?.recommendedActions.slice(0, 2).map((action, index) => ({
            id: `compare-action-${index}`,
            priority: index + 1,
            whatISee: action.gap,
            whyItMatters: action.impact,
            whatIRecommend: action.title,
            whatDigitalGateCanDo: action.actionLabel,
            actionLabel: action.actionLabel,
            href: action.href,
          })) ?? [],
          recommendations,
        ),
      };
    case "revenue_impact":
      return {
        id,
        question: "What would have the biggest impact on revenue?",
        summary:
          metrics && metrics.overdueFollowUps > 0
            ? "Protecting conversion on existing enquiries usually beats adding new traffic when follow-up is overdue."
            : benchmarks?.opportunities[0]
              ? `Closing the ${benchmarks.opportunities[0].label.toLowerCase()} gap is likely your highest leverage move right now.`
              : "Connect finance and CRM data to rank revenue impact with evidence.",
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
    default:
      return {
        id: "today",
        question: "What should I know about my business today?",
        summary: intelligence?.dailyBriefing ?? "Connect live business data to unlock Advisor reasoning.",
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
  }
}

/** Build AI Advisor workspace from Brain, Health, Benchmarks, and live intelligence. */
export function buildAdvisorBriefing(input: BuildAdvisorBriefingInput): BusinessAdvisorBundle {
  const recommendations = buildRecommendations(input);
  const today = answerForQuestion("today", input, recommendations);
  const questionAnswers = [
    today,
    ...SUGGESTED_QUESTIONS.map((q) => answerForQuestion(q.id, input, recommendations)),
  ];

  return {
    generatedAt: new Date().toISOString(),
    scoresLive: Boolean(input.metrics && input.scores),
    userDisplayName: input.userDisplayName,
    brainCompleteness: input.brain?.percent ?? 0,
    businessHealth: input.health?.overallScore ?? input.scores?.businessHealth ?? null,
    benchmarkScore: input.benchmarks?.benchmarkScore ?? null,
    benchmarkPercentile: input.benchmarks?.overallPercentile ?? null,
    todaySummary: today.summary,
    topRecommendations: recommendations,
    suggestedQuestions: SUGGESTED_QUESTIONS,
    questionAnswers,
  };
}
