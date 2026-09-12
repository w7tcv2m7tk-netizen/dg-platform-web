import { NextResponse } from "next/server";
import {
  getDocumentKnowledgeIngestionStatus,
  ingestDocumentIntoBusinessBrain,
} from "@dg/platform-core";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "documents.read");
  if (denied) return denied;

  const { id } = await context.params;
  const status = await getDocumentKnowledgeIngestionStatus({
    organisationId: session.organisationId,
    documentId: id,
  });
  return NextResponse.json({ data: status });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "documents.write");
  if (denied) return denied;

  const { id } = await context.params;
  try {
    const status = await ingestDocumentIntoBusinessBrain({
      organisationId: session.organisationId,
      documentId: id,
      actorId: session.clerkUserId,
    });
    return NextResponse.json({ data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Knowledge extraction failed";
    return NextResponse.json(
      { error: { code: "knowledge_ingestion_failed", message } },
      { status: 422 },
    );
  }
}
