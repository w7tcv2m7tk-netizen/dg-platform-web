import type { BusinessBrainSnapshot } from "../brain/types";
import type { BusinessBenchmarksBundle } from "../benchmarks/types";
import type { BusinessHealthBundle } from "../business-health/types";
import type { GeneratedIntelligence } from "../intelligence/generate-intelligence";
import type { OverviewLiveMetrics } from "../overview/gather-live-metrics";
import type { OrgScoresResult } from "../scoring/calculate-scores";
import { getScoreValue } from "../scoring/calculate-scores";
import { greetingForName } from "../time/display";
import type {
  AdvisorActionCategory,
  AdvisorActionPriority,
  AdvisorContextOption,
  AdvisorQuestionAnswer,
  AdvisorQuestionId,
  AdvisorRecommendation,
  BusinessAdvisorBundle,
} from "./types";

export type BuildAdvisorBriefingInput = {
  userDisplayName: string;
  organisationName: string;
  enabledAppIds: string[];
  metrics?: OverviewLiveMetrics | null;
  scores?: OrgScoresResult | null;
  intelligence?: GeneratedIntelligence | null;
  brain?: BusinessBrainSnapshot | null;
  health?: BusinessHealthBundle | null;
  benchmarks?: BusinessBenchmarksBundle | null;
};

const SUGGESTED_QUESTIONS: BusinessAdvisorBundle["suggestedQuestions"] = [
  { id: "focus_this_week", label: "What should I focus on today?" },
  { id: "leads_dropped", label: "Why have my leads dropped this month?" },
  { id: "losing_opportunities", label: "Where are my biggest opportunities?" },
  { id: "business_health", label: "How can I improve my Business Health?" },
  { id: "automate", label: "What should I automate next?" },
  { id: "owner_summary", label: "Give me a summary of this business for the owner." },
];

const ASK_EXAMPLES = [
  "Why have my leads dropped this month?",
  "What should I focus on today?",
  "Where are my biggest opportunities?",
  "How can I improve my Business Health?",
  "What should I automate next?",
  "Give me a summary of this business for the owner.",
];

function priorityLevel(n: number): AdvisorActionPriority {
  if (n <= 1) return "high";
  if (n <= 2) return "medium";
  return "low";
}

function formatAud(cents: number) {
  if (cents <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/** Context chips based on apps the organisation actually has. */
export function buildAdvisorContexts(enabledAppIds: string[]): AdvisorContextOption[] {
  const enabled = new Set(enabledAppIds);
  const contexts: AdvisorContextOption[] = [
    { id: "entire_business", label: "Entire Business" },
  ];

  if (enabled.has("crm") || enabled.has("real-estate") || enabled.has("accommodation")) {
    contexts.push({ id: "sales", label: "Sales" });
    contexts.push({ id: "customers", label: "Customers" });
    contexts.push({ id: "contact", label: "Specific Contact" });
    contexts.push({ id: "opportunity", label: "Specific Opportunity" });
  }
  if (
    enabled.has("marketing") ||
    enabled.has("social") ||
    enabled.has("ai-visibility") ||
    enabled.has("seo")
  ) {
    contexts.push({ id: "marketing", label: "Marketing" });
  }
  if (enabled.has("websites") || enabled.has("infrastructure")) {
    contexts.push({ id: "website", label: "Website" });
  }
  if (enabled.has("seo")) {
    contexts.push({ id: "seo", label: "SEO" });
  }
  if (enabled.has("ai-visibility")) {
    contexts.push({ id: "ai_visibility", label: "AI Visibility" });
  }
  if (enabled.has("reviews")) {
    contexts.push({ id: "reputation", label: "Reputation" });
  }
  contexts.push({ id: "operations", label: "Operations" });
  if (enabled.has("commerce")) {
    contexts.push({ id: "finance", label: "Finance" });
  }
  if (enabled.has("automation") || enabled.has("ai-communications")) {
    contexts.push({ id: "automation", label: "Automation" });
  }

  return contexts;
}

function rec(input: {
  id: string;
  priority: number;
  category: AdvisorActionCategory;
  title: string;
  whatISee: string;
  whyItMatters: string;
  whatIRecommend: string;
  whatDigitalGateCanDo: string;
  actionLabel: string;
  href: string;
  toolId?: string;
  toolParams?: AdvisorRecommendation["toolParams"];
  requiresApproval?: boolean;
}): AdvisorRecommendation {
  return {
    ...input,
    priorityLevel: priorityLevel(input.priority),
  };
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
    items.push(
      rec({
        id: "follow-up-backlog",
        priority: priority++,
        category: "Sales",
        title:
          metrics.overdueFollowUps === 1
            ? "Respond to 1 overdue enquiry"
            : `Respond to ${metrics.overdueFollowUps} overdue enquiries`,
        whatISee: risingDemand
          ? `${metrics.overdueFollowUps} follow-up${metrics.overdueFollowUps === 1 ? "" : "s"} overdue while ${metrics.newLeadsThisWeek} new enquir${metrics.newLeadsThisWeek === 1 ? "y arrived" : "ies arrived"} this week.`
          : `${metrics.overdueFollowUps} enquir${metrics.overdueFollowUps === 1 ? "y hasn't" : "ies haven't"} received a recorded follow-up.`,
        whyItMatters: risingDemand
          ? "Enquiry volume is rising while response capacity is falling behind — a real risk of losing qualified opportunities."
          : "Unresolved follow-up usually precedes conversion drop-off.",
        whatIRecommend: "Contact overdue prospects today, then automate first-response for new enquiries.",
        whatDigitalGateCanDo: enabled.includes("ai-communications")
          ? "Create a follow-up task now, then configure an AI Communications agent for first-response."
          : "Create a follow-up task now so the work is tracked — DigitalGate executes the tool after you confirm.",
        actionLabel: "Open Opportunities →",
        href: "/apps/crm/opportunities",
        toolId: "crm.create_follow_up_task",
        requiresApproval: true,
        toolParams: {
          title:
            metrics.overdueFollowUps === 1
              ? "Respond to 1 overdue enquiry"
              : `Respond to ${metrics.overdueFollowUps} overdue enquiries`,
          description:
            "Created from AI Advisor (What should I do today?). Contact overdue prospects, then consider automating first-response.",
          priority: "high",
        },
      }),
    );
  }

  if (health?.predictiveAlerts.length) {
    for (const alert of health.predictiveAlerts.slice(0, 2)) {
      if (items.some((item) => item.href === alert.href)) continue;
      items.push(
        rec({
          id: `health-${alert.id}`,
          priority: priority++,
          category: "Health",
          title: alert.title || "Review Business Health alert",
          whatISee: alert.body,
          whyItMatters: "Business Health flagged this as an emerging risk before it shows up in revenue.",
          whatIRecommend: alert.recommendedAction,
          whatDigitalGateCanDo:
            "Apply the recommended workflow inside DigitalGate using your connected CRM, automation, and communications apps.",
          actionLabel: "View Business Health →",
          href: alert.href,
        }),
      );
    }
  }

  if (benchmarks) {
    const gap = benchmarks.opportunities[0];
    const benchmarkAction = benchmarks.recommendedActions[0];
    if (gap && (gap.percentile ?? 100) < 55) {
      items.push(
        rec({
          id: `benchmark-${gap.id}`,
          priority: priority++,
          category: "Growth",
          title: `Improve ${gap.label}`,
          whatISee: `${gap.label} is at ${gap.yourScore}/100 compared with a ${benchmarks.cohortLabel} median of ${gap.industryAverage}.`,
          whyItMatters:
            "Benchmarks show where similar businesses are outperforming you — closing this gap usually lifts trust, discovery, or conversion.",
          whatIRecommend: benchmarkAction?.title ?? `Improve ${gap.label.toLowerCase()}.`,
          whatDigitalGateCanDo:
            benchmarkAction?.impact ?? "Use the connected DigitalGate apps tied to this benchmark area.",
          actionLabel: benchmarkAction?.actionLabel ?? "Explore gap →",
          href: benchmarkAction?.href ?? "/dashboard/benchmarks",
        }),
      );
    }
  }

  if (scores) {
    const aiVis = getScoreValue(scores.scores, "ai_visibility");
    if (aiVis > 0 && aiVis < 60) {
      items.push(
        rec({
          id: "ai-visibility",
          priority: priority++,
          category: "AI Visibility",
          title: "Improve AI Visibility",
          whatISee: `AI Visibility is ${aiVis}/100 while website and CRM activity show you are operating digitally.`,
          whyItMatters:
            "Answer engines and AI assistants may not surface your business as readily as competitors with stronger structured presence.",
          whatIRecommend: "Improve AI Visibility and ensure your public business profile is complete.",
          whatDigitalGateCanDo:
            "Run AI Visibility analysis and update Business Brain context, GBP, and website signals.",
          actionLabel: "Open AI Visibility →",
          href: "/apps/ai-visibility",
        }),
      );
    }
  }

  if (metrics && metrics.overdueArCents > 0) {
    items.push(
      rec({
        id: "overdue-ar",
        priority: priority++,
        category: "Finance",
        title: "Collect overdue receivables",
        whatISee: `${formatAud(metrics.overdueArCents)} in overdue receivables is outstanding.`,
        whyItMatters:
          "Cash-flow pressure can constrain marketing, hiring, and response capacity before pipeline issues appear.",
        whatIRecommend: "Prioritise collection on overdue invoices and tighten payment follow-up.",
        whatDigitalGateCanDo: "Review overdue invoices in Commerce and trigger payment reminder workflows.",
        actionLabel: "Open Invoices →",
        href: "/apps/commerce/invoices",
      }),
    );
  }

  if (scores && getScoreValue(scores.scores, "automation") < 55 && (metrics?.openTasksDue ?? 0) >= 3) {
    items.push(
      rec({
        id: "automation-gap",
        priority: priority++,
        category: "Automation",
        title: "Review follow-up automation",
        whatISee: `${metrics?.openTasksDue ?? 0} tasks are due and automation adoption is below operating potential.`,
        whyItMatters:
          "DigitalGate detected a potential gap between new opportunities and follow-up activity.",
        whatIRecommend: "Automate first-response, reminders, and hand-offs before growth stalls.",
        whatDigitalGateCanDo:
          "Create automation workflows for lead response, task reminders, and CRM updates.",
        actionLabel: "Review Automation →",
        href: "/apps/automation",
      }),
    );
  }

  if (health && health.overallScore != null && health.overallScore < 75) {
    const weakest = [...health.dimensions]
      .filter((d) => d.score != null)
      .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0];
    if (weakest && !items.some((i) => i.id.startsWith("health-"))) {
      items.push(
        rec({
          id: "review-health",
          priority: priority++,
          category: "Health",
          title: "Review Business Health",
          whatISee: `Business Health is ${health.overallScore}/100.${weakest.label ? ` ${weakest.label} is the weakest component.` : ""}`,
          whyItMatters: "Weak health components compound into slower growth and missed opportunities.",
          whatIRecommend: weakest
            ? `Focus on improving ${weakest.label.toLowerCase()} this week.`
            : "Review the weakest Business Health components.",
          whatDigitalGateCanDo: "Open Business Health for the synthesised view and next steps.",
          actionLabel: "View Business Health →",
          href: "/dashboard/health",
        }),
      );
    }
  }

  if ((input.brain?.percent ?? 0) < 65) {
    items.push(
      rec({
        id: "brain-gap",
        priority: priority++,
        category: "Platform",
        title: "Strengthen Business Brain context",
        whatISee: `Business Brain completeness is ${input.brain?.percent ?? 0}% — DigitalGate still has material gaps in business context.`,
        whyItMatters:
          "Advisor can only reason from what the Brain knows. Missing context weakens every recommendation.",
        whatIRecommend:
          "Complete the highest-value Business Brain fields first: services, audience, goals, and connectors.",
        whatDigitalGateCanDo:
          "Fill Business Brain dimensions so Advisor and AI agents can act with full business context.",
        actionLabel: "Explore Business Brain →",
        href: "/dashboard/brain",
      }),
    );
  }

  if (items.length === 0 && input.intelligence) {
    for (const action of input.intelligence.recommendedActions.slice(0, 2)) {
      items.push(
        rec({
          id: action.id,
          priority: priority++,
          category: "Operations",
          title: action.label,
          whatISee: input.intelligence.dailyBriefing,
          whyItMatters: action.impact,
          whatIRecommend: action.label,
          whatDigitalGateCanDo: "Execute this directly from the connected DigitalGate app.",
          actionLabel: action.buttonLabel ?? "Take action →",
          href: action.href ?? "/dashboard",
        }),
      );
    }
  }

  if (items.length === 0) {
    items.push(
      rec({
        id: "connect",
        priority: 1,
        category: "Platform",
        title: "Connect core business systems",
        whatISee: "Core business systems are not fully connected yet.",
        whyItMatters:
          "Advisor needs live CRM, website, and finance signals to reason about your business accurately.",
        whatIRecommend: "Connect your website, CRM, and review sources first.",
        whatDigitalGateCanDo: "Run connector setup and sync live business data into the Business Brain.",
        actionLabel: "Connect systems →",
        href: "/dashboard/settings/connectors",
      }),
    );
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
  const org = input.organisationName;

  switch (id) {
    case "today":
      return {
        id,
        question: "What should I know about my business today?",
        summary:
          intelligence?.dailyBriefing ??
          `${greetingForName(firstName)}. Connect your business systems so Advisor can reason from live signals.`,
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
    case "focus_this_week":
      return {
        id,
        question: "What should I focus on today?",
        summary:
          intelligence?.priorities.map((p) => p.text).join(" ") ||
          "Focus on connecting live data first, then clear any overdue follow-ups and benchmark gaps.",
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
    case "leads_dropped":
      return {
        id,
        question: "Why have my leads dropped this month?",
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
        question: "Where are my biggest opportunities?",
        summary:
          metrics && metrics.overdueFollowUps > 0
            ? `The clearest opportunity is follow-up: ${metrics.overdueFollowUps} overdue response${metrics.overdueFollowUps === 1 ? "" : "s"} in CRM.`
            : health?.attention.length
              ? `Attention areas today: ${health.attention.join(", ")}.`
              : "No major opportunity leaks detected in connected data right now.",
        recommendations: withFallback(
          recommendations.filter((r) =>
            ["follow-up", "health-", "overdue", "benchmark"].some((token) => r.id.includes(token)),
          ),
          recommendations,
        ),
      };
    case "business_health":
      return {
        id,
        question: "How can I improve my Business Health?",
        summary:
          health?.overallScore != null
            ? `Business Health is ${health.overallScore}/100. Focus on the weakest components and clear high-priority recommended actions first.`
            : "Connect more business signals so Business Health can synthesise a reliable score.",
        recommendations: withFallback(
          recommendations.filter(
            (r) => r.category === "Health" || r.id.includes("health") || r.id.includes("brain"),
          ),
          recommendations,
        ),
      };
    case "automate":
      return {
        id,
        question: "What should I automate next?",
        summary:
          benchmarks?.operationalInsight ??
          "Start with first-response, follow-up reminders, and repetitive admin tasks tied to CRM enquiries.",
        recommendations: withFallback(
          recommendations.filter(
            (r) => r.category === "Automation" || r.id.includes("automation") || r.id.includes("follow-up"),
          ),
          recommendations,
        ),
      };
    case "owner_summary":
      return {
        id,
        question: "Give me a summary of this business for the owner.",
        summary: [
          `${org} — Advisor briefing.`,
          health?.overallScore != null ? `Business Health ${health.overallScore}/100.` : null,
          input.brain ? `Business Brain ${input.brain.percent}% complete.` : null,
          metrics
            ? `${metrics.newLeadsThisWeek} new leads this week · ${metrics.openOpportunityCount} open opportunities.`
            : "Connect CRM and finance for a fuller owner summary.",
          recommendations[0] ? `Top priority: ${recommendations[0].title}.` : null,
        ]
          .filter(Boolean)
          .join(" "),
        recommendations: withFallback(recommendations.slice(0, 3), recommendations, 3),
      };
    case "compare":
      return {
        id,
        question: "How does my business compare with others?",
        summary: benchmarks
          ? `Your Benchmark Score is ${benchmarks.benchmarkScore ?? "—"}/100 — better than ${benchmarks.overallPercentile ?? "—"}% of ${benchmarks.cohortLabel}. Strongest: ${benchmarks.strongest.map((s) => s.label).join(", ") || "connect more data"}. Biggest gap: ${benchmarks.opportunities[0]?.label ?? "none flagged"}.`
          : "Open Benchmarks after connecting live scores to compare against similar businesses.",
        recommendations: withFallback(
          benchmarks?.recommendedActions.slice(0, 2).map((action, index) =>
            rec({
              id: `compare-action-${index}`,
              priority: index + 1,
              category: "Growth",
              title: action.title,
              whatISee: action.gap,
              whyItMatters: action.impact,
              whatIRecommend: action.title,
              whatDigitalGateCanDo: action.actionLabel,
              actionLabel: action.actionLabel,
              href: action.href,
            }),
          ) ?? [],
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
    organisationName: input.organisationName,
    brainCompleteness: input.brain?.percent ?? 0,
    businessHealth: input.health?.overallScore ?? input.scores?.businessHealth ?? null,
    benchmarkScore: input.benchmarks?.benchmarkScore ?? null,
    benchmarkPercentile: input.benchmarks?.overallPercentile ?? null,
    todaySummary: today.summary,
    topRecommendations: recommendations,
    suggestedQuestions: SUGGESTED_QUESTIONS,
    askExamples: ASK_EXAMPLES,
    availableContexts: buildAdvisorContexts(input.enabledAppIds),
    questionAnswers,
  };
}
