import type { Prisma } from "@dg/database";

/**
 * Generic property document (agency agreement, disclosure statement, etc.).
 * Honesty: presence of `url` means a real file was uploaded — never a bare signed flag.
 */
export interface PropertyDocument {
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storage: "public" | "blob" | "inline";
  uploadedAt: string;
  uploadedBy?: string;
  /** Soft-clear timestamp; when set the document is not considered active. */
  clearedAt?: string;
}

export type PropertyDocumentKind = {
  /** e.g. agencyAgreement */
  metadataKey: string;
  /** e.g. agencyAgreementHistory */
  historyKey: string;
  defaultFileName: string;
  activitySaved: string;
  activityReplaced: string;
  activityCleared: string;
  titleSaved: string;
  titleReplaced: string;
  titleCleared: string;
};

export function normalizePropertyDocument(
  raw: Record<string, unknown> | PropertyDocument | null | undefined,
  defaultFileName = "document.pdf",
): PropertyDocument | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const url = typeof r.url === "string" ? r.url.trim() : "";
  if (!url) return undefined;
  if (typeof r.clearedAt === "string" && r.clearedAt) return undefined;

  const fileName =
    typeof r.fileName === "string"
      ? r.fileName
      : typeof r.file_name === "string"
        ? r.file_name
        : defaultFileName;
  const contentType =
    typeof r.contentType === "string"
      ? r.contentType
      : typeof r.content_type === "string"
        ? r.content_type
        : "application/pdf";
  const sizeBytes =
    typeof r.sizeBytes === "number"
      ? r.sizeBytes
      : typeof r.size_bytes === "number"
        ? r.size_bytes
        : 0;
  const storageRaw = typeof r.storage === "string" ? r.storage : "blob";
  const storage: PropertyDocument["storage"] =
    storageRaw === "public" || storageRaw === "inline" || storageRaw === "blob"
      ? storageRaw
      : "blob";
  const uploadedAt =
    typeof r.uploadedAt === "string"
      ? r.uploadedAt
      : typeof r.uploaded_at === "string"
        ? r.uploaded_at
        : new Date().toISOString();
  const uploadedBy =
    typeof r.uploadedBy === "string"
      ? r.uploadedBy
      : typeof r.uploaded_by === "string"
        ? r.uploaded_by
        : undefined;

  return {
    url,
    fileName,
    contentType,
    sizeBytes,
    storage,
    uploadedAt,
    uploadedBy,
  };
}

export async function savePropertyDocument(
  organisationId: string,
  propertyId: string,
  kind: PropertyDocumentKind,
  document: PropertyDocument,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  const previous = normalizePropertyDocument(
    metadata[kind.metadataKey] as Record<string, unknown> | undefined,
    kind.defaultFileName,
  );

  const history = Array.isArray(metadata[kind.historyKey])
    ? [...(metadata[kind.historyKey] as unknown[])]
    : [];
  if (previous?.url && previous.url !== document.url) {
    history.unshift({ ...previous, replacedAt: new Date().toISOString() });
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      metadata: {
        ...metadata,
        [kind.metadataKey]: document,
        [kind.historyKey]: history.slice(0, 10),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: previous ? kind.activityReplaced : kind.activitySaved,
      title: previous ? kind.titleReplaced : kind.titleSaved,
      body: document.fileName,
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: {
        url: document.url,
        contentType: document.contentType,
        sizeBytes: document.sizeBytes,
      } as Prisma.InputJsonValue,
    },
  });

  return updated;
}

/** Soft-clear: keep last file on history, remove active document. */
export async function clearPropertyDocument(
  organisationId: string,
  propertyId: string,
  kind: PropertyDocumentKind,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
  const previous = normalizePropertyDocument(
    metadata[kind.metadataKey] as Record<string, unknown> | undefined,
    kind.defaultFileName,
  );
  if (!previous) {
    return property;
  }

  const history = Array.isArray(metadata[kind.historyKey])
    ? [...(metadata[kind.historyKey] as unknown[])]
    : [];
  history.unshift({ ...previous, clearedAt: new Date().toISOString() });

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: {
      metadata: {
        ...metadata,
        [kind.metadataKey]: null,
        [kind.historyKey]: history.slice(0, 10),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: kind.activityCleared,
      title: kind.titleCleared,
      body: previous.fileName,
      sourceApp: "real-estate",
      createdBy: actorId,
    },
  });

  return updated;
}
