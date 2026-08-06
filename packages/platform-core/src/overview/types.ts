/**
 * Business Overview — CEO dashboard types.
 * Answers: "How is my business performing today, and what should I do next?"
 * @see docs/BUSINESS-OVERVIEW.md
 */

export type OverviewWidgetId =
  | "daily_briefing"
  | "priorities"
  | "business_health"
  | "snapshot"
  | "intelligence"
  | "recommended_actions"
  | "timeline"
  | "performance_trends"
  | "connected_systems"
  | "ai_studio"
  | "growth_opportunities"
  | "recent_reports"
  | "team_activity";

export interface OverviewScoreBreakdown {
  id: string;
  label: string;
  value: number;
  href?: string;
}

export interface OverviewPriority {
  rank: number;
  text: string;
}

export interface OverviewSnapshotKpi {
  id: string;
  label: string;
  value: string;
  href?: string;
}

export interface OverviewInsight {
  text: string;
  tone?: "positive" | "neutral" | "warning";
}

export interface OverviewRecommendedAction {
  id: string;
  label: string;
  impact: string;
  href?: string;
  buttonLabel?: string;
}

export interface OverviewTimelineEntry {
  id: string;
  timeLabel: string;
  title: string;
  href?: string;
}

export interface OverviewConnectedSystem {
  id: string;
  label: string;
  status: "healthy" | "connected" | "online" | "warning" | "offline";
  detail?: string;
}

export interface OverviewGrowthOpportunity {
  id: string;
  label: string;
  status: string;
  impact: string;
  href?: string;
}

export interface OverviewReportLink {
  id: string;
  label: string;
  href?: string;
}

export interface OverviewTeamMember {
  name: string;
  summary: string;
}

export interface OverviewAiPrompt {
  id: string;
  label: string;
  prompt: string;
}

export interface OverviewSetupStep {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  detail?: string;
}

export interface OverviewSetupProgress {
  percent: number;
  completed: number;
  total: number;
  complete: boolean;
  steps: OverviewSetupStep[];
}

export interface BusinessOverview {
  organisationName: string;
  userDisplayName: string;
  greeting: string;
  businessHealth: number;
  businessHealthDelta: number;
  businessHealthDeltaLabel: string;
  lastUpdatedLabel: string;
  scoresLive: boolean;
  dailyBriefing: string;
  priorities: OverviewPriority[];
  prioritiesImpact?: string;
  scoreBreakdown: OverviewScoreBreakdown[];
  snapshot: OverviewSnapshotKpi[];
  insights: OverviewInsight[];
  recommendedActions: OverviewRecommendedAction[];
  timeline: OverviewTimelineEntry[];
  healthTrend: number[];
  connectedSystems: OverviewConnectedSystem[];
  aiPrompts: OverviewAiPrompt[];
  growthOpportunities: OverviewGrowthOpportunity[];
  growthOpportunityCount: number;
  recentReports: OverviewReportLink[];
  teamActivity: OverviewTeamMember[];
  visibleWidgets: OverviewWidgetId[];
  setupIncomplete: boolean;
  setupProgress: OverviewSetupProgress;
}
