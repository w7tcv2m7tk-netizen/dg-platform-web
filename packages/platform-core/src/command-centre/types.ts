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

/** Live ops pulse — platform-owner metrics only (not tenant industry ops). */
export interface CommandPlatformPulse {
  organisations: number;
  users: number;
  leads: number;
  leadsThisWeek: number;
  openOpportunities: number;
  growthProspects: number;
  growthInPipeline: number;
  growthEngagementsThisWeek: number;
  openTasksDue: number;
  overdueLeadResponses: number;
  estimatedMrrCents: number;
  /** @deprecated Tenant industry metrics — kept for internal queries only, not shown in owner UI */
  properties?: number;
  listedProperties?: number;
  stayBookings?: number;
  stayBookingsActive?: number;
  checkinsToday?: number;
}

export interface CommandTodayItem {
  id: string;
  label: string;
  href: string;
}

export interface CommandOrganisationHealthSummary {
  totalOrganisations: number;
  organisationsWithSufficientData: number;
  averageHealth: number | null;
  averageHealthLabel: string;
  needsAttentionCount: number;
}

export interface CommandDeliverySummary {
  activeImplementations: number;
  awaitingCustomerInfo: number;
  blocked: number;
  inTraining: number;
  inQa: number;
  readyForGoLive: number;
}

export interface CommandPartnerPulse {
  foundingResellers: number;
  activeProspects: number;
  referredCustomers: number;
  onboardingCount: number;
  pendingCommissionsCents: number;
}

export interface CommandGrowthEngineCard {
  prospects: number;
  engagementsThisWeek: number;
  activePipeline: number;
  topPriorityLabel: string | null;
  topPriorityScore: number | null;
  href: string;
}

export interface CommandPlatformOperationsGroup {
  id: string;
  label: string;
  links: CommandDeepLink[];
}

export interface CommandRecentActivityHuman extends CommandRecentActivity {
  humanTitle: string;
  technicalTitle: string;
}

export type CommandActionSeverity = "urgent" | "today" | "watch";

export interface CommandActionItem {
  id: string;
  severity: CommandActionSeverity;
  title: string;
  detail: string;
  href: string;
}

/** Quantified Success Score™ band — score alone, not operational health. */
export type SuccessScoreBand =
  | "excellent"
  | "healthy"
  | "needs_attention"
  | "at_risk"
  | "critical";

/** DigitalGate operational interpretation of customer health (composite). */
export type AgencyHealthTier =
  | "top_performer"
  | "healthy"
  | "needs_attention"
  | "at_risk"
  | "critical";

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
  /** Accommodation property beta (`acc.beta` feature flag) */
  accBeta: boolean;
  /** Website Builder beta (`websites.builder`) */
  websitesBeta: boolean;
  /** Domains beta (`infra.domains_beta`) */
  infraDomainsBeta: boolean;
  needsAttention: boolean;
  attentionReasons: string[];
  createdAt: string;
  updatedAt: string;
  /** Success Score™ 0–100 when Client Intelligence has computed it */
  successScore?: number;
  /** Display as Organisation Health in platform-owner UI */
  organisationHealth?: number;
  healthTier?: AgencyHealthTier;
  rank?: number;
  /** True when score is early — don't invent gaps from it */
  scoreProvisional?: boolean;
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

/** Full ops home payload for /command — DigitalGate platform-owner operating console. */
export interface CommandCentreOpsHome {
  generatedAt: string;
  /** Short subtitle for header; detailed metrics live in pulse strip */
  briefing: string;
  pulse: CommandPlatformPulse;
  today: CommandTodayItem[];
  organisationHealth: CommandOrganisationHealthSummary;
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
  growthEngine: CommandGrowthEngineCard;
  delivery: CommandDeliverySummary;
  partnerPulse: CommandPartnerPulse;
  /** Opportunity Engine Daily Briefing summary for Command home */
  prospectingToday?: {
    recommendedCount: number;
    contactedToday: number;
    conversations: number;
    meetingsBooked: number;
    stillRequireAction: number;
    proposalPipelineCents: number | null;
    topBusinessName: string | null;
    topScore: number | null;
  };
  recentActivity: CommandRecentActivityHuman[];
  platformOperations: CommandPlatformOperationsGroup[];
  deliveryAlerts?: Array<{
    id: string;
    severity: "critical" | "warning" | "success" | "info";
    message: string;
    href: string;
  }>;
  /** @deprecated Use platformOperations */
  deepLinks?: CommandDeepLink[];
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
export type AdvisorConfidenceLevel = "high" | "limited" | "sparse";

export interface AdvisorEvidenceItem {
  id: string;
  label: string;
  score: number;
  detail: string;
}

export interface AdvisorPriorityItem {
  id: string;
  label: string;
  score: number;
  summary: string;
  href?: string;
}

export interface ClientAdvisorInsight {
  organisationId: string;
  summary: string;
  positives: string[];
  concerns: string[];
  recommendations: RecommendedAction[];
  generatedAt: Date;
  /** Extended assessment (template + enriched responses) */
  assessmentTitle?: string;
  priorities?: AdvisorPriorityItem[];
  evidence?: AdvisorEvidenceItem[];
  confidence?: AdvisorConfidenceLevel;
  confidenceRationale?: string;
  breakdown?: {
    connectors: number;
    crm: number;
    usage: number;
    billing: number;
  };
  dataCoverage?: "sparse" | "partial" | "rich";
  scoreProvisional?: boolean;
  cohortDelta?: number;
  billingFooting?: {
    state: string;
    label: string;
    detail: string;
    needsIntervention: boolean;
  };
}
