import type { Prisma } from "@dg/database";

import { createActivity } from "../activities";
import { storeOrgFile } from "../assets/org-brand-storage";
import type { DropboxSignRequestSnapshot } from "./dropbox-sign";
import type { DocumentSigningStatus } from "./types";

const MAX_SIGNED_PDF_BYTES = 25 * 1024 * 1024;

export type SigningDocumentRecord = {
  id: string;
  organisationId: string;
  name: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  signingStatus: string;
  signingProvider: string;
  metadata: Prisma.JsonValue | null;
};

function objectMetadata(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? ({ ...value } as Record<string, unknown>)
    : {};
}

export function signingSnapshotFromMetadata(
  metadata: Prisma.JsonValue | null,
): DropboxSignRequestSnapshot | null {
  const root = objectMetadata(metadata);
  const signing = root.signing;
  if (!signing || typeof signing !== "object" || Array.isArray(signing)) return null;
  const snapshot = signing as Partial<DropboxSignRequestSnapshot>;
  if (
    snapshot.provider !== "dropbox_sign" ||
    typeof snapshot.externalId !== "string" ||
    typeof snapshot.status !== "string" ||
    !Array.isArray(snapshot.recipients) ||
    typeof snapshot.sentAt !== "string"
  ) {
    return null;
  }
  return snapshot as DropboxSignRequestSnapshot;
}

export async function getSigningDocumentRecord(
  organisationId: string,
  documentId: string,
): Promise<SigningDocumentRecord | null> {
  const { prisma } = await import("@dg/database");
  return prisma.orgDocument.findFirst({
    where: { id: documentId, organisationId, deletedAt: null },
    select: {
      id: true,
      organisationId: true,
      name: true,
      kind: true,
      mimeType: true,
      sizeBytes: true,
      url: true,
      signingStatus: true,
      signingProvider: true,
      metadata: true,
    },
  });
}

export async function saveSigningSnapshot(input: {
  organisationId: string;
  documentId: string;
  snapshot: DropboxSignRequestSnapshot;
  actorId?: string;
  eventId?: string;
  eventTitle?: string;
}): Promise<void> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.orgDocument.findFirst({
    where: { id: input.documentId, organisationId: input.organisationId, deletedAt: null },
    select: { metadata: true },
  });
  if (!existing) throw new Error("Document not found");

  const metadata = objectMetadata(existing.metadata);
  await prisma.orgDocument.update({
    where: { id: input.documentId },
    data: {
      signingProvider: "dropbox_sign",
      signingStatus: input.snapshot.status,
      metadata: {
        ...metadata,
        signing: input.snapshot,
      } as Prisma.InputJsonValue,
    },
  });

  if (input.eventId && input.eventTitle) {
    await createActivity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      entityType: "Document",
      entityId: input.documentId,
      activityType: input.eventId,
      title: input.eventTitle,
      sourceApp: "documents",
      metadata: {
        provider: "dropbox_sign",
        externalId: input.snapshot.externalId,
        signingStatus: input.snapshot.status,
      },
    });
  }
}

export async function updateSigningFromProviderEvent(input: {
  organisationId: string;
  documentId: string;
  externalId: string;
  status: DocumentSigningStatus;
  recipients?: DropboxSignRequestSnapshot["recipients"];
  providerEvent: string;
  detailsUrl?: string;
  signingUrl?: string;
}): Promise<DropboxSignRequestSnapshot | null> {
  const record = await getSigningDocumentRecord(input.organisationId, input.documentId);
  if (!record) return null;
  const current = signingSnapshotFromMetadata(record.metadata);
  if (!current || current.externalId !== input.externalId) return null;

  const next: DropboxSignRequestSnapshot = {
    ...current,
    status: input.status,
    recipients: input.recipients?.length ? input.recipients : current.recipients,
    providerEvent: input.providerEvent,
    detailsUrl: input.detailsUrl ?? current.detailsUrl,
    signingUrl: input.signingUrl ?? current.signingUrl,
    completedAt:
      input.status === "completed" ? current.completedAt ?? new Date().toISOString() : current.completedAt,
  };

  const eventId =
    input.status === "viewed"
      ? "document.viewed"
      : input.status === "declined"
        ? "document.updated"
        : input.status === "expired"
          ? "document.updated"
          : undefined;

  await saveSigningSnapshot({
    organisationId: input.organisationId,
    documentId: input.documentId,
    snapshot: next,
    eventId,
    eventTitle:
      input.status === "viewed"
        ? "Document viewed by signer"
        : input.status === "declined"
          ? "Signature request declined"
          : input.status === "expired"
            ? "Signature request expired"
            : undefined,
  });
  return next;
}

export async function storeCompletedSignedPdf(input: {
  organisationId: string;
  documentId: string;
  externalId: string;
  pdf: Buffer;
  recipients?: DropboxSignRequestSnapshot["recipients"];
  providerEvent: string;
}): Promise<DropboxSignRequestSnapshot | null> {
  const { prisma } = await import("@dg/database");
  const record = await prisma.orgDocument.findFirst({
    where: { id: input.documentId, organisationId: input.organisationId, deletedAt: null },
  });
  if (!record) return null;

  const current = signingSnapshotFromMetadata(record.metadata);
  if (!current || current.externalId !== input.externalId) return null;
  if (current.downloadedAt) return current; // webhook retries are idempotent

  const stored = await storeOrgFile({
    organisationId: input.organisationId,
    buffer: input.pdf,
    contentType: "application/pdf",
    maxBytes: MAX_SIGNED_PDF_BYTES,
    sizeLabel: "Signed document",
    keyPrefix: `documents/signed/${record.kind}/${record.id}`,
  });

  const now = new Date().toISOString();
  const next: DropboxSignRequestSnapshot = {
    ...current,
    status: "completed",
    recipients: input.recipients?.length ? input.recipients : current.recipients,
    completedAt: current.completedAt ?? now,
    downloadedAt: now,
    providerEvent: input.providerEvent,
  };
  const metadata = objectMetadata(record.metadata);

  await prisma.orgDocument.update({
    where: { id: record.id },
    data: {
      mimeType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.url,
      url: stored.url,
      storage: stored.storage,
      version: record.version + 1,
      signingProvider: "dropbox_sign",
      signingStatus: "completed",
      metadata: {
        ...metadata,
        signing: next,
        signedArtifact: {
          provider: "dropbox_sign",
          externalId: input.externalId,
          storedAt: now,
        },
      } as Prisma.InputJsonValue,
    },
  });

  await createActivity({
    organisationId: input.organisationId,
    entityType: "Document",
    entityId: input.documentId,
    activityType: "document.completed",
    title: "Signed document completed and stored",
    sourceApp: "documents",
    metadata: {
      provider: "dropbox_sign",
      externalId: input.externalId,
      version: record.version + 1,
    },
  });

  return next;
}
