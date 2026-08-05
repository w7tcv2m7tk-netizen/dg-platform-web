/**
 * Digital Knowledge Graph — relationships between business entities.
 * Enables richer reporting and AI context than isolated records.
 */

export type GraphNodeType =
  | "Organisation"
  | "Contact"
  | "Company"
  | "Property"
  | "Lead"
  | "Campaign"
  | "Website"
  | "LeadSource"
  | "Task"
  | "Revenue"
  | "Review"
  | "AiVisibilitySnapshot";

export type GraphEdgeType =
  | "owns"
  | "employs"
  | "generated"
  | "converted_to"
  | "listed_on"
  | "came_from"
  | "assigned_to"
  | "earned"
  | "received"
  | "tracks"
  | "connected_to";

export interface GraphNode {
  id: string;
  organisationId: string;
  type: GraphNodeType;
  entityId: string;
  label: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  organisationId: string;
  type: GraphEdgeType;
  fromNodeId: string;
  toNodeId: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphSnapshot {
  organisationId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  capturedAt: Date;
}
