import type { Prisma } from "@dg/database";

import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationSource,
  CommunicationStatus,
  PlatformCommunication,
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
    /orgCommunication is not a function/i.test(message)
  );
}

async function emptyIfUnmigrated<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isMissingRelationError(err)) {
      console.warn(
        "[communications] org_communications unavailable — run prisma db push",
        err instanceof Error ? err.message : err,
      );
      return fallback;
    }
    throw err;
  }
}

type OrgCommunicationRow = {
  id: string;
  organisationId: string;
  channel: string;
  direction: string;
  source: string;
  status: string;
  subject: string | null;
  bodyPreview: string | null;
  bodyHtml: string | null;
  fromAddress: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  contactId: string | null;
  companyId: string | null;
  opportunityId: string | null;
  taskId: string | null;
  threadKey: string | null;
  provider: string;
  externalId: string | null;
  whySent: string | null;
  triggerRule: string | null;
  approvedBy: string | null;
  sentBy: string | null;
  aiGenerated: boolean;
  metadata: Prisma.JsonValue | null;
  sentAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPlatformCommunication(row: OrgCommunicationRow): PlatformCommunication {
  return {
    id: row.id,
    organisationId: row.organisationId,
    channel: row.channel as CommunicationChannel,
    direction: row.direction as CommunicationDirection,
    source: row.source as CommunicationSource,
    status: row.status as CommunicationStatus,
    subject: row.subject ?? undefined,
    bodyPreview: row.bodyPreview ?? undefined,
    fromAddress: row.fromAddress ?? undefined,
    toAddresses: row.toAddresses ?? [],
    ccAddresses: row.ccAddresses ?? [],
    contactId: row.contactId ?? undefined,
    companyId: row.companyId ?? undefined,
    opportunityId: row.opportunityId ?? undefined,
    taskId: row.taskId ?? undefined,
    threadKey: row.threadKey ?? undefined,
    provider: row.provider,
    externalId: row.externalId ?? undefined,
    whySent: row.whySent ?? undefined,
    triggerRule: row.triggerRule ?? undefined,
    approvedBy: row.approvedBy ?? undefined,
    sentBy: row.sentBy ?? undefined,
    aiGenerated: row.aiGenerated,
    sentAt: row.sentAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ListOrgCommunicationsInput = {
  organisationId: string;
  channel?: string;
  source?: string;
  status?: string;
  contactId?: string;
  opportunityId?: string;
  /** Convenience filters matching History UI */
  filter?: "all" | "email" | "sms" | "voice" | "automated" | "ai" | "outreach";
  limit?: number;
};

export async function listOrgCommunications(
  input: ListOrgCommunicationsInput,
): Promise<PlatformCommunication[]> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    let channel = input.channel;
    let source = input.source;
    if (input.filter && input.filter !== "all") {
      if (input.filter === "email" || input.filter === "sms" || input.filter === "voice") {
        channel = input.filter;
      } else if (input.filter === "automated") {
        source = "automation";
      } else if (input.filter === "ai") {
        source = "ai_assist";
      } else if (input.filter === "outreach") {
        source = "prospecting";
      }
    }

    const rows = await prisma.orgCommunication.findMany({
      where: {
        organisationId: input.organisationId,
        deletedAt: null,
        ...(channel ? { channel } : {}),
        ...(source ? { source } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.contactId ? { contactId: input.contactId } : {}),
        ...(input.opportunityId ? { opportunityId: input.opportunityId } : {}),
      },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take: Math.min(input.limit ?? 100, 200),
    });
    return rows.map((r) => toPlatformCommunication(r as OrgCommunicationRow));
  }, []);
}

export async function getOrgCommunication(
  organisationId: string,
  id: string,
): Promise<PlatformCommunication | null> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    const row = await prisma.orgCommunication.findFirst({
      where: { id, organisationId, deletedAt: null },
    });
    return row ? toPlatformCommunication(row as OrgCommunicationRow) : null;
  }, null);
}

export type CreateOrgCommunicationInput = {
  organisationId: string;
  channel?: CommunicationChannel;
  direction?: CommunicationDirection;
  source?: CommunicationSource;
  status?: CommunicationStatus;
  subject?: string;
  bodyPreview?: string;
  bodyHtml?: string;
  fromAddress?: string;
  toAddresses: string[];
  ccAddresses?: string[];
  contactId?: string;
  companyId?: string;
  opportunityId?: string;
  taskId?: string;
  threadKey?: string;
  provider?: string;
  externalId?: string;
  whySent?: string;
  triggerRule?: string;
  approvedBy?: string;
  sentBy?: string;
  aiGenerated?: boolean;
  metadata?: Record<string, unknown>;
  sentAt?: Date | null;
};

export async function createOrgCommunication(
  input: CreateOrgCommunicationInput,
): Promise<PlatformCommunication | null> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    const created = await prisma.orgCommunication.create({
      data: {
        organisationId: input.organisationId,
        channel: input.channel ?? "email",
        direction: input.direction ?? "outbound",
        source: input.source ?? "manual",
        status: input.status ?? "draft",
        subject: input.subject ?? null,
        bodyPreview: input.bodyPreview?.slice(0, 4000) ?? null,
        bodyHtml: input.bodyHtml ?? null,
        fromAddress: input.fromAddress ?? null,
        toAddresses: input.toAddresses,
        ccAddresses: input.ccAddresses ?? [],
        contactId: input.contactId ?? null,
        companyId: input.companyId ?? null,
        opportunityId: input.opportunityId ?? null,
        taskId: input.taskId ?? null,
        threadKey: input.threadKey ?? null,
        provider: input.provider ?? "resend",
        externalId: input.externalId ?? null,
        whySent: input.whySent ?? null,
        triggerRule: input.triggerRule ?? null,
        approvedBy: input.approvedBy ?? null,
        sentBy: input.sentBy ?? null,
        aiGenerated: input.aiGenerated ?? false,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        sentAt: input.sentAt ?? null,
      },
    });
    return toPlatformCommunication(created as OrgCommunicationRow);
  }, null);
}

export async function summarizeOrgCommunications(organisationId: string): Promise<{
  total: number;
  byChannel: Record<string, number>;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const empty = {
    total: 0,
    byChannel: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
  };
  return emptyIfUnmigrated(async () => {
    const docs = await listOrgCommunications({ organisationId, limit: 200 });
    const byChannel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const d of docs) {
      byChannel[d.channel] = (byChannel[d.channel] ?? 0) + 1;
      byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;
      bySource[d.source] = (bySource[d.source] ?? 0) + 1;
    }
    return { total: docs.length, byChannel, byStatus, bySource };
  }, empty);
}

/**
 * Persist a sent/failed email as Core Communication + Contact Activity when linked.
 */
export async function recordOutboundEmail(input: {
  organisationId: string;
  to: string;
  subject?: string;
  body: string;
  status: "sent" | "failed" | "queued";
  messageId: string;
  provider: string;
  contactId?: string;
  opportunityId?: string;
  companyId?: string;
  sentBy?: string;
  fromAddress?: string;
  source?: CommunicationSource;
  whySent?: string;
  aiGenerated?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<PlatformCommunication | null> {
  const status: CommunicationStatus =
    input.status === "sent" ? "sent" : input.status === "failed" ? "failed" : "scheduled";

  const record = await createOrgCommunication({
    organisationId: input.organisationId,
    channel: "email",
    direction: "outbound",
    source: input.source ?? "manual",
    status,
    subject: input.subject,
    bodyPreview: input.body,
    fromAddress: input.fromAddress,
    toAddresses: [input.to],
    contactId: input.contactId,
    companyId: input.companyId,
    opportunityId: input.opportunityId,
    provider: input.provider,
    externalId: input.messageId,
    whySent: input.whySent,
    sentBy: input.sentBy,
    aiGenerated: input.aiGenerated ?? false,
    metadata: input.metadata,
    sentAt: input.status === "sent" ? new Date() : null,
  });

  if (input.contactId) {
    try {
      const { createActivity } = await import("../activities");
      await createActivity({
        organisationId: input.organisationId,
        entityType: "Contact",
        entityId: input.contactId,
        activityType:
          input.status === "sent"
            ? "email_sent"
            : input.status === "failed"
              ? "email_failed"
              : "email_queued",
        title:
          input.status === "sent"
            ? `Email sent: ${input.subject || "(no subject)"}`
            : input.status === "failed"
              ? `Email failed: ${input.subject || "(no subject)"}`
              : `Email queued: ${input.subject || "(no subject)"}`,
        body: input.body.slice(0, 2000),
        sourceApp: "communications",
        actorId: input.sentBy,
        metadata: {
          communicationId: record?.id,
          to: input.to,
          subject: input.subject,
          provider: input.provider,
          messageId: input.messageId,
          status: input.status,
        },
      });
    } catch (err) {
      console.warn("[communications] Contact activity write failed", err);
    }
  }

  return record;
}
