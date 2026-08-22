import type { BusinessBrainSnapshot } from "./types";

export type BusinessBrainPriorityGap = {
  id: string;
  label: string;
  dimension: string;
  href: string;
  status: "partial" | "missing";
};

export type BusinessBrainIntelligenceSurface = {
  label: string;
  href: string;
  description: string;
};

export type BusinessBrainDashboardBundle = {
  generatedAt: string;
  scoresLive: boolean;
  organisationName: string;
  completeness: number;
  readyCount: number;
  totalCount: number;
  twinCompleteness: number | null;
  businessHealth: number | null;
  understandingSummary: string[];
  priorityGaps: BusinessBrainPriorityGap[];
  brain: BusinessBrainSnapshot;
  connectedSources: Array<{ id: string; label: string; href: string }>;
  intelligenceSurfaces: BusinessBrainIntelligenceSurface[];
};
