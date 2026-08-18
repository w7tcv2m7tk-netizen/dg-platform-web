/**
 * Organisation Goals — targets the Twin, Advisor, and Overview rank against.
 * Stored on organisation.settings.goals (same JSON pattern as Business Profile).
 */

import type { DigitalTwinSnapshot } from "../twin/types";
import { enquiryInboxHref } from "../leads/inbox-href";

export const GOAL_METRICS = [
  "contacts",
  "active_leads",
  "open_opportunities",
  "consultations",
  "new_enquiries_week",
  "revenue_mtd_cents",
  "business_health",
  "website_health",
  "seo",
  "ai_visibility",
  "custom",
] as const;

export type GoalMetric = (typeof GOAL_METRICS)[number];

export const GOAL_HORIZONS = ["month", "quarter", "year", "ongoing"] as const;
export type GoalHorizon = (typeof GOAL_HORIZONS)[number];

export const GOAL_STATUSES = ["active", "paused", "achieved", "dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface OrganisationGoal {
  id: string;
  title: string;
  description?: string;
  metric: GoalMetric;
  target: number;
  /** Manual current value — used for custom metrics. */
  current?: number;
  horizon: GoalHorizon;
  dueAt?: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export type OrganisationGoalDraft = {
  title: string;
  description?: string;
  metric: GoalMetric;
  target: number;
  current?: number;
  horizon: GoalHorizon;
  dueAt?: string;
  status?: GoalStatus;
};

export type OrganisationGoalPatch = Partial<OrganisationGoalDraft>;

export interface GoalProgress {
  goal: OrganisationGoal;
  current: number;
  percent: number;
  remaining: number;
  href?: string;
  currentLabel: string;
  targetLabel: string;
  onTrack: boolean;
}

export interface SuggestedGoal {
  title: string;
  description?: string;
  metric: GoalMetric;
  target: number;
  horizon: GoalHorizon;
  reason: string;
}

type OrgSettings = {
  goals?: unknown;
  [key: string]: unknown;
};

const MAX_GOALS = 20;

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  contacts: "CRM contacts",
  active_leads: "Active enquiries",
  open_opportunities: "Open opportunities",
  consultations: "Platform consultations",
  new_enquiries_week: "New enquiries this week",
  revenue_mtd_cents: "Revenue this month",
  business_health: "Business Health",
  website_health: "Website health",
  seo: "SEO score",
  ai_visibility: "AI Visibility",
  custom: "Custom target",
};

export const GOAL_HORIZON_LABELS: Record<GoalHorizon, string> = {
  month: "This month",
  quarter: "This quarter",
  year: "This year",
  ongoing: "Ongoing",
};

function isGoalMetric(value: unknown): value is GoalMetric {
  return typeof value === "string" && (GOAL_METRICS as readonly string[]).includes(value);
}

function isGoalHorizon(value: unknown): value is GoalHorizon {
  return typeof value === "string" && (GOAL_HORIZONS as readonly string[]).includes(value);
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === "string" && (GOAL_STATUSES as readonly string[]).includes(value);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseGoal(value: unknown): OrganisationGoal | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !raw.id.trim()) return null;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  if (!isGoalMetric(raw.metric) || !isGoalHorizon(raw.horizon) || !isGoalStatus(raw.status)) {
    return null;
  }
  const target = finiteNumber(raw.target);
  if (target == null || target <= 0) return null;
  const current = finiteNumber(raw.current);
  return {
    id: raw.id.trim(),
    title: raw.title.trim().slice(0, 120),
    description:
      typeof raw.description === "string" && raw.description.trim()
        ? raw.description.trim().slice(0, 400)
        : undefined,
    metric: raw.metric,
    target,
    current: current != null && current >= 0 ? current : undefined,
    horizon: raw.horizon,
    dueAt:
      typeof raw.dueAt === "string" && raw.dueAt.trim() ? raw.dueAt.trim() : undefined,
    status: raw.status,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

export function normaliseOrganisationGoals(value: unknown): OrganisationGoal[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const goals: OrganisationGoal[] = [];
  for (const item of value) {
    const goal = parseGoal(item);
    if (!goal || seen.has(goal.id)) continue;
    seen.add(goal.id);
    goals.push(goal);
    if (goals.length >= MAX_GOALS) break;
  }
  return goals;
}

function moneyLabel(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatMetricValue(metric: GoalMetric, value: number, currency = "AUD"): string {
  if (metric === "revenue_mtd_cents") return moneyLabel(value, currency);
  if (
    metric === "business_health" ||
    metric === "website_health" ||
    metric === "seo" ||
    metric === "ai_visibility"
  ) {
    return `${Math.round(value)}/100`;
  }
  return String(Math.round(value));
}

export function metricHref(metric: GoalMetric, enabledAppIds: readonly string[] = []): string {
  switch (metric) {
    case "contacts":
      return "/apps/crm/contacts";
    case "active_leads":
    case "new_enquiries_week":
      return enquiryInboxHref(enabledAppIds);
    case "open_opportunities":
      return "/apps/crm/opportunities";
    case "consultations":
      return "/apps/crm/consultations";
    case "revenue_mtd_cents":
      return "/apps/commerce";
    case "business_health":
      return "/dashboard/health";
    case "website_health":
      return "/apps/websites/health";
    case "seo":
      return "/apps/seo";
    case "ai_visibility":
      return "/apps/ai-visibility";
    default:
      return "/dashboard/goals";
  }
}

export function currentValueForMetric(
  metric: GoalMetric,
  snapshot: DigitalTwinSnapshot | null | undefined,
  fallback?: number,
): number {
  if (!snapshot) return fallback ?? 0;
  const metrics = snapshot.metrics;
  const scores = snapshot.scores;
  switch (metric) {
    case "contacts":
      return metrics.contactCount ?? 0;
    case "active_leads":
      return metrics.activeLeads ?? 0;
    case "open_opportunities":
      return metrics.openOpportunities ?? 0;
    case "consultations":
      return metrics.consultations ?? 0;
    case "new_enquiries_week":
      return metrics.newEnquiriesThisWeek ?? 0;
    case "revenue_mtd_cents":
      return metrics.revenueMtdCents ?? 0;
    case "business_health":
      return scores.businessHealth ?? scores.businessGrowth ?? 0;
    case "website_health":
      return scores.websiteHealth ?? 0;
    case "seo":
      return scores.seo ?? 0;
    case "ai_visibility":
      return scores.aiVisibility ?? 0;
    case "custom":
      return fallback ?? 0;
    default:
      return fallback ?? 0;
  }
}

export function evaluateGoalProgress(
  goal: OrganisationGoal,
  snapshot: DigitalTwinSnapshot | null | undefined,
  enabledAppIds: readonly string[] = [],
  currency = "AUD",
): GoalProgress {
  const current = currentValueForMetric(goal.metric, snapshot, goal.current);
  const percent =
    goal.target > 0 ? Math.max(0, Math.min(100, Math.round((current / goal.target) * 100))) : 0;
  const remaining = Math.max(0, goal.target - current);
  return {
    goal,
    current,
    percent,
    remaining,
    href: metricHref(goal.metric, enabledAppIds),
    currentLabel: formatMetricValue(goal.metric, current, currency),
    targetLabel: formatMetricValue(goal.metric, goal.target, currency),
    onTrack: percent >= 70 || goal.status === "achieved",
  };
}

export function evaluateOrganisationGoals(
  goals: OrganisationGoal[],
  snapshot: DigitalTwinSnapshot | null | undefined,
  enabledAppIds: readonly string[] = [],
  currency = "AUD",
): GoalProgress[] {
  return goals.map((goal) =>
    evaluateGoalProgress(goal, snapshot, enabledAppIds, currency),
  );
}

export function suggestedOrganisationGoals(
  enabledAppIds: readonly string[],
  existing: OrganisationGoal[],
): SuggestedGoal[] {
  const used = new Set(
    existing.filter((goal) => goal.status === "active").map((goal) => goal.metric),
  );
  const suggestions: SuggestedGoal[] = [];
  const push = (suggestion: SuggestedGoal) => {
    if (used.has(suggestion.metric) || suggestion.metric === "custom") return;
    if (suggestions.some((item) => item.metric === suggestion.metric)) return;
    suggestions.push(suggestion);
  };

  push({
    title: "Grow the CRM to 50 contacts",
    description: "A usable Twin starts with people, not empty records.",
    metric: "contacts",
    target: 50,
    horizon: "quarter",
    reason: "Contacts are the foundation Advisor and follow-up use.",
  });
  push({
    title: "Lift Business Health to 80",
    description: "Give Overview and Advisor a clear operating target.",
    metric: "business_health",
    target: 80,
    horizon: "quarter",
    reason: "Health is the number the Twin already computes every day.",
  });

  if (enabledAppIds.includes("crm")) {
    push({
      title: "Convert 8 open opportunities",
      metric: "open_opportunities",
      target: 8,
      horizon: "month",
      reason: "Platform enquiries and consultations already land in CRM.",
    });
    push({
      title: "Hold 4 Platform Consultations",
      metric: "consultations",
      target: 4,
      horizon: "month",
      reason: "Consultations are the founding sales motion.",
    });
    push({
      title: "Take 10 new enquiries this week",
      metric: "new_enquiries_week",
      target: 10,
      horizon: "month",
      reason: "Weekly enquiry flow is the leading indicator for pipeline.",
    });
  }

  if (enabledAppIds.includes("websites") || enabledAppIds.includes("website")) {
    push({
      title: "Website health at 85+",
      metric: "website_health",
      target: 85,
      horizon: "quarter",
      reason: "Website score feeds Twin, SEO, and AI Visibility.",
    });
  }

  if (enabledAppIds.includes("seo")) {
    push({
      title: "SEO score at 80+",
      metric: "seo",
      target: 80,
      horizon: "quarter",
      reason: "Search health is already on the Twin.",
    });
  }

  if (enabledAppIds.includes("ai-visibility")) {
    push({
      title: "AI Visibility at 70+",
      metric: "ai_visibility",
      target: 70,
      horizon: "quarter",
      reason: "Visibility is a founding differentiator on the Twin.",
    });
  }

  if (enabledAppIds.includes("commerce")) {
    push({
      title: "Revenue this month",
      metric: "revenue_mtd_cents",
      target: 1_000_000,
      horizon: "month",
      reason: "Commerce already reports month-to-date on the Twin.",
    });
  }

  return suggestions.slice(0, 6);
}

function sortGoals(goals: OrganisationGoal[]): OrganisationGoal[] {
  const rank: Record<GoalStatus, number> = {
    active: 0,
    paused: 1,
    achieved: 2,
    dropped: 3,
  };
  return [...goals].sort((a, b) => {
    const status = rank[a.status] - rank[b.status];
    if (status !== 0) return status;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

async function readSettings(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  return {
    prisma,
    settings: ((org?.settings as OrgSettings | null) ?? {}) as OrgSettings,
  };
}

export async function getOrganisationGoals(
  organisationId: string,
): Promise<OrganisationGoal[]> {
  if (!process.env.DATABASE_URL) return [];
  const { settings } = await readSettings(organisationId);
  return sortGoals(normaliseOrganisationGoals(settings.goals));
}

async function writeGoals(organisationId: string, goals: OrganisationGoal[]) {
  const { prisma, settings } = await readSettings(organisationId);
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const next = sortGoals(goals).slice(0, MAX_GOALS);
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        goals: next,
      } as unknown as InputJsonValue,
    },
  });
  return next;
}

function sanitiseDraft(draft: OrganisationGoalDraft): OrganisationGoalDraft | { error: string } {
  const title = draft.title?.trim().slice(0, 120) ?? "";
  if (title.length < 2) return { error: "Title is required" };
  if (!isGoalMetric(draft.metric)) return { error: "Choose a metric" };
  if (!isGoalHorizon(draft.horizon)) return { error: "Choose a horizon" };
  const target = finiteNumber(draft.target);
  if (target == null || target <= 0) return { error: "Target must be greater than zero" };
  const current = finiteNumber(draft.current);
  const dueAt = draft.dueAt?.trim() || undefined;
  if (dueAt && Number.isNaN(Date.parse(dueAt))) return { error: "Due date is invalid" };
  const status = draft.status && isGoalStatus(draft.status) ? draft.status : "active";
  return {
    title,
    description: draft.description?.trim().slice(0, 400) || undefined,
    metric: draft.metric,
    target,
    current: current != null && current >= 0 ? current : undefined,
    horizon: draft.horizon,
    dueAt,
    status,
  };
}

export async function createOrganisationGoal(
  organisationId: string,
  draft: OrganisationGoalDraft,
): Promise<{ goals: OrganisationGoal[]; goal: OrganisationGoal } | { error: string }> {
  const clean = sanitiseDraft(draft);
  if ("error" in clean) return clean;
  const existing = await getOrganisationGoals(organisationId);
  if (existing.length >= MAX_GOALS) {
    return { error: `You can track up to ${MAX_GOALS} goals` };
  }
  const now = new Date().toISOString();
  const goal: OrganisationGoal = {
    id: crypto.randomUUID(),
    title: clean.title,
    description: clean.description,
    metric: clean.metric,
    target: clean.target,
    current: clean.current,
    horizon: clean.horizon,
    dueAt: clean.dueAt,
    status: clean.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  const goals = await writeGoals(organisationId, [...existing, goal]);
  return { goals, goal };
}

export async function updateOrganisationGoal(
  organisationId: string,
  goalId: string,
  patch: OrganisationGoalPatch,
): Promise<{ goals: OrganisationGoal[]; goal: OrganisationGoal } | { error: string }> {
  const existing = await getOrganisationGoals(organisationId);
  const current = existing.find((item) => item.id === goalId);
  if (!current) return { error: "Goal not found" };
  const merged: OrganisationGoalDraft = {
    title: patch.title ?? current.title,
    description: patch.description ?? current.description,
    metric: patch.metric ?? current.metric,
    target: patch.target ?? current.target,
    current: patch.current ?? current.current,
    horizon: patch.horizon ?? current.horizon,
    dueAt: patch.dueAt ?? current.dueAt,
    status: patch.status ?? current.status,
  };
  const clean = sanitiseDraft(merged);
  if ("error" in clean) return clean;
  const goal: OrganisationGoal = {
    ...current,
    ...clean,
    status: clean.status ?? current.status,
    updatedAt: new Date().toISOString(),
  };
  const goals = await writeGoals(
    organisationId,
    existing.map((item) => (item.id === goalId ? goal : item)),
  );
  return { goals, goal };
}

export async function deleteOrganisationGoal(
  organisationId: string,
  goalId: string,
): Promise<{ goals: OrganisationGoal[] } | { error: string }> {
  const existing = await getOrganisationGoals(organisationId);
  if (!existing.some((item) => item.id === goalId)) return { error: "Goal not found" };
  const goals = await writeGoals(
    organisationId,
    existing.filter((item) => item.id !== goalId),
  );
  return { goals };
}
