export type AnalyticsMetricStatus = "live" | "insufficient" | "unavailable";

export type AnalyticsKeyMetric = {
  id: string;
  label: string;
  value: string;
  context: string;
  href?: string;
  status: AnalyticsMetricStatus;
};

export type AnalyticsEvidenceMetric = {
  id: string;
  label: string;
  value: string | null;
  status: AnalyticsMetricStatus;
  unavailableTitle?: string;
  unavailableBody?: string;
  connectHref?: string;
  connectLabel?: string;
  href?: string;
};

export type AnalyticsTrendPoint = {
  label: string;
  value: number | null;
};

export type AnalyticsDataSource = {
  id: string;
  label: string;
  status: "connected" | "partial" | "not_connected";
  statusLabel: string;
  updatedLabel: string;
  detail: string;
  href?: string;
};

export type AnalyticsDashboardTemplate = {
  id: string;
  label: string;
  description: string;
  metrics: string[];
  href: string;
};

export type AnalyticsReportTemplate = {
  id: string;
  title: string;
  periodLabel: string;
  sections: string[];
  commentary: string;
  href: string;
};

export type AnalyticsBundle = {
  generatedAt: string;
  organisationName: string;
  scoresLive: boolean;
  keyMetrics: AnalyticsKeyMetric[];
  businessHealth: number | null;
  evidenceMetrics: AnalyticsEvidenceMetric[];
  leadTrend: AnalyticsTrendPoint[];
  leadTrendNote: string;
  dataSources: AnalyticsDataSource[];
  connectedSourceCount: number;
  predefinedDashboards: AnalyticsDashboardTemplate[];
  reportTemplates: AnalyticsReportTemplate[];
};
