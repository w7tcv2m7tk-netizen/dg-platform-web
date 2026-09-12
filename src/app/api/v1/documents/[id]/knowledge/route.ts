import {
  DocumentKnowledgeIngestionError,
  getDocumentKnowledgeIngestionStatus,
  ingestDocumentKnowledge,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "documents.read");
  if (denied) return denied;

  const { id } = await context.params;
  const status = await getDocumentKnowledgeIngestionStatus({
    organisationId: session.organisationId,
    documentId: id,
  });
  if (!status) {
    return NextResponse.json(
      { error: { code: "document_not_found", message: "Document not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: { status } });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "documents.write");
  if (denied) return denied;

  const { id } = await context.params;
  try {
    const result = await ingestDocumentKnowledge({
      organisationId: session.organisationId,
      documentId: id,
      actorId: session.clerkUserId,
    });
    return NextResponse.json({ data: { result } });
  } catch (err) {
    if (err instanceof DocumentKnowledgeIngestionError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    console.error("[documents] knowledge ingestion failed", err);
    return NextResponse.json(
      {
        error: {
          code: "knowledge_ingestion_failed",
          message: "Document knowledge ingestion failed. No knowledge was approved.",
        },
      },
      { status: 500 },
    );
  }
}
