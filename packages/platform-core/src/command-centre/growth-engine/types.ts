/**
 * DigitalGate Growth Engine™ — internal acquisition system types.
 * Prospect lifecycle: discover → audit → report → pipeline → proposal → client.
 * @see docs/GROWTH-ENGINE.md
 */

import type { ScoreId } from "../../scoring/types";

/** Pipeline stages — auto-advanced on events */
export type ProspectPipelineStage =
  | "prospect"
  | "audit_created"
  | "report_sent"
  | "email_opened"
  | "report_viewed"
  | "follow_up_due"
  | "meeting_booked"
  | "proposal_sent"
  | "won"
  | "lost"
  | "onboarding";

export interface BusinessDiscoveryQuery {
  industry?: string;
  location?: string;
  keywords?: string[];
  minEmployees?: number;
  maxEmployees?: number;
  hasGoogleBusinessProfile?: boolean;
  hasWebsite?: boolean;
}

export interface DiscoveredBusiness {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  websiteUrl?: string;
  googleBusinessProfileUrl?: string;
  discoverySource: string;
  confidence: number;
  discoveredAt: Date;
}

/** Prospect record — becomes Organisation on conversion */
export interface Prospect {
  id: string;
  businessName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  location?: string;
  websiteUrl?: string;
  stage: ProspectPipelineStage;
  ownerUserId?: string;
  organisationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProspectAuditScores {
  /** DigitalGate Business Health Score™ (composite). */
  businessHealth: number;
  aiVisibility?: number;
  /** Search Visibility (SEO fundamentals + indexing signals). */
  seo?: number;
  websiteHealth?: number;
  googleBusinessProfile?: number;
  socialPresence?: number;
  digitalIdentity?: number;
  /** Reputation & Presence (GBP / reviews / consistency signals). */
  reputation?: number;
  /** Conversion Readiness (CTAs, contact paths, forms). */
  conversionReadiness?: number;
  /** Business Growth Signals (systems that support visibility & leads). */
  growthSignals?: number;
}

/** AI Audit Engine output for a prospect business */
export interface ProspectAudit {
  id: string;
  prospectId: string;
  scores: ProspectAuditScores;
  findings: ProspectAuditFinding[];
  auditedAt: Date;
  auditVersion: string;
}

export interface ProspectAuditFinding {
  domain: "website" | "seo" | "ai_visibility" | "gbp" | "social" | "identity";
  severity: "critical" | "warning" | "opportunity";
  title: string;
  /** Human-readable finding summary (kept for existing consumers). */
  detail: string;
  recommendedAction?: string;
  /** Measurable probe result — what we observed. */
  observed?: string;
  /** Defensible inference from the observed signal — not a ranking claim. */
  interpretation?: string;
  /** Email / report section label (e.g. Conversion, Measurement). */
  category?: string;
}

/** Interactive branded report shared with prospect */
export interface ProspectOpportunityReport {
  id: string;
  prospectId: string;
  auditId: string;
  shareToken: string;
  shareUrl: string;
  executiveSummary: string;
  sections: ProspectReportSection[];
  competitorComparison?: ProspectBenchmarkRow[];
  estimatedGrowthPotential?: string;
  digitalGateHelpSection?: string;
  sentAt?: Date;
  firstViewedAt?: Date;
  viewCount: number;
  generatedAt: Date;
}

export interface ProspectReportSection {
  id: string;
  title: string;
  scoreId?: ScoreId | "business_health";
  score?: number;
  body: string;
  highlights?: string[];
}

export interface ProspectBenchmarkRow {
  metricLabel: string;
  prospectValue: number;
  industryAverage: number;
  topDecile: number;
  unit?: string;
}

export interface ProspectEngagementEvent {
  id: string;
  prospectId: string;
  reportId?: string;
  type:
    | "report_sent"
    | "email_opened"
    | "report_viewed"
    | "pricing_clicked"
    | "meeting_booked"
    | "proposal_sent"
    | "proposal_accepted";
  metadata?: Record<string, unknown>;
  occurredAt: Date;
}

export interface FollowUpRule {
  id: string;
  label: string;
  trigger: ProspectEngagementEvent["type"] | "stage_idle";
  idleDays?: number;
  action: "send_reminder" | "notify_owner" | "create_task" | "advance_stage";
  enabled: boolean;
}

/** AI Sales Assistant ranked recommendation — Call today list (not autonomous SDR) */
export interface SalesCallRecommendation {
  prospectId: string;
  businessName: string;
  reason: string;
  businessHealthScore: number;
  reportViewCount: number;
  stage: ProspectPipelineStage;
  priority: number;
}

/** Opportunity Engine™ — Prospect Opportunity Score band */
export type OpportunityBand = "very_high" | "high" | "medium" | "low";

export type OpportunityRecommendedAction =
  | "run_audit"
  | "send_audit"
  | "call_today"
  | "call_and_email"
  | "follow_up"
  | "close_loop";

export interface ProspectOpportunityScoreResult {
  score: number;
  band: OpportunityBand;
  bandLabel: string;
  reasons: string[];
  recommendedAction: OpportunityRecommendedAction;
  recommendedActionLabel: string;
  approachHint: string;
}

export interface DailyOpportunityRow {
  rank: number;
  prospectId: string;
  businessName: string;
  stage: ProspectPipelineStage;
  score: number;
  band: OpportunityBand;
  bandLabel: string;
  recommendedAction: OpportunityRecommendedAction;
  recommendedActionLabel: string;
  reasons: string[];
  approachHint: string;
  businessHealthScore: number | null;
  reportViewCount: number;
  hasAudit: boolean;
  hasReport: boolean;
  websiteUrl: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

/** Morning Daily Briefing payload — no invented MRR */
export interface DailyOpportunityBriefing {
  generatedAt: string;
  greeting: string;
  headline: string;
  subhead: string;
  recommendedCount: number;
  contactedToday: number;
  conversations: number;
  meetingsBooked: number;
  stillRequireAction: number;
  /** Sum of real proposal_sent engagement totalCents when present; else null */
  proposalPipelineCents: number | null;
  top: DailyOpportunityRow | null;
  rows: DailyOpportunityRow[];
}

export interface GrowthProposalDraft {
  id: string;
  prospectId: string;
  coverLetter: string;
  executiveSummary: string;
  recommendedServices: GrowthProposalServiceLine[];
  totalCents: number;
  roiEstimate?: string;
  timeline?: string;
  generatedAt: Date;
}

export interface GrowthProposalServiceLine {
  label: string;
  description: string;
  appId?: string;
  amountCents: number;
}

/** Module 9 — funnel metrics */
export interface GrowthConversionDashboard {
  periodLabel: string;
  auditsGenerated: number;
  reportsSent: number;
  emailOpenRatePercent: number;
  reportViewRatePercent: number;
  meetingsBooked: number;
  conversionRatePercent: number;
  mrrWonCents: number;
  averageSalesCycleDays: number;
  revenueForecastCents: number;
  generatedAt: Date;
}

/** Module 10 — prospect → live tenant handoff */
export interface ClientTransitionResult {
  prospectId: string;
  organisationId: string;
  organisationName: string;
  clerkOrgId?: string;
  subscriptionId?: string;
  installedAppIds: string[];
  onboardingStarted: boolean;
  twinSnapshotCreated: boolean;
  transitionedAt: Date;
  /** Contact email carried from prospect — used for owner invite CTA */
  contactEmail: string | null;
  contactName: string | null;
  /** Honest next-step deep links — no invented Stripe checkout / MRR */
  nextSteps: {
    clientsHref: string;
    teamHref: string;
    billingHref: string;
    connectorsHref: string;
    switchHint: string;
  };
}
