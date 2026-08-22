import type { DigitalTwinSnapshot } from "./types";

export type TwinLayerId =
  | "identity"
  | "commercial"
  | "operations"
  | "digital"
  | "intelligence";

export type TwinSignal = {
  label: string;
  value: string;
  href?: string;
};

export type TwinLayer = {
  id: TwinLayerId;
  label: string;
  icon: string;
  completeness: number;
  summary: string;
  signals: TwinSignal[];
  gaps: string[];
};

export type TwinConnectedSystem = {
  id: string;
  label: string;
  status: "live" | "partial" | "offline";
};

export type TwinIntelligenceSurface = {
  label: string;
  href: string;
  description: string;
};

export type TwinActivityEntry = {
  id: string;
  timeLabel: string;
  title: string;
  href?: string;
};

export type DigitalTwinDashboardBundle = {
  generatedAt: string;
  scoresLive: boolean;
  organisationName: string;
  tagline: string | null;
  capturedAtLabel: string | null;
  overallCompleteness: number;
  businessHealth: number | null;
  layers: TwinLayer[];
  connectedSystems: TwinConnectedSystem[];
  enabledApps: Array<{ id: string; label: string }>;
  intelligenceSurfaces: TwinIntelligenceSurface[];
  contextSummary: string[];
  recentActivity: TwinActivityEntry[];
  snapshot: DigitalTwinSnapshot | null;
};
