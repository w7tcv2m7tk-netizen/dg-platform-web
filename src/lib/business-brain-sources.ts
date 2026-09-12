import { Prisma, prisma } from "@dg/database";
import {
  listApprovedKnowledge,
  listOrgDocuments,
  type KnowledgeItem,
  type PlatformDocument,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

type KnowledgeSourceRow = {
  id: string;
  source_type: string;
  title: string | null;
  source_app: string | null;
  source_ref: string;
  captured_at: Date | null;
  access_classification: string;
  metadata: unknown;
  proposed_count: bigint;
  approved_count: bigint;
  rejected_count: bigint;
  archived_count: bigint;
  superseded_count: bigint;
};

export type BusinessBrainSource = {
  id: string;
  type: string;
  title: string;
  app: string | null;
  ref: string;
  capturedAt: string | null;
  accessClassification: string;
  proposedCount: number;
  approvedCount: number;
  rejectedCount: number;
  archivedCount: number;
  supersededCount: number;
  metadata: unknown;
};

export type BrainDocumentSource = PlatformDocument & {
  knowledgeState: "not_ingested" | "proposed" | "approved" | "reviewed";
  proposedCount: number;
  approvedCount: number;
  rejectedCount: number;
};

export type BusinessBrainSourcesBundle = {
  organisationId: string;
  organisationName: string;
  sources: BusinessBrainSource[];
  documents: BrainDocumentSource[];
  approvedKnowledge: KnowledgeItem[];
  summary: {
    sourceCount: number;
    documentCount: number;
    approvedItemCount: number;
    proposedItemCount: number;
  };
};

function sourceRefForDocument(document: PlatformDocument) {
  return `document:${document.id}:v${document.version}`;
}

export async function loadBusinessBrainSources(): Promise<BusinessBrainSourcesBundle | null> {
  const { session } = await getPlatformPageContext();
  if (!session) return null;

  const organisationId = session.organisationId;
  const [rows, documents, approvedKnowledge] = await Promise.all([
    prisma.$queryRaw<KnowledgeSourceRow[]>(Prisma.sql`
      SELECT
        s.id,
        s.source_type,
        s.title,
        s.source_app,
        s.source_ref,
        s.captured_at,
        s.access_classification,
        s.metadata,
        COUNT(i.id) FILTER (WHERE i.status = 'proposed')::bigint AS proposed_count,
        COUNT(i.id) FILTER (WHERE i.status = 'approved')::bigint AS approved_count,
        COUNT(i.id) FILTER (WHERE i.status = 'rejected')::bigint AS rejected_count,
        COUNT(i.id) FILTER (WHERE i.status = 'archived')::bigint AS archived_count,
        COUNT(i.id) FILTER (WHERE i.status = 'superseded')::bigint AS superseded_count
      FROM business_knowledge_sources s
      LEFT JOIN business_knowledge_items i
        ON i.source_id = s.id
       AND i.organisation_id = s.organisation_id
      WHERE s.organisation_id = ${organisationId}
      GROUP BY
        s.id, s.source_type, s.title, s.source_app, s.source_ref,
        s.captured_at, s.access_classification, s.metadata
      ORDER BY COALESCE(s.captured_at, NOW()) DESC, s.title ASC NULLS LAST
      LIMIT 250
    `),
    listOrgDocuments({ organisationId, limit: 200 }),
    listApprovedKnowledge({ organisationId, limit: 500 }),
  ]);

  const sources: BusinessBrainSource[] = rows.map((row) => ({
    id: row.id,
    type: row.source_type,
    title: row.title ?? row.source_ref,
    app: row.source_app,
    ref: row.source_ref,
    capturedAt: row.captured_at?.toISOString() ?? null,
    accessClassification: row.access_classification,
    proposedCount: Number(row.proposed_count),
    approvedCount: Number(row.approved_count),
    rejectedCount: Number(row.rejected_count),
    archivedCount: Number(row.archived_count),
    supersededCount: Number(row.superseded_count),
    metadata: row.metadata,
  }));

  const sourceByRef = new Map(sources.map((source) => [source.ref, source]));
  const documentSources: BrainDocumentSource[] = documents.map((document) => {
    const source = sourceByRef.get(sourceRefForDocument(document));
    const proposedCount = source?.proposedCount ?? 0;
    const approvedCount = source?.approvedCount ?? 0;
    const rejectedCount = source?.rejectedCount ?? 0;
    const knowledgeState = approvedCount > 0
      ? "approved"
      : proposedCount > 0
        ? "proposed"
        : source
          ? "reviewed"
          : "not_ingested";
    return {
      ...document,
      knowledgeState,
      proposedCount,
      approvedCount,
      rejectedCount,
    };
  });

  return {
    organisationId,
    organisationName: session.organisationName,
    sources,
    documents: documentSources,
    approvedKnowledge,
    summary: {
      sourceCount: sources.length,
      documentCount: documents.length,
      approvedItemCount: approvedKnowledge.length,
      proposedItemCount: sources.reduce((sum, source) => sum + source.proposedCount, 0),
    },
  };
}
