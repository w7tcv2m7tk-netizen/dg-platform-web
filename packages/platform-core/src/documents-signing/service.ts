import type { Prisma } from "@dg/database";

import type {
  DocumentKind,
  DocumentSigningStatus,
  DocumentStatus,
  PlatformDocument,
  SigningProviderId,
} from "./types";

function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  const message =
    "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "42P01" ||
    /relation ["'].*["'] does not exist/i.test(message) ||
    /does not exist in the current database/i.test(message) ||
    /orgDocument is not a function/i.test(message) ||
    /Cannot read properties of undefined \(reading 'find/i.test(message)
  );
}

async function emptyIfUnmigrated<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isMissingRelationError(err)) {
      console.warn(
        "[documents] org_documents unavailable — run prisma db push",
        err instanceof Error ? err.message : err,
      );
      return fallback;
    }
    throw err;
  }
}

export type OrgDocumentRow = {
  id: string;
  organisationId: string;
  name: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string | null;
  storage: string;
  version: number;
  documentStatus: string;
  signingStatus: string;
  signingProvider: string;
  sourceApp: string | null;
  entityType: string | null;
  entityId: string | null;
  templateId: string | null;
  metadata: Prisma.JsonValue | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPlatformDocument(row: OrgDocumentRow): PlatformDocument {
  const links =
    row.entityType && row.entityId
      ? [
          {
            entityType: row.entityType as PlatformDocument["links"][0]["entityType"],
            entityId: row.entityId,
          },
        ]
      : [];

  return {
    id: row.id,
    organisationId: row.organisationId,
    name: row.name,
    kind: row.kind as DocumentKind,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    url: row.url ?? undefined,
    version: row.version,
    documentStatus: (row.documentStatus || "active") as DocumentStatus,
    signingStatus: row.signingStatus as DocumentSigningStatus,
    signingProvider: (row.signingProvider || "none") as SigningProviderId,
    sourceApp: row.sourceApp ?? undefined,
    links,
    templateId: row.templateId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ListOrgDocumentsInput = {
  organisationId: string;
  kind?: string;
  entityType?: string;
  entityId?: string;
  signingStatus?: string;
  documentStatus?: string;
  limit?: number;
};

export async function listOrgDocuments(
  input: ListOrgDocumentsInput,
): Promise<PlatformDocument[]> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    const rows = await prisma.orgDocument.findMany({
      where: {
        organisationId: input.organisationId,
        deletedAt: null,
        ...(input.kind ? { kind: input.kind } : {}),
        ...(input.entityType ? { entityType: input.entityType } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        ...(input.signingStatus ? { signingStatus: input.signingStatus } : {}),
        ...(input.documentStatus ? { documentStatus: input.documentStatus } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: Math.min(input.limit ?? 100, 200),
    });
    return rows.map((r) => toPlatformDocument(r as OrgDocumentRow));
  }, []);
}

export async function getOrgDocument(
  organisationId: string,
  id: string,
): Promise<PlatformDocument | null> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    const row = await prisma.orgDocument.findFirst({
      where: { id, organisationId, deletedAt: null },
    });
    return row ? toPlatformDocument(row as OrgDocumentRow) : null;
  }, null);
}

export type CreateOrgDocumentInput = {
  organisationId: string;
  name: string;
  kind: DocumentKind;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
  storage: "public" | "blob" | "inline";
  documentStatus?: DocumentStatus;
  signingStatus?: DocumentSigningStatus;
  signingProvider?: SigningProviderId;
  sourceApp?: string;
  entityType?: string;
  entityId?: string;
  templateId?: string;
  metadata?: Record<string, unknown>;
  /** When true, upsert by org + kind + entity (property dual-write). */
  upsertForEntity?: boolean;
};

export async function createOrgDocument(
  input: CreateOrgDocumentInput,
): Promise<PlatformDocument> {
  const { prisma } = await import("@dg/database");
  const documentStatus = input.documentStatus ?? "active";
  const signingStatus = input.signingStatus ?? "completed";
  const signingProvider = input.signingProvider ?? "manual_upload";
  const data = {
    organisationId: input.organisationId,
    name: input.name,
    kind: input.kind,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    url: input.url,
    storage: input.storage,
    documentStatus,
    signingStatus,
    signingProvider,
    sourceApp: input.sourceApp ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    templateId: input.templateId ?? null,
    metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    deletedAt: null,
  };

  if (
    input.upsertForEntity &&
    input.entityType &&
    input.entityId &&
    input.kind
  ) {
    const existing = await prisma.orgDocument.findFirst({
      where: {
        organisationId: input.organisationId,
        entityType: input.entityType,
        entityId: input.entityId,
        kind: input.kind,
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) {
      const updated = await prisma.orgDocument.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
          storageKey: data.storageKey,
          url: data.url,
          storage: data.storage,
          documentStatus: data.documentStatus,
          signingStatus: data.signingStatus,
          signingProvider: data.signingProvider,
          sourceApp: data.sourceApp,
          templateId: data.templateId,
          metadata: data.metadata,
          version: existing.version + 1,
          deletedAt: null,
        },
      });
      return toPlatformDocument(updated as OrgDocumentRow);
    }
  }

  const created = await prisma.orgDocument.create({ data });
  return toPlatformDocument(created as OrgDocumentRow);
}

export async function archiveOrgDocument(
  organisationId: string,
  id: string,
): Promise<PlatformDocument | null> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.orgDocument.findFirst({
    where: { id, organisationId, deletedAt: null },
  });
  if (!existing) return null;
  const updated = await prisma.orgDocument.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      documentStatus: "archived",
    },
  });
  return toPlatformDocument(updated as OrgDocumentRow);
}

export async function archiveOrgDocumentsForEntity(input: {
  organisationId: string;
  entityType: string;
  entityId: string;
  kind: DocumentKind;
}): Promise<number> {
  const { prisma } = await import("@dg/database");
  const result = await prisma.orgDocument.updateMany({
    where: {
      organisationId: input.organisationId,
      entityType: input.entityType,
      entityId: input.entityId,
      kind: input.kind,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      documentStatus: "archived",
    },
  });
  return result.count;
}

export async function updateOrgDocument(
  organisationId: string,
  id: string,
  patch: {
    name?: string;
    documentStatus?: DocumentStatus;
    signingStatus?: DocumentSigningStatus;
    archive?: boolean;
  },
): Promise<PlatformDocument | null> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.orgDocument.findFirst({
    where: { id, organisationId, deletedAt: null },
  });
  if (!existing) return null;
  if (patch.archive) {
    return archiveOrgDocument(organisationId, id);
  }
  const updated = await prisma.orgDocument.update({
    where: { id },
    data: {
      ...(patch.name != null ? { name: patch.name.trim() || existing.name } : {}),
      ...(patch.documentStatus ? { documentStatus: patch.documentStatus } : {}),
      ...(patch.signingStatus ? { signingStatus: patch.signingStatus } : {}),
    },
  });
  return toPlatformDocument(updated as OrgDocumentRow);
}

export async function summarizeOrgDocuments(organisationId: string): Promise<{
  total: number;
  byDocumentStatus: Record<string, number>;
  bySigningStatus: Record<string, number>;
  byKind: Record<string, number>;
}> {
  const empty = {
    total: 0,
    byDocumentStatus: {} as Record<string, number>,
    bySigningStatus: {} as Record<string, number>,
    byKind: {} as Record<string, number>,
  };
  return emptyIfUnmigrated(async () => {
    const docs = await listOrgDocuments({ organisationId, limit: 200 });
    const byDocumentStatus: Record<string, number> = {};
    const bySigningStatus: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    for (const d of docs) {
      byDocumentStatus[d.documentStatus] =
        (byDocumentStatus[d.documentStatus] ?? 0) + 1;
      bySigningStatus[d.signingStatus] = (bySigningStatus[d.signingStatus] ?? 0) + 1;
      byKind[d.kind] = (byKind[d.kind] ?? 0) + 1;
    }
    return { total: docs.length, byDocumentStatus, bySigningStatus, byKind };
  }, empty);
}

export function documentKindFromPropertyMetadataKey(
  metadataKey: string,
): DocumentKind | null {
  if (metadataKey === "agencyAgreement") return "agency_agreement";
  if (metadataKey === "disclosureStatement") return "disclosure_statement";
  return null;
}
