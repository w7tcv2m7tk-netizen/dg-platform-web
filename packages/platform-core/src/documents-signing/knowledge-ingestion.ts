import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { Prisma, prisma } from "@dg/database";

import { orgOwnedAssetUrl, isServerlessRuntime } from "../assets/org-brand-storage";
import { proposeKnowledgeItem, upsertKnowledgeSource } from "../knowledge";
import { getOrgDocument } from "./service";
import type { PlatformDocument } from "./types";

const MAX_EXTRACT_BYTES = 10 * 1024 * 1024;
const MAX_PROPOSALS = 10;

export type DocumentKnowledgeIngestionStatus = {
  state: "not_ingested" | "proposed" | "approved" | "reviewed";
  sourceRef: string;
  proposalCount: number;
  approvedCount: number;
  rejectedCount: number;
};

export type DocumentKnowledgeIngestionResult = DocumentKnowledgeIngestionStatus & {
  documentId: string;
  extractedCharacters: number;
  createdCount: number;
  message: string;
};

export class DocumentKnowledgeIngestionError extends Error {
  readonly code:
    | "document_not_found"
    | "unsupported_document"
    | "storage_not_trusted"
    | "download_failed"
    | "no_extractable_text";
  readonly status: number;

  constructor(
    message: string,
    code: DocumentKnowledgeIngestionError["code"],
    status = 422,
  ) {
    super(message);
    this.name = "DocumentKnowledgeIngestionError";
    this.code = code;
    this.status = status;
  }
}

export function documentKnowledgeSourceRef(document: Pick<PlatformDocument, "id" | "version">) {
  return `document:${document.id}:v${document.version}`;
}

function decodePdfLiteral(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = value[i + 1];
    if (next == null) break;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === "b") out += "\b";
    else if (next === "f") out += "\f";
    else if (next === "\n") {
      // PDF line continuation — omit both characters.
    } else if (next === "\r") {
      if (value[i + 2] === "\n") i += 1;
    } else if (/[0-7]/.test(next)) {
      let octal = next;
      while (octal.length < 3 && /[0-7]/.test(value[i + 1 + octal.length] ?? "")) {
        octal += value[i + 1 + octal.length];
      }
      out += String.fromCharCode(Number.parseInt(octal, 8));
      i += octal.length - 1;
    } else {
      out += next;
    }
    i += 1;
  }
  return out;
}

function decodePdfHex(value: string): string {
  const clean = value.replace(/\s+/g, "");
  if (!clean || /[^0-9a-f]/i.test(clean)) return "";
  const padded = clean.length % 2 === 0 ? clean : `${clean}0`;
  const bytes = Buffer.from(padded, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let result = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      result += String.fromCharCode(bytes.readUInt16BE(i));
    }
    return result;
  }
  return bytes.toString("latin1");
}

function extractTextOperators(content: string): string[] {
  const parts: string[] = [];
  const literal = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  for (const match of content.matchAll(literal)) {
    const decoded = decodePdfLiteral(match[1] ?? "").trim();
    if (decoded) parts.push(decoded);
  }

  const arrays = /\[((?:.|\n|\r)*?)\]\s*TJ/g;
  for (const match of content.matchAll(arrays)) {
    const body = match[1] ?? "";
    const fragments: string[] = [];
    for (const item of body.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
      const decoded = decodePdfLiteral(item[1] ?? "");
      if (decoded) fragments.push(decoded);
    }
    for (const item of body.matchAll(/<([0-9a-f\s]+)>/gi)) {
      const decoded = decodePdfHex(item[1] ?? "");
      if (decoded) fragments.push(decoded);
    }
    if (fragments.length) parts.push(fragments.join(""));
  }

  const hex = /<([0-9a-f\s]+)>\s*Tj/gi;
  for (const match of content.matchAll(hex)) {
    const decoded = decodePdfHex(match[1] ?? "").trim();
    if (decoded) parts.push(decoded);
  }
  return parts;
}

function cleanExtractedText(parts: string[]): string {
  const joined = parts
    .join(" ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!joined) return "";
  const readable = [...joined].filter((ch) => /[\p{L}\p{N}\p{P}\p{Zs}]/u.test(ch)).length;
  if (readable / joined.length < 0.8) return "";
  return joined;
}

/**
 * Conservative text-PDF extractor. It supports common literal/hex text operators and
 * Flate-compressed streams. Image-only scans and PDFs with unsupported custom encodings
 * deliberately return no text rather than manufacturing knowledge.
 */
export function extractTextFromPdf(buffer: Buffer): string {
  if (buffer.length > MAX_EXTRACT_BYTES) {
    throw new DocumentKnowledgeIngestionError(
      "Document is too large to extract safely.",
      "unsupported_document",
    );
  }
  const pdf = buffer.toString("latin1");
  if (!pdf.startsWith("%PDF-")) {
    throw new DocumentKnowledgeIngestionError(
      "The stored file is not a valid PDF.",
      "unsupported_document",
    );
  }

  const parts = extractTextOperators(pdf);
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  for (const match of pdf.matchAll(streamRegex)) {
    const raw = match[1] ?? "";
    const start = match.index ?? 0;
    const dict = pdf.slice(Math.max(0, start - 600), start);
    let streamText = raw;
    if (/\/FlateDecode\b/.test(dict)) {
      try {
        streamText = inflateSync(Buffer.from(raw, "latin1")).toString("latin1");
      } catch {
        continue;
      }
    }
    parts.push(...extractTextOperators(streamText));
  }
  return cleanExtractedText(parts);
}

async function loadDocumentBytes(document: PlatformDocument): Promise<Buffer> {
  const url = document.url ?? document.storageKey;
  if (!url || !orgOwnedAssetUrl(url, document.organisationId)) {
    throw new DocumentKnowledgeIngestionError(
      "Document storage location failed organisation ownership validation.",
      "storage_not_trusted",
      403,
    );
  }

  const parsed = new URL(url, "https://app.digitalgate.com.au");
  const blobHosted = /(^|\.)blob\.vercel-storage\.com$/i.test(parsed.hostname);
  if (blobHosted) {
    const response = await fetch(url, { redirect: "error" });
    if (!response.ok) {
      throw new DocumentKnowledgeIngestionError(
        `Document download failed (${response.status}).`,
        "download_failed",
        502,
      );
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_EXTRACT_BYTES) {
      throw new DocumentKnowledgeIngestionError(
        "Document is too large to extract safely.",
        "unsupported_document",
      );
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_EXTRACT_BYTES) {
      throw new DocumentKnowledgeIngestionError(
        "Document is too large to extract safely.",
        "unsupported_document",
      );
    }
    return bytes;
  }

  if (isServerlessRuntime()) {
    throw new DocumentKnowledgeIngestionError(
      "Only DigitalGate Blob documents can be ingested in production.",
      "storage_not_trusted",
      403,
    );
  }

  const relative = decodeURIComponent(parsed.pathname).replace(/^\/+/, "");
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const root = path.resolve(process.cwd(), "public");
  const absolute = path.resolve(root, relative);
  if (!absolute.startsWith(`${root}${path.sep}`)) {
    throw new DocumentKnowledgeIngestionError(
      "Document path failed local storage validation.",
      "storage_not_trusted",
      403,
    );
  }
  try {
    return await readFile(absolute);
  } catch {
    throw new DocumentKnowledgeIngestionError(
      "Stored document could not be read.",
      "download_failed",
      502,
    );
  }
}

function candidateStatements(text: string): string[] {
  const segments = text
    .split(/(?<=[.!?;:])\s+(?=[A-Z0-9])/)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 55 && value.length <= 700)
    .filter((value) => /[A-Za-z]{4}/.test(value));

  const businessSignal = /\b(service|product|customer|client|fee|price|payment|term|policy|cancel|commission|business|company|address|email|phone|hours|process|agreement|authority|loan|property|supplier|delivery|booking|contact|website|target|audience)\b/i;
  const ranked = [...segments].sort((a, b) => {
    const aSignal = businessSignal.test(a) ? 1 : 0;
    const bSignal = businessSignal.test(b) ? 1 : 0;
    return bSignal - aSignal;
  });

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of ranked) {
    const key = value.toLocaleLowerCase("en-AU");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
    if (unique.length >= MAX_PROPOSALS) break;
  }
  return unique;
}

async function sourceItemCounts(organisationId: string, sourceRef: string) {
  const rows = await prisma.$queryRaw<
    Array<{ status: string; count: bigint }>
  >(Prisma.sql`
    SELECT status, COUNT(*)::bigint AS count
    FROM business_knowledge_items
    WHERE organisation_id = ${organisationId}
      AND source_ref = ${sourceRef}
    GROUP BY status
  `);
  const counts = new Map(rows.map((row) => [row.status, Number(row.count)]));
  return {
    proposalCount: counts.get("proposed") ?? 0,
    approvedCount: counts.get("approved") ?? 0,
    rejectedCount: counts.get("rejected") ?? 0,
    total: rows.reduce((sum, row) => sum + Number(row.count), 0),
  };
}

export async function getDocumentKnowledgeIngestionStatus(input: {
  organisationId: string;
  documentId: string;
}): Promise<DocumentKnowledgeIngestionStatus | null> {
  const document = await getOrgDocument(input.organisationId, input.documentId);
  if (!document) return null;
  const sourceRef = documentKnowledgeSourceRef(document);
  const counts = await sourceItemCounts(input.organisationId, sourceRef);
  const state =
    counts.approvedCount > 0
      ? "approved"
      : counts.proposalCount > 0
        ? "proposed"
        : counts.total > 0
          ? "reviewed"
          : "not_ingested";
  return { state, sourceRef, ...counts };
}

export async function ingestDocumentKnowledge(input: {
  organisationId: string;
  documentId: string;
  actorId: string;
}): Promise<DocumentKnowledgeIngestionResult> {
  const document = await getOrgDocument(input.organisationId, input.documentId);
  if (!document) {
    throw new DocumentKnowledgeIngestionError(
      "Document not found in this organisation.",
      "document_not_found",
      404,
    );
  }
  if (document.mimeType !== "application/pdf") {
    throw new DocumentKnowledgeIngestionError(
      "This file needs OCR before it can propose Business Brain knowledge. Text-based PDFs are supported now; image uploads are not silently interpreted.",
      "unsupported_document",
    );
  }

  const sourceRef = documentKnowledgeSourceRef(document);
  const existing = await sourceItemCounts(input.organisationId, sourceRef);
  if (existing.total > 0) {
    return {
      documentId: document.id,
      sourceRef,
      state: existing.approvedCount > 0 ? "approved" : existing.proposalCount > 0 ? "proposed" : "reviewed",
      proposalCount: existing.proposalCount,
      approvedCount: existing.approvedCount,
      rejectedCount: existing.rejectedCount,
      extractedCharacters: 0,
      createdCount: 0,
      message: "This document version has already been sent through Business Brain review.",
    };
  }

  const bytes = await loadDocumentBytes(document);
  const text = extractTextFromPdf(bytes);
  const candidates = candidateStatements(text);
  if (text.length < 80 || candidates.length === 0) {
    throw new DocumentKnowledgeIngestionError(
      "No reliable text could be extracted. This may be a scanned/image PDF or use an unsupported font encoding; no knowledge was proposed.",
      "no_extractable_text",
    );
  }

  const contentHash = createHash("sha256").update(text).digest("hex");
  const sourceId = await upsertKnowledgeSource({
    organisationId: input.organisationId,
    sourceType: "document",
    title: document.name,
    sourceApp: "documents",
    sourceRef,
    capturedAt: new Date(document.updatedAt),
    contentHash,
    accessClassification: "internal",
    metadata: {
      documentId: document.id,
      documentVersion: document.version,
      documentKind: document.kind,
      mimeType: document.mimeType,
      extractor: "digitalgate.text-pdf.v1",
    },
  });

  let createdCount = 0;
  for (const [index, statement] of candidates.entries()) {
    await proposeKnowledgeItem({
      organisationId: input.organisationId,
      type: "document_fact",
      title: `${document.name} — candidate ${index + 1}`,
      statement,
      confidence: 0.65,
      importance: "medium",
      scope: ["business"],
      sourceId,
      sourceRef,
      sourceExcerpt: statement.slice(0, 1000),
      createdBy: input.actorId,
      metadata: {
        documentId: document.id,
        documentVersion: document.version,
        candidateIndex: index,
        extractor: "digitalgate.text-pdf.v1",
        approvalRequired: true,
      },
    });
    createdCount += 1;
  }

  return {
    documentId: document.id,
    sourceRef,
    state: "proposed",
    proposalCount: createdCount,
    approvedCount: 0,
    rejectedCount: 0,
    extractedCharacters: text.length,
    createdCount,
    message: `${createdCount} knowledge candidate${createdCount === 1 ? "" : "s"} sent to the Business Brain inbox for human review. Nothing was auto-approved.`,
  };
}
