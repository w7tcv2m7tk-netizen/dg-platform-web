import { inflateSync } from "node:zlib";
import { Prisma } from "@dg/database";

import { createActivity } from "../activities";
import { llmChat, llmConfigured } from "../ai/llm";
import { orgOwnedAssetUrl } from "../assets/org-brand-storage";
import { proposeKnowledgeItem, upsertKnowledgeSource } from "../knowledge";
import { getOrgDocument } from "./service";

export type DocumentKnowledgeIngestionStatus = {
  state: "not_started" | "processing" | "completed" | "failed";
  proposedCount: number;
  message?: string;
  updatedAt?: string;
};

type Candidate = {
  type: string;
  title: string;
  statement: string;
  confidence: number;
  importance: string;
  scope: string[];
  excerpt: string;
};

function decodePdfString(value: string): string {
  return value
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\([0-7]{1,3})/g, (_m, octal: string) =>
      String.fromCharCode(parseInt(octal, 8)),
    );
}

/**
 * Dependency-free extraction for text PDFs. It deliberately fails closed for
 * scanned/image-only PDFs rather than pretending OCR succeeded.
 */
function extractTextFromPdf(buffer: Buffer): string {
  const latin = buffer.toString("latin1");
  const blocks: string[] = [];
  const streamPattern = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(latin))) {
    const header = latin.slice(Math.max(0, match.index - 500), match.index);
    let payload = Buffer.from(match[1], "latin1");
    if (/\/FlateDecode/.test(header)) {
      try {
        payload = inflateSync(payload);
      } catch {
        continue;
      }
    }
    const content = payload.toString("latin1");
    if (!/\bBT\b/.test(content)) continue;
    const textOps = /\(([^()]*(?:\\.[^()]*)*)\)\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ/g;
    let op: RegExpExecArray | null;
    while ((op = textOps.exec(content))) {
      if (op[1] != null) {
        blocks.push(decodePdfString(op[1]));
      } else if (op[2]) {
        const parts = [...op[2].matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g)].map((p) =>
          decodePdfString(p[1]),
        );
        if (parts.length) blocks.push(parts.join(""));
      }
    }
  }

  return blocks
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseCandidates(text: string): Candidate[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as { candidates?: unknown } | unknown[];
  const raw = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { candidates?: unknown }).candidates)
      ? ((parsed as { candidates: unknown[] }).candidates)
      : [];

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      type: String(item.type ?? "operating_context").slice(0, 80),
      title: String(item.title ?? "Document knowledge").slice(0, 180),
      statement: String(item.statement ?? "").trim().slice(0, 4000),
      confidence: Math.max(0, Math.min(1, Number(item.confidence ?? 0.7) || 0.7)),
      importance: ["low", "medium", "high", "critical"].includes(String(item.importance))
        ? String(item.importance)
        : "medium",
      scope: Array.isArray(item.scope)
        ? item.scope.map(String).map((v) => v.slice(0, 80)).slice(0, 8)
        : ["business"],
      excerpt: String(item.excerpt ?? "").trim().slice(0, 1200),
    }))
    .filter((item) => item.statement.length >= 12)
    .slice(0, 12);
}

async function existingProposals(organisationId: string, sourceRef: string): Promise<number> {
  const { prisma } = await import("@dg/database");
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM business_knowledge_items
    WHERE organisation_id = ${organisationId}
      AND source_ref = ${sourceRef}
      AND status IN ('proposed', 'approved')
  `);
  return Number(rows[0]?.count ?? 0);
}

export async function getDocumentKnowledgeIngestionStatus(input: {
  organisationId: string;
  documentId: string;
}): Promise<DocumentKnowledgeIngestionStatus> {
  const { prisma } = await import("@dg/database");
  const activity = await prisma.activity.findFirst({
    where: {
      organisationId: input.organisationId,
      entityType: "OrgDocument",
      entityId: input.documentId,
      activityType: { in: [
        "document.knowledge_processing",
        "document.knowledge_completed",
        "document.knowledge_failed",
      ] },
    },
    orderBy: { createdAt: "desc" },
    select: { activityType: true, body: true, metadata: true, createdAt: true },
  });
  if (!activity) return { state: "not_started", proposedCount: 0 };
  const metadata = (activity.metadata as Record<string, unknown> | null) ?? {};
  return {
    state:
      activity.activityType === "document.knowledge_completed"
        ? "completed"
        : activity.activityType === "document.knowledge_failed"
          ? "failed"
          : "processing",
    proposedCount: Number(metadata.proposedCount ?? 0) || 0,
    message: activity.body ?? undefined,
    updatedAt: activity.createdAt.toISOString(),
  };
}

export async function ingestDocumentIntoBusinessBrain(input: {
  organisationId: string;
  documentId: string;
  actorId?: string;
}): Promise<DocumentKnowledgeIngestionStatus> {
  const document = await getOrgDocument(input.organisationId, input.documentId);
  if (!document) throw new Error("Document not found in this organisation");
  if (!document.url || !orgOwnedAssetUrl(document.url, input.organisationId)) {
    throw new Error("Document file is not an organisation-owned asset");
  }
  if (document.mimeType !== "application/pdf") {
    throw new Error("Knowledge extraction currently requires a text PDF; image-only documents are not silently OCR'd");
  }
  if (!llmConfigured()) {
    throw new Error("AI extraction is not configured in this runtime");
  }

  const sourceRef = `document:${document.id}:v${document.version}`;
  const already = await existingProposals(input.organisationId, sourceRef);
  if (already > 0) {
    return {
      state: "completed",
      proposedCount: already,
      message: `${already} knowledge item${already === 1 ? " is" : "s are"} already linked to this document version.`,
    };
  }

  await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "OrgDocument",
    entityId: document.id,
    activityType: "document.knowledge_processing",
    title: "Business Brain extraction started",
    body: "Reading document and extracting candidate organisational knowledge for approval.",
    sourceApp: "documents",
    metadata: { sourceRef },
  });

  try {
    const response = await fetch(document.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Document download failed (${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 12 * 1024 * 1024) throw new Error("Document is too large to ingest safely");
    const text = extractTextFromPdf(buffer);
    if (text.length < 80) {
      throw new Error("No reliable text could be extracted. Use a text-based PDF rather than a scan or image-only file.");
    }

    const truncated = text.slice(0, 60_000);
    const result = await llmChat({
      tier: "standard",
      maxTokens: 2400,
      messages: [
        {
          role: "system",
          content: [
            "You extract durable organisational knowledge from a business document.",
            "Return JSON only: {\"candidates\":[...]}",
            "Each candidate must contain type,title,statement,confidence,importance,scope,excerpt.",
            "Extract facts, policies, processes, goals, decisions, constraints, services, audience, differentiators and operating rules that would help a business advisor understand the organisation.",
            "Do not extract signatures, personal identity numbers, bank details, passwords, transient formatting, boilerplate or facts not present in the source.",
            "Statements must be faithful to the source. Confidence is 0..1. importance is low|medium|high|critical. scope is an array of short business domains.",
            "At most 12 candidates.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Document: ${document.name}\n\nSOURCE TEXT:\n${truncated}`,
        },
      ],
    });

    const candidates = parseCandidates(result.text);
    if (!candidates.length) throw new Error("AI extraction returned no reviewable organisational knowledge");

    const sourceId = await upsertKnowledgeSource({
      organisationId: input.organisationId,
      sourceType: "document",
      title: document.name,
      sourceApp: "documents",
      sourceRef,
      capturedAt: new Date(document.updatedAt),
      accessClassification: "internal",
      metadata: {
        documentId: document.id,
        documentVersion: document.version,
        mimeType: document.mimeType,
        modelProvider: result.provider,
        model: result.model,
      },
    });

    for (const candidate of candidates) {
      await proposeKnowledgeItem({
        organisationId: input.organisationId,
        type: candidate.type,
        title: candidate.title,
        statement: candidate.statement,
        confidence: candidate.confidence,
        importance: candidate.importance,
        scope: candidate.scope,
        sourceId,
        sourceRef,
        sourceExcerpt: candidate.excerpt || undefined,
        createdBy: input.actorId,
        metadata: {
          ingestion: "document",
          documentId: document.id,
          documentVersion: document.version,
          extractionProvider: result.provider,
          extractionModel: result.model,
        },
      });
    }

    const status: DocumentKnowledgeIngestionStatus = {
      state: "completed",
      proposedCount: candidates.length,
      message: `${candidates.length} candidate knowledge item${candidates.length === 1 ? "" : "s"} sent to the Knowledge Inbox for approval. Nothing was auto-approved.`,
      updatedAt: new Date().toISOString(),
    };
    await createActivity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "OrgDocument",
      entityId: document.id,
      activityType: "document.knowledge_completed",
      title: "Business Brain extraction completed",
      body: status.message,
      sourceApp: "documents",
      metadata: { sourceRef, proposedCount: candidates.length },
    });
    return status;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document knowledge extraction failed";
    await createActivity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "OrgDocument",
      entityId: document.id,
      activityType: "document.knowledge_failed",
      title: "Business Brain extraction failed",
      body: message,
      sourceApp: "documents",
      metadata: { sourceRef, proposedCount: 0 },
    });
    throw error;
  }
}
