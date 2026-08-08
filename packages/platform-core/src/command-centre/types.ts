/**
 * DigitalGate Command Centre — platform-wide intelligence types.
 * Internal-only. Aggregates tenant Digital Twins into DG operational views.
 * @see docs/COMMAND-CENTRE.md
 */

import type { RecommendedAction } from "../intelligence/types";
import type { ScoreId } from "../scoring/types";

/** Morning dashboard — all tenants aggregated */
export interface PlatformOverview {
  organisations: number;
  users: number;
  leads: number;
  aiActionsToday: number;
  automationsExecutedToday: number;
  platformHealthPercent: number;
  generatedAt: Date;
}

/** Live ops pulse — what staff see on /command today */
export interface CommandPlatformPulse {
  organisations: number;
  users: number;
  leads: number;
  leadsThisWeek: number;
  openOpportunities: number;
  properties: number;
  listedProperties: number;
  stayBookings: number;
  stayBookingsActive: number;
  checkinsToday: number;
  growthProspects: number;
  growthInPipeline: number;
  openTasksDue: number;
  overdueLeadResponses: number;
}

export type CommandActionSeverity = "urgent" | "today" | "watch";

export interface CommandActionItem {
  id: string;
  severity: CommandActionSeverity;
  title: string;
  detail: string;
  href: string;
}

export type AgencyHealthTier = "top_performer" | "healthy" | "needs_attention";

export interface CommandClientRow {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  status: string;
  industry: string | null;
  memberCount: number;
  contactCount: number;
  leadCount: number;
  propertyCount: number;
  stayBookingCount: number;
  installedApps: string[];
  /** Real Estate agency beta (`re.beta` feature flag) */
  reBeta: boolean;
  needsAttention: boolean;
  attentionReasons: string[];
  createdAt: string;
  updatedAt: string;
  /** Success Score™ 0–100 when Client Intelligence has computed it */
  successScore?: number;
  healthTier?: AgencyHealthTier;
  rank?: number;
}

export interface CommandConnectorOrgStatus {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  wordpressConfigured: boolean;
  lastSyncAt: string | null;
  hasBillingCustomer: boolean;
  installedApps: string[];
}

export interface CommandReferEarnSnapshot {
  totalReferrals: number;
  invited: number;
  signedUp: number;
  paid: number;
  creditsMtdCents: number;
}

export interface CommandDeepLink {
  id: string;
  label: string;
  href: string;
  description: string;
}

export interface CommandRecentActivity {
  id: string;
  title: string;
  activityType: string;
  sourceApp: string | null;
  organisationName: string;
  organisationSlug: string;
  createdAt: string;
}

/** Full ops home payload for /command */
export interface CommandCentreOpsHome {
  generatedAt: string;
  briefing: string;
  pulse: CommandPlatformPulse;
  actions: CommandActionItem[];
  clients: CommandClientRow[];
  connectors: {
    stripeOk: boolean;
    stripeMode: "test" | "live" | "unset";
    orgsWithBillingCustomer: number;
    wordpressConfiguredCount: number;
    wordpressSyncedRecently: number;
    orgs: CommandConnectorOrgStatus[];
  };
  billing: {
    activeSubscriptions: number;
    estimatedMrrCents: number;
    invoicePaidMtdCents: number;
    orgsWithBillingCustomer: number;
    stripeOk: boolean;
    stripeMode: "test" | "live" | "unset";
    estimatedMrrLabel: string;
    invoicePaidMtdLabel: string;
  };
  referEarn: CommandReferEarnSnapshot;
  growth: {
    totalProspects: number;
    byStage: Record<string, number>;
    engagementsThisWeek: number;
  };
  recentActivity: CommandRecentActivity[];
  deepLinks: CommandDeepLink[];
}

/** Per-client view in Command Centre (richer than customer dashboard) */
export interface ClientIntelligence {
  organisationId: string;
  organisationName: string;
  successScore: number;
  scores: Partial<Record<ScoreId, number>>;
  growthPercent?: number;
  leadConversionPercent?: number;
  automationHoursSavedThisMonth?: number;
  marketingRoi?: number;
  platformUsagePercent?: number;
  clientSatisfaction?: number;
  needsAttention: boolean;
  attentionReasons?: string[];
}

export interface AgencyHealthRanking {
  organisationId: string;
  organisationName: string;
  successScore: number;
  tier: AgencyHealthTier;
  rank: number;
  highlights?: string[];
  concerns?: string[];
}

/** Upsell suggestions for account managers */
export interface ClientOpportunity {
  organisationId: string;
  appId: string;
  appName: string;
  label: string;
  rationale: string;
  estimatedAdditionalMrrCents: number;
}

export interface ClientOpportunitySummary {
  organisationId: string;
  organisationName: string;
  opportunities: ClientOpportunity[];
  totalPotentialMrrCents: number;
}

/** Anonymous cohort comparison */
export interface BenchmarkComparison {
  organisationId: string;
  cohortLabel: string;
  metricId: ScoreId | "success_score";
  yourValue: number;
  cohortAverage: number;
  topDecile: number;
  percentile?: number;
}

/** Auto-generated monthly report sent to clients */
export interface ExecutiveGrowthReport {
  organisationId: string;
  periodLabel: string;
  highlights: ExecutiveReportHighlight[];
  scoreChanges: ExecutiveReportScoreChange[];
  automationHoursSaved?: number;
  recommendedNextStep: RecommendedAction;
  generatedAt: Date;
  aiGenerated: boolean;
}

export interface ExecutiveReportHighlight {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "flat";
}

export interface ExecutiveReportScoreChange {
  scoreId: ScoreId | "success_score";
  label: string;
  changePercent: number;
  currentValue: number;
}

/** DG platform infrastructure and commercial metrics */
export interface PlatformHealthMetrics {
  cpuUsagePercent?: number;
  storageUsedGb?: number;
  apiRequestsToday: number;
  aiTokensToday: number;
  emailVolumeToday: number;
  smsVolumeToday: number;
  stripeRevenueMtdCents: number;
  mrrCents: number;
  arrCents: number;
  churnRatePercent?: number;
  trialConversionPercent?: number;
  customerGrowthPercent?: number;
  measuredAt: Date;
}

/** AI Business Advisor response shape */
export interface ClientAdvisorInsight {
  organisationId: string;
  summary: string;
  positives: string[];
  concerns: string[];
  recommendations: RecommendedAction[];
  generatedAt: Date;
}
