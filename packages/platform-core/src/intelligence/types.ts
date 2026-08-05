/**
 * Business Intelligence Engine — "What should I do next?" not just "What happened?"
 */

export type InsightSeverity = "info" | "warning" | "critical" | "opportunity";

export interface BusinessInsight {
  id: string;
  organisationId: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  /** Metric context e.g. "AI Visibility declined 15%" */
  metric?: string;
  recommendedActions: RecommendedAction[];
  sourceApps: string[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface RecommendedAction {
  id: string;
  label: string;
  description?: string;
  href?: string;
  priority: number;
}

export interface BiEngineResult {
  organisationId: string;
  insights: BusinessInsight[];
  focusToday: RecommendedAction[];
  generatedAt: Date;
}
