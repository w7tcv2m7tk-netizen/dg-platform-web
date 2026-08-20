export type BusinessBrainDimensionId =
  | "business"
  | "people"
  | "operations"
  | "commercial"
  | "knowledge"
  | "technology"
  | "ai";

export type BusinessBrainFieldStatus = "ready" | "partial" | "missing";

export type BusinessBrainField = {
  id: string;
  label: string;
  status: BusinessBrainFieldStatus;
  value?: string;
  href: string;
};

export type BusinessBrainDimension = {
  id: BusinessBrainDimensionId;
  name: string;
  summary: string;
  fields: BusinessBrainField[];
  readyCount: number;
  totalCount: number;
  percent: number;
};

export type BusinessBrainSurface = {
  label: string;
  href: string;
  uses: string;
};

export type BusinessBrainSnapshot = {
  organisationId: string;
  organisationName: string;
  percent: number;
  readyCount: number;
  totalCount: number;
  dimensions: BusinessBrainDimension[];
  surfaces: BusinessBrainSurface[];
  capturedAt: string;
};
