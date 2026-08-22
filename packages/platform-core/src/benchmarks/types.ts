export type BenchmarkDataSource = "network" | "industry_reference";

export type BenchmarkCategoryId =
  | "business_intelligence"
  | "customer_crm"
  | "digital_presence"
  | "seo"
  | "ai_visibility"
  | "reputation"
  | "marketing"
  | "automation"
  | "commercial"
  | "growth";

export type BenchmarkCategory = {
  id: BenchmarkCategoryId;
  label: string;
  icon: string;
  yourScore: number | null;
  industryAverage: number;
  top25: number;
  percentile: number | null;
  unavailableReason?: string;
};

export type BenchmarkMetricRow = {
  id: string;
  label: string;
  yourValue: string;
  industryAverage: string;
  top25: string;
  unavailableReason?: string;
};

export type BenchmarkOpportunity = {
  id: string;
  title: string;
  gap: string;
  impact: string;
  actionLabel: string;
  href: string;
};

export type BenchmarkTrendPoint = {
  label: string;
  percentile: number;
};

export type BenchmarkCohortId =
  | "similar"
  | "industry"
  | "local"
  | "size"
  | "digital_maturity"
  | "top_performers";

export type BenchmarkCohortOption = {
  id: BenchmarkCohortId;
  label: string;
  description: string;
};

export type BusinessBenchmarksBundle = {
  generatedAt: string;
  dataSource: BenchmarkDataSource;
  dataSourceNote: string;
  cohortId: BenchmarkCohortId;
  cohortOptions: BenchmarkCohortOption[];
  comparisonLabels: {
    average: string;
    top: string;
  };
  cohortLabel: string;
  cohortDescription: string;
  networkCohortSize: number;
  benchmarkScore: number | null;
  overallPercentile: number | null;
  percentileDelta90Days: number | null;
  trend: BenchmarkTrendPoint[];
  categories: BenchmarkCategory[];
  strongest: BenchmarkCategory[];
  opportunities: BenchmarkCategory[];
  metrics: BenchmarkMetricRow[];
  digitalPresenceScore: number | null;
  digitalPresencePercentile: number | null;
  aiMaturityScore: number | null;
  aiMaturityPercentile: number | null;
  aiMaturityInsight?: string;
  operationalInsight?: string;
  briefing: string;
  recommendedActions: BenchmarkOpportunity[];
  scoresLive: boolean;
};
