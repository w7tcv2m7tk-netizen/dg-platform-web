/**
 * Business Memory Service — structured organisational memory (not chat history).
 * All Apps leverage memory through the AI Service.
 */

export type MemoryCategory =
  | "interaction"
  | "writing_style"
  | "terminology"
  | "report"
  | "campaign"
  | "ai_content"
  | "decision"
  | "preference"
  | "prompt";

export interface MemoryEntry {
  id: string;
  organisationId: string;
  category: MemoryCategory;
  key: string;
  content: string;
  sourceAppId?: string;
  sourceEntityType?: string;
  sourceEntityId?: string;
  embeddingId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryQuery {
  organisationId: string;
  categories?: MemoryCategory[];
  query?: string;
  limit?: number;
}
