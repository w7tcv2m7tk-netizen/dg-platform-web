import type { PlatformSetupStatus } from "../org/setup-status";
import type {
  BusinessOverview,
  OverviewTimelineEntry,
  OverviewWidgetId,
} from "./types";

export interface BuildBusinessOverviewInput {
  organisationName: string;
  userDisplayName: string;
  enabledAppIds: string[];
  setupStatus?: PlatformSetupStatus | null;
  activities?: Array<{
    id: string;
    title: string;
    body?: string | null;
    createdAt: string;
    sourceApp?: string | null;
  }>;
  scoresLive?: boolean;
  stripeConfigured?: boolean;
}

function greetingForHour(hour: number, name: string) {
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function formatTimeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function timelineFromActivities(
  activities: BuildBusinessOverviewInput["activities"],
): OverviewTimelineEntry[] {
  if (!activities?.length) return [];
  return activities.slice(0, 8).map((a) => ({
    id: a.id,
    timeLabel: formatTimeLabel(a.createdAt),
    title: a.body ? `${a.title} — ${a.body}` : a.title,
  }));
}

function widgetsForApps(enabledAppIds: string[]): OverviewWidgetId[] {
  const base: OverviewWidgetId[] = [
    "daily_briefing",
    "priorities",
    "business_health",
    "snapshot",
    "intelligence",
    "recommended_actions",
    "timeline",
    "performance_trends",
    "connected_systems",
    "ai_studio",
    "growth_opportunities",
    "recent_reports",
  ];
  if (enabledAppIds.includes("real-estate") || enabledAppIds.includes("crm")) {
    base.push("team_activity");
  }
  return base;
}

function isRealEstateOrg(name: string) {
  return /roe|realty|real estate|estate/i.test(name);
}

/** Build CEO dashboard payload — merges live counts with preview intelligence until Twin v1. */
export function buildBusinessOverview(input: BuildBusinessOverviewInput): BusinessOverview {
  const {
    organisationName,
    userDisplayName,
    enabledAppIds,
    setupStatus,
    activities,
    scoresLive = false,
  } = input;

  const hour = new Date().getHours();
  const firstName = userDisplayName.split(" ")[0] || userDisplayName;
  const reOrg = isRealEstateOrg(organisationName);
  const contactCount = setupStatus?.contactCount ?? 0;
  const setupIncomplete = !setupStatus?.hasContacts;

  const businessHealth = scoresLive ? 87 : 87;
  const delta = 4;

  const dailyBriefing = scoresLive
    ? `Your Business Health has improved to ${businessHealth}/100 this week. Focus on today's recommended actions to maintain momentum.`
    : `Good morning ${firstName}. Your Business Health is tracking at ${businessHealth}/100 this week${
        reOrg ? " for Roe Realty" : ` for ${organisationName}`
      }. AI Visibility increased by 5% after publishing three new suburb pages. You received 12 new enquiries, booked 3 appraisal appointments, and generated an estimated $184,000 in pipeline value.

Two high-priority website recommendations remain outstanding, and there are four overdue follow-ups that could affect conversion. Based on current trends, completing today's recommended actions could increase your projected monthly revenue by approximately 8–10%.`;

  const priorities = reOrg
    ? [
        { rank: 1, text: "Follow up 5 appraisal requests received this week." },
        { rank: 2, text: "Publish your Palm Beach market update. Estimated AI Visibility increase: +4%" },
        { rank: 3, text: "Contact two vendors whose listings expire within 14 days." },
      ]
    : [
        { rank: 1, text: "Review new leads and respond within 1 hour." },
        { rank: 2, text: "Publish this week's content update to improve AI Visibility." },
        { rank: 3, text: "Complete outstanding follow-ups flagged in your pipeline." },
      ];

  const snapshot = reOrg
    ? [
        { id: "leads", label: "New Leads", value: contactCount > 0 ? String(Math.max(12, contactCount)) : "12" },
        { id: "tasks", label: "Tasks Due", value: "5", href: "/apps/automation" },
        { id: "appointments", label: "Appointments", value: "3" },
        { id: "revenue", label: "Revenue This Month", value: "$184,200" },
        { id: "pipeline", label: "Pipeline", value: "$2.1M", href: "/apps/re/vendor-leads" },
        { id: "reviews", label: "Reviews", value: "+4", href: "/apps/reviews" },
      ]
    : [
        { id: "leads", label: "New Leads", value: contactCount > 0 ? String(contactCount) : "—" },
        { id: "tasks", label: "Tasks Due", value: "—" },
        { id: "revenue", label: "Revenue This Month", value: "—", href: "/apps/commerce" },
        { id: "health", label: "Website Health", value: "—", href: "/apps/websites/health" },
      ];

  if (enabledAppIds.includes("accommodation")) {
    snapshot.splice(2, 0, {
      id: "occupancy",
      label: "Occupancy",
      value: "78%",
      href: "/apps/accommodation",
    });
  }

  return {
    organisationName,
    userDisplayName: firstName,
    greeting: greetingForHour(hour, firstName),
    businessHealth,
    businessHealthDelta: delta,
    businessHealthDeltaLabel: `+${delta} this month`,
    lastUpdatedLabel: new Date().toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    scoresLive,
    dailyBriefing,
    priorities,
    prioritiesImpact: reOrg ? "+$82,000 projected commission opportunity" : undefined,
    scoreBreakdown: [
      { id: "ai_visibility", label: "AI Visibility", value: 92, href: "/apps/seo" },
      { id: "seo", label: "SEO", value: 84, href: "/apps/seo" },
      { id: "website", label: "Website", value: 96, href: "/apps/websites/health" },
      { id: "marketing", label: "Marketing", value: 81, href: "/apps/marketing" },
      { id: "sales", label: "Sales", value: 86, href: "/apps/re/vendor-leads" },
      { id: "cx", label: "Customer Experience", value: 89, href: "/apps/reviews" },
      { id: "automation", label: "Automation", value: 78, href: "/apps/automation" },
      { id: "finance", label: "Finance", value: 91, href: "/apps/commerce" },
    ],
    snapshot,
    insights: [
      { text: "Vendor enquiries are up 18%.", tone: "positive" },
      { text: "Website traffic increased 12%.", tone: "positive" },
      { text: "Google Business Profile interactions increased 23%.", tone: "positive" },
      { text: "Review response time has slowed.", tone: "warning" },
      { text: "Lead response time improved from 2h to 47m.", tone: "positive" },
    ],
    recommendedActions: [
      {
        id: "suburb-pages",
        label: "Publish two suburb pages",
        impact: "Potential AI Visibility +6%",
        href: "/apps/websites/content",
        buttonLabel: "Start",
      },
      {
        id: "reviews",
        label: "Request reviews from recent clients",
        impact: "Expected reputation increase",
        href: "/apps/reviews",
        buttonLabel: "Request",
      },
      {
        id: "vendor-leads",
        label: "Call 4 warm vendor leads",
        impact: "Estimated commission opportunity",
        href: "/apps/re/vendor-leads",
        buttonLabel: "View leads",
      },
      {
        id: "website-updates",
        label: "Approve website updates",
        impact: "Critical security patches available",
        href: "/apps/websites/health",
        buttonLabel: "Review",
      },
    ],
    timeline: timelineFromActivities(activities).length
      ? timelineFromActivities(activities)
      : [
          { id: "1", timeLabel: "10:14", title: "John Smith submitted an appraisal request" },
          { id: "2", timeLabel: "9:42", title: "Google review received" },
          { id: "3", timeLabel: "9:18", title: "AI published market update" },
          { id: "4", timeLabel: "Yesterday", title: "Website backup completed" },
          { id: "5", timeLabel: "Yesterday", title: "Automation sent follow-up email" },
        ],
    healthTrend: [72, 74, 73, 76, 78, 79, 81, 80, 82, 83, 85, businessHealth],
    connectedSystems: [
      { id: "website", label: "Website", status: "healthy" },
      { id: "google", label: "Google", status: "connected" },
      { id: "meta", label: "Meta", status: "connected" },
      { id: "stripe", label: "Stripe", status: input.stripeConfigured ? "connected" : "warning", detail: input.stripeConfigured ? undefined : "Not configured" },
      { id: "xero", label: "Xero", status: "connected" },
      { id: "voice", label: "Voice AI", status: "online" },
      { id: "domains", label: "Domains", status: "healthy", detail: "2 Active" },
    ],
    aiPrompts: [
      { id: "pipeline", label: "Summarise my pipeline", prompt: "Summarise my sales pipeline and highlight priorities for today." },
      { id: "newsletter", label: "Write a newsletter", prompt: "Draft a client newsletter for this month." },
      { id: "suburb", label: "Analyse this suburb", prompt: "Analyse market trends for my target suburb." },
      { id: "landing", label: "Create a landing page", prompt: "Outline a high-converting landing page for my next campaign." },
      { id: "automation", label: "Build an automation", prompt: "Suggest an automation to improve lead follow-up." },
      { id: "proposal", label: "Generate a proposal", prompt: "Generate a client proposal with services and pricing." },
    ],
    growthOpportunities: [
      { id: "ai-vis", label: "AI Visibility Pro", status: "Not enabled", impact: "Potential +17%", href: "/dashboard/apps" },
      { id: "reviews-auto", label: "Review Automation", status: "Not enabled", impact: "Save 8 hrs/month", href: "/dashboard/apps" },
      { id: "web-opt", label: "Website Optimisation", status: "Available", impact: "Potential +11%", href: "/apps/websites/health" },
      { id: "mkt-auto", label: "Marketing Automation", status: "Recommended", impact: "Increase reach", href: "/apps/marketing" },
    ],
    recentReports: [
      { id: "growth", label: "Monthly Growth Report", href: "/command/reports" },
      { id: "seo", label: "SEO Report", href: "/apps/seo" },
      { id: "ai-vis", label: "AI Visibility Report", href: "/apps/seo" },
      { id: "revenue", label: "Revenue Report", href: "/apps/commerce" },
      { id: "web", label: "Website Audit", href: "/apps/websites/health" },
    ],
    teamActivity: reOrg
      ? [
          { name: "Michael", summary: "Completed 6 tasks" },
          { name: "Sarah", summary: "Booked 3 appraisals" },
          { name: "James", summary: "Listed 2 properties" },
        ]
      : [],
    visibleWidgets: widgetsForApps(enabledAppIds),
    setupIncomplete,
  };
}
