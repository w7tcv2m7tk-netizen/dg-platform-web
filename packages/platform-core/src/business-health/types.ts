export type HealthDimensionId =
  | "revenue"
  | "pipeline"
  | "marketing"
  | "digital"
  | "reputation"
  | "operations"
  | "customers";

export type HealthSignalStatus = "strong" | "watch" | "attention" | "unavailable";

export type HealthDimension = {
  id: HealthDimensionId;
  label: string;
  icon: string;
  score: number | null;
  status: HealthSignalStatus;
  summary: string;
  href: string;
  unavailableReason?: string;
};

export type PredictiveHealthAlert = {
  id: string;
  severity: "warning" | "critical";
  title: string;
  body: string;
  recommendedAction: string;
  href: string;
};

export type BusinessHealthStatus = "stable" | "improving" | "at_risk" | "unknown";

export type BusinessHealthBundle = {
  generatedAt: string;
  scoresLive: boolean;
  overallScore: number | null;
  overallStatus: BusinessHealthStatus;
  overallStatusLabel: string;
  trendDelta30Days: number | null;
  strong: string[];
  watch: string[];
  attention: string[];
  vitalSignals: Array<{ icon: string; label: string }>;
  dimensions: HealthDimension[];
  predictiveAlerts: PredictiveHealthAlert[];
  healthTrend: number[];
};
