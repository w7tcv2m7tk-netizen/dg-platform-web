import type { Prisma } from "@dg/database";

import type {
  CommunicationChannel,
  CommunicationDirection,
  CommunicationSource,
  CommunicationStatus,
  ConversationSummary,
  InboxFolderId,
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
  scheduledAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toPlatformCommunication(
  row: OrgCommunicationRow,
  opts?: { includeBodyHtml?: boolean },
): PlatformCommunication {
  return {
    id: row.id,
    organisationId: row.organisationId,
    channel: row.channel as CommunicationChannel,
    direction: row.direction as CommunicationDirection,
    source: row.source as CommunicationSource,
    status: row.status as CommunicationStatus,
    subject: row.subject ?? undefined,
    bodyPreview: row.bodyPreview ?? undefined,
    ...(opts?.includeBodyHtml && row.bodyHtml ? { bodyHtml: row.bodyHtml } : {}),
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
    scheduledAt: row.scheduledAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ListOrgCommunicationsInput = {
  organisationId: string;
  channel?: string;
  source?: string;
  status?: string;
  /** When set, restrict to these statuses (e.g. Sent page). */
  statuses?: string[];
  direction?: string;
  contactId?: string;
  opportunityId?: string;
  threadKey?: string;
  /** Case-insensitive search across subject, from, to, preview */
  q?: string;
  /** Convenience filters matching History UI */
  filter?:
    | "all"
    | "email"
    | "sms"
    | "voice"
    | "automated"
    | "ai"
    | "outreach"
    | "system"
    | "mailbox"
    | "sent"
    | "scheduled"
    | "needs_reply"
    | "manual";
  limit?: number;
};

export async function listOrgCommunications(
  input: ListOrgCommunicationsInput,
): Promise<PlatformCommunication[]> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    let channel = input.channel;
    let source = input.source;
    let status = input.status;
    let statuses = input.statuses;
    let direction = input.direction;

    if (input.filter && input.filter !== "all") {
      if (input.filter === "email" || input.filter === "sms" || input.filter === "voice") {
        channel = input.filter;
      } else if (input.filter === "automated") {
        source = "automation";
      } else if (input.filter === "ai") {
        source = "ai_assist";
      } else if (input.filter === "outreach") {
        source = "prospecting";
      } else if (input.filter === "system") {
        source = "system";
      } else if (input.filter === "mailbox") {
        source = "mailbox";
      } else if (input.filter === "manual") {
        source = "manual";
      } else if (input.filter === "needs_reply") {
        direction = "inbound";
      } else if (input.filter === "sent") {
        direction = "outbound";
        channel = channel ?? "email";
        statuses = ["sent", "delivered", "failed", "opened", "bounced"];
      } else if (input.filter === "scheduled") {
        // "sending" is a transient claim state held by the flush cron; a row in
        // that state is still pending delivery and must stay visible here.
        statuses = ["scheduled", "sending"];
      }
    }

    const q = input.q?.trim();
    const rows = await prisma.orgCommunication.findMany({
      where: {
        organisationId: input.organisationId,
        deletedAt: null,
        ...(channel ? { channel } : {}),
        ...(source ? { source } : {}),
        ...(status ? { status } : {}),
        ...(statuses?.length ? { status: { in: statuses } } : {}),
        ...(direction ? { direction } : {}),
        ...(input.contactId ? { contactId: input.contactId } : {}),
        ...(input.opportunityId ? { opportunityId: input.opportunityId } : {}),
        ...(input.threadKey ? { threadKey: input.threadKey } : {}),
        ...(input.filter === "needs_reply"
          ? { status: { not: "replied" as const } }
          : {}),
        ...(q
          ? {
              OR: [
                { subject: { contains: q, mode: "insensitive" as const } },
                { fromAddress: { contains: q, mode: "insensitive" as const } },
                { bodyPreview: { contains: q, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy:
        input.filter === "scheduled" || status === "scheduled"
          ? [{ scheduledAt: "asc" as const }, { createdAt: "desc" as const }]
          : [{ sentAt: "desc" as const }, { createdAt: "desc" as const }],
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
    return row
      ? toPlatformCommunication(row as OrgCommunicationRow, { includeBodyHtml: true })
      : null;
  }, null);
}

export async function listOrgCommunicationsByThread(
  organisationId: string,
  threadKey: string,
): Promise<PlatformCommunication[]> {
  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    const rows = await prisma.orgCommunication.findMany({
      where: {
        organisationId,
        deletedAt: null,
        threadKey,
      },
      orderBy: [{ sentAt: "asc" as const }, { createdAt: "asc" as const }],
      take: 200,
    });
    return rows.map((r) =>
      toPlatformCommunication(r as OrgCommunicationRow, { includeBodyHtml: true }),
    );
  }, []);
}

function conversationKey(doc: PlatformCommunication): string {
  if (doc.threadKey?.trim()) return doc.threadKey.trim();
  if (doc.contactId) return `contact:${doc.contactId}`;
  return `message:${doc.id}`;
}

function statusLabelFor(doc: PlatformCommunication): string {
  if (doc.direction === "inbound" && doc.status !== "replied") return "Needs reply";
  if (doc.status === "scheduled") return "Scheduled";
  if (doc.status === "sending") return "Sending";
  if (doc.status === "failed" || doc.status === "bounced") return "Failed";
  if (doc.aiGenerated || doc.source === "ai_assist") return "AI";
  if (doc.source === "automation") return "Automated";
  if (doc.source === "mailbox") return doc.direction === "inbound" ? "Mailbox" : "Sent";
  if (doc.direction === "outbound") return "Sent";
  return doc.status.charAt(0).toUpperCase() + doc.status.slice(1);
}

export function groupOrgCommunicationsIntoConversations(
  docs: PlatformCommunication[],
): ConversationSummary[] {
  const groups = new Map<string, PlatformCommunication[]>();
  for (const doc of docs) {
    const key = conversationKey(doc);
    const list = groups.get(key) ?? [];
    list.push(doc);
    groups.set(key, list);
  }

  const summaries: ConversationSummary[] = [];
  for (const [key, messages] of groups) {
    const sorted = [...messages].sort((a, b) => {
      const ta = new Date(a.sentAt ?? a.createdAt).getTime();
      const tb = new Date(b.sentAt ?? b.createdAt).getTime();
      return tb - ta;
    });
    const latest = sorted[0]!;
    const chronological = [...sorted].reverse();
    const needsReply = chronological.some(
      (m) => m.direction === "inbound" && m.status !== "replied",
    );
    summaries.push({
      key,
      subject: latest.subject?.trim() || "(no subject)",
      preview: latest.bodyPreview?.trim() || "",
      channel: latest.channel,
      direction: latest.direction,
      source: latest.source,
      status: latest.status,
      statusLabel: needsReply ? "Needs reply" : statusLabelFor(latest),
      contactId: latest.contactId,
      companyId: latest.companyId,
      opportunityId: latest.opportunityId,
      fromAddress: latest.fromAddress,
      toAddresses: latest.toAddresses,
      latestAt: latest.sentAt ?? latest.createdAt,
      messageCount: messages.length,
      needsReply,
      aiGenerated: latest.aiGenerated || latest.source === "ai_assist",
      latestMessageId: latest.id,
    });
  }

  summaries.sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );
  return summaries;
}

export type ListCommunicationConversationsInput = {
  organisationId: string;
  folder?: InboxFolderId;
  q?: string;
  limit?: number;
};

export async function listCommunicationConversations(
  input: ListCommunicationConversationsInput,
): Promise<ConversationSummary[]> {
  const folder = input.folder ?? "all";
  const filterMap: Record<InboxFolderId, ListOrgCommunicationsInput["filter"]> = {
    all: "all",
    needs_reply: "needs_reply",
    email: "email",
    manual: "manual",
    automated: "automated",
    ai: "ai",
    mailbox: "mailbox",
  };

  const docs = await listOrgCommunications({
    organisationId: input.organisationId,
    filter: filterMap[folder],
    q: input.q,
    limit: Math.min(input.limit ?? 150, 200),
  });

  const conversations = groupOrgCommunicationsIntoConversations(docs);

  // Enrich contact names (capped)
  const contactIds = [
    ...new Set(conversations.map((c) => c.contactId).filter(Boolean) as string[]),
  ].slice(0, 50);
  if (contactIds.length === 0) return conversations;

  try {
    const { getContactsByIds } = await import("../contacts");
    const contacts = await getContactsByIds(input.organisationId, contactIds);
    const byId = new Map(contacts.map((c) => [c.id, c]));
    for (const conv of conversations) {
      if (!conv.contactId) continue;
      const contact = byId.get(conv.contactId);
      if (!contact) continue;
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
      conv.contactName = name || contact.email || undefined;
      // companyName left for later company batch if needed
    }
  } catch {
    /* contacts optional */
  }

  return conversations;
}

export async function getConversationMessages(
  organisationId: string,
  conversationKey: string,
): Promise<PlatformCommunication[]> {
  if (conversationKey.startsWith("message:")) {
    const id = conversationKey.slice("message:".length);
    const one = await getOrgCommunication(organisationId, id);
    return one ? [one] : [];
  }
  if (conversationKey.startsWith("contact:")) {
    const contactId = conversationKey.slice("contact:".length);
    const docs = await listOrgCommunications({
      organisationId,
      contactId,
      limit: 100,
    });
    // Include bodyHtml for each via get — for Phase 1 re-fetch by thread isn't available;
    // reload with includeBodyHtml by querying prisma directly for contact messages.
    return emptyIfUnmigrated(async () => {
      const { prisma } = await import("@dg/database");
      const rows = await prisma.orgCommunication.findMany({
        where: { organisationId, contactId, deletedAt: null, threadKey: null },
        orderBy: [{ sentAt: "asc" as const }, { createdAt: "asc" as const }],
        take: 100,
      });
      return rows.map((r) =>
        toPlatformCommunication(r as OrgCommunicationRow, { includeBodyHtml: true }),
      );
    }, docs);
  }
  // threadKey
  return listOrgCommunicationsByThread(organisationId, conversationKey);
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
  scheduledAt?: Date | null;
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
        scheduledAt: input.scheduledAt ?? null,
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

function resolveOutboundProvenance(input: {
  source?: CommunicationSource;
  whySent?: string;
  metadata?: Record<string, unknown>;
}): { source: CommunicationSource; whySent?: string } {
  const purpose =
    typeof input.metadata?.purpose === "string" ? input.metadata.purpose : "";
  let source = input.source ?? "manual";
  let whySent = input.whySent;

  if (
    !input.source &&
    (purpose.startsWith("founding_10_") || purpose.startsWith("platform_referral_"))
  ) {
    source = "system";
  }
  if (!whySent && purpose) {
    if (purpose.startsWith("founding_10_")) {
      whySent = `Founding programme email (${purpose})`;
    } else if (purpose.startsWith("platform_referral_")) {
      whySent = `Platform referral email (${purpose})`;
    }
  }
  return { source, whySent };
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
  scheduledAt?: Date | null;
}): Promise<PlatformCommunication | null> {
  const provenance = resolveOutboundProvenance(input);
  const status: CommunicationStatus =
    input.status === "sent"
      ? "sent"
      : input.status === "failed"
        ? "failed"
        : "scheduled";

  const record = await createOrgCommunication({
    organisationId: input.organisationId,
    channel: "email",
    direction: "outbound",
    source: provenance.source,
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
    whySent: provenance.whySent,
    sentBy: input.sentBy,
    aiGenerated: input.aiGenerated ?? false,
    metadata: input.metadata,
    sentAt: input.status === "sent" ? new Date() : null,
    scheduledAt: input.scheduledAt ?? null,
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

/** Queue an outbound email for later send (no Resend call until due). */
export async function scheduleOutboundEmail(input: {
  organisationId: string;
  to: string;
  subject?: string;
  body: string;
  scheduledAt: Date;
  contactId?: string;
  opportunityId?: string;
  companyId?: string;
  sentBy?: string;
  source?: CommunicationSource;
  whySent?: string;
  metadata?: Record<string, unknown>;
}): Promise<PlatformCommunication | null> {
  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new Error("scheduledAt must be a valid date");
  }
  if (input.scheduledAt.getTime() <= Date.now()) {
    throw new Error("scheduledAt must be in the future");
  }

  return createOrgCommunication({
    organisationId: input.organisationId,
    channel: "email",
    direction: "outbound",
    source: input.source ?? "manual",
    status: "scheduled",
    subject: input.subject,
    bodyPreview: input.body,
    bodyHtml: undefined,
    toAddresses: [input.to],
    contactId: input.contactId,
    companyId: input.companyId,
    opportunityId: input.opportunityId,
    provider: "resend",
    whySent: input.whySent ?? "Scheduled send from Communications",
    sentBy: input.sentBy,
    metadata: {
      ...(input.metadata ?? {}),
      bodyFull: input.body,
    },
    scheduledAt: input.scheduledAt,
  });
}

/**
 * Flush due scheduled OrgCommunication emails via sendMessage.
 * Soft-fails when the table is missing.
 */
/**
 * How long a `sending` claim may be held before it is treated as abandoned.
 * Must exceed the longest possible flush; the cron has no maxDuration override
 * so this is deliberately generous.
 */
const STALE_SEND_CLAIM_MS = 15 * 60 * 1000;

export async function processDueScheduledEmails(input?: {
  limit?: number;
  organisationId?: string;
}): Promise<{ processed: number; sent: number; failed: number }> {
  const limit = Math.min(input?.limit ?? 25, 100);
  const empty = { processed: 0, sent: 0, failed: 0 };

  return emptyIfUnmigrated(async () => {
    const { prisma } = await import("@dg/database");
    const { sendMessage } = await import("../communications");

    // A worker that claims a row and then dies leaves it in `sending`.
    // `updatedAt` is bumped by the claim, so it doubles as the claim timestamp:
    // anything still `sending` well beyond the longest possible run is a crash
    // and is safe to reclaim. No extra column needed.
    const staleBefore = new Date(Date.now() - STALE_SEND_CLAIM_MS);

    const due = await prisma.orgCommunication.findMany({
      where: {
        deletedAt: null,
        channel: "email",
        scheduledAt: { lte: new Date() },
        ...(input?.organisationId ? { organisationId: input.organisationId } : {}),
        OR: [
          { status: "scheduled" },
          { status: "sending", updatedAt: { lt: staleBefore } },
        ],
      },
      orderBy: { scheduledAt: "asc" },
      take: limit,
    });

    let sent = 0;
    let failed = 0;

    for (const row of due) {
      // Atomically claim before sending. Two concurrent cron invocations (or a
      // cron overlapping the Scheduled page flush) previously both selected the
      // same `scheduled` row and both sent it. The conditional updateMany only
      // succeeds for the worker that flips it out of `scheduled`, so exactly one
      // sends. `sending` is a transient state; a crash leaves it there rather
      // than silently re-sending, and it is recoverable (see below).
      const claim = await prisma.orgCommunication.updateMany({
        where: {
          id: row.id,
          OR: [
            { status: "scheduled" },
            { status: "sending", updatedAt: { lt: staleBefore } },
          ],
        },
        data: { status: "sending" },
      });
      if (claim.count === 0) continue;

      const meta = (row.metadata as Record<string, unknown> | null) ?? {};
      const body =
        (typeof meta.bodyFull === "string" && meta.bodyFull) ||
        row.bodyPreview ||
        "";
      const to = row.toAddresses[0];
      if (!to || !body.trim()) {
        await prisma.orgCommunication.update({
          where: { id: row.id },
          data: { status: "failed", whySent: row.whySent ?? "Missing to/body" },
        });
        failed += 1;
        continue;
      }

      try {
        const result = await sendMessage({
          organisationId: row.organisationId,
          channel: "email",
          to,
          subject: row.subject ?? undefined,
          body,
          contactId: row.contactId ?? undefined,
          metadata: {
            ...meta,
            source: row.source,
            whySent: row.whySent ?? "Scheduled send flushed",
            opportunityId: row.opportunityId ?? undefined,
            companyId: row.companyId ?? undefined,
            sentBy: row.sentBy ?? undefined,
            scheduledCommunicationId: row.id,
            // Avoid double-recording a second OrgCommunication for the flush
            skipOrgCommunicationRecord: true,
          },
        });

        await prisma.orgCommunication.update({
          where: { id: row.id },
          data: {
            status: result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "sent",
            sentAt: new Date(),
            externalId: result.id,
            provider: result.provider,
            scheduledAt: null,
          },
        });
        if (result.status === "failed") failed += 1;
        else sent += 1;
      } catch (err) {
        console.warn("[communications] scheduled flush failed", row.id, err);
        await prisma.orgCommunication.update({
          where: { id: row.id },
          data: { status: "failed" },
        });
        failed += 1;
      }
    }

    return { processed: due.length, sent, failed };
  }, empty);
}
