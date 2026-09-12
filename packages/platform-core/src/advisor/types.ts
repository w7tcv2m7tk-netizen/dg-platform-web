import type { AiQualityMetrics } from "../ai/usage";

export type AdvisorQuestionId =
  | "today"
  | "focus_this_week"
  | "leads_dropped"
  | "losing_opportunities"
  | "automate"
  | "compare"
  | "revenue_impact"
  | "business_health"
  | "owner_summary";

export type AdvisorActionPriority = "high" | "medium" | "low";

export type AdvisorActionCategory =
  | "Sales"
  | "Customers"
  | "Marketing"
  | "Website"
  | "SEO"
  | "AI Visibility"
  | "Reputation"
  | "Operations"
  | "Finance"
  | "Automation"
  | "Health"
  | "Growth"
  | "Platform";

export type AdvisorContextId =
  | "entire_business"
  | "sales"
  | "customers"
  | "marketing"
  | "website"
  | "seo"
  | "ai_visibility"
  | "reputation"
  | "operations"
  | "finance"
  | "automation"
  | "contact"
  | "opportunity";

export type AdvisorRecommendation = {
  id: string;
  priority: number;
  priorityLevel: AdvisorActionPriority;
  category: AdvisorActionCategory;
  title: string;
  whatISee: string;
  whyItMatters: string;
  whatIRecommend: string;
  whatDigitalGateCanDo: string;
  actionLabel: string;
  href: string;
  toolId?: string;
  toolParams?: {
    title?: string;
    description?: string;
    priority?: string;
    dueAt?: string | null;
    entityType?: string;
    entityId?: string;
  };
  requiresApproval?: boolean;
};

export type AdvisorQuestionAnswer = {
  id: AdvisorQuestionId;
  question: string;
  summary: string;
  recommendations: AdvisorRecommendation[];
};

export type AdvisorContextOption = {
  id: AdvisorContextId;
  label: string;
};

export type BusinessAdvisorBundle = {
  generatedAt: string;
  scoresLive: boolean;
  userDisplayName: string;
  organisationName: string;
  brainCompleteness: number;
  businessHealth: number | null;
  benchmarkScore: number | null;
  benchmarkPercentile: number | null;
  todaySummary: string;
  topRecommendations: AdvisorRecommendation[];
  suggestedQuestions: Array<{ id: AdvisorQuestionId; label: string }>;
  askExamples: string[];
  availableContexts: AdvisorContextOption[];
  questionAnswers: AdvisorQuestionAnswer[];
  aiQuality?: AiQualityMetrics;
};
