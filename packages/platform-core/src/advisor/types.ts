export type AdvisorQuestionId =
  | "today"
  | "focus_this_week"
  | "leads_dropped"
  | "losing_opportunities"
  | "automate"
  | "compare"
  | "revenue_impact";

export type AdvisorRecommendation = {
  id: string;
  priority: number;
  whatISee: string;
  whyItMatters: string;
  whatIRecommend: string;
  whatDigitalGateCanDo: string;
  actionLabel: string;
  href: string;
};

export type AdvisorQuestionAnswer = {
  id: AdvisorQuestionId;
  question: string;
  summary: string;
  recommendations: AdvisorRecommendation[];
};

export type BusinessAdvisorBundle = {
  generatedAt: string;
  scoresLive: boolean;
  userDisplayName: string;
  brainCompleteness: number;
  businessHealth: number | null;
  benchmarkScore: number | null;
  benchmarkPercentile: number | null;
  todaySummary: string;
  topRecommendations: AdvisorRecommendation[];
  suggestedQuestions: Array<{ id: AdvisorQuestionId; label: string }>;
  questionAnswers: AdvisorQuestionAnswer[];
};
