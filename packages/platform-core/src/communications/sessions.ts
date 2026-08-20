import type { Prisma } from "@dg/database";

import { createActivity } from "../activities";
import { writeAuditLog } from "../audit";
import { emptyIfUnmigrated } from "./db";
import type {
  SerializedAgentAction,
  SerializedCommunicationMessage,
  SerializedCommunicationSession,
} from "./providers/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function serializeSession(row: {
  id: string;
  organisationId: string;
  agentId: string | null;
  contactId: string | null;
  companyId: string | null;
  opportunityId: string | null;
  channel: string;
  direction: string;
  provider: string;
  providerSessionId: string | null;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
  transcript: string | null;
  summary: string | null;
  sentiment: string | null;
  outcome: string | null;
  recordingUrl: string | null;
  costCents: number | null;
  callerPhone: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  agent?: { name: string } | null;
}): SerializedCommunicationSession {
  return {
    id: row.id,
    organisationId: row.organisationId,
    agentId: row.agentId,
    agentName: row.agent?.name ?? null,
    contactId: row.contactId,
    companyId: row.companyId,
    opportunityId: row.opportunityId,
    channel: row.channel,
    direction: row.direction,
    provider: row.provider,
    providerSessionId: row.providerSessionId,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    durationSeconds: row.durationSeconds,
    transcript: row.transcript,
    summary: row.summary,
    sentiment: row.sentiment,
    outcome: row.outcome,
    recordingUrl: row.recordingUrl,
    costCents: row.costCents,
    callerPhone: row.callerPhone,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ListSessionsFilter = {
  organisationId: string;
  agentId?: string;
  status?: string;
  direction?: string;
  outcome?: string;
  contactId?: string;
  opportunityId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export async function listCommunicationSessions(filter: ListSessionsFilter) {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(filter.limit ?? 50, 100);
  const offset = filter.offset ?? 0;

  return emptyIfUnmigrated(async () => {
    const where: Prisma.CommunicationSessionWhereInput = {
      organisationId: filter.organisationId,
      ...(filter.agentId ? { agentId: filter.agentId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.direction ? { direction: filter.direction } : {}),
      ...(filter.outcome ? { outcome: filter.outcome } : {}),
      ...(filter.contactId ? { contactId: filter.contactId } : {}),
      ...(filter.opportunityId ? { opportunityId: filter.opportunityId } : {}),
      ...(filter.from || filter.to
        ? {
            startedAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lte: filter.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.communicationSession.findMany({
        where,
        include: { agent: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.communicationSession.count({ where }),
    ]);

    return {
      items: items.map(serializeSession),
      meta: { total, limit, offset },
    };
  }, { items: [] as SerializedCommunicationSession[], meta: { total: 0, limit, offset } });
}

export async function getCommunicationSession(organisationId: string, sessionId: string) {
  const { prisma } = await import("@dg/database");
  return emptyIfUnmigrated(async () => {
    const row = await prisma.communicationSession.findFirst({
      where: { organisationId, id: sessionId },
      include: { agent: { select: { name: true } } },
    });
    return row ? serializeSession(row) : null;
  }, null);
}

export async function listSessionMessages(organisationId: string, sessionId: string) {
  const { prisma } = await import("@dg/database");
  return emptyIfUnmigrated(async () => {
    const session = await prisma.communicationSession.findFirst({
      where: { organisationId, id: sessionId },
      select: { id: true },
    });
    if (!session) return [] as SerializedCommunicationMessage[];
    const rows = await prisma.communicationMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      sender: row.sender,
      recipient: row.recipient,
      direction: row.direction,
      channel: row.channel,
      content: row.content,
      timestamp: row.timestamp.toISOString(),
      status: row.status,
    }));
  }, [] as SerializedCommunicationMessage[]);
}

export async function listSessionActions(organisationId: string, sessionId: string) {
  const { prisma } = await import("@dg/database");
  return emptyIfUnmigrated(async () => {
    const rows = await prisma.agentAction.findMany({
      where: { organisationId, sessionId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.sessionId,
      agentId: row.agentId,
      tool: row.tool,
      status: row.status,
      input: asRecord(row.input),
      output: asRecord(row.output),
      entityType: row.entityType,
      entityId: row.entityId,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
    })) satisfies SerializedAgentAction[];
  }, [] as SerializedAgentAction[]);
}

export async function upsertCommunicationSession(input: {
  organisationId: string;
  agentId?: string | null;
  provider: string;
  providerSessionId: string;
  contactId?: string | null;
  companyId?: string | null;
  opportunityId?: string | null;
  channel?: string;
  direction?: string;
  status?: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  durationSeconds?: number | null;
  transcript?: string | null;
  summary?: string | null;
  sentiment?: string | null;
  outcome?: string | null;
  recordingUrl?: string | null;
  costCents?: number | null;
  usageUnits?: number | null;
  callerPhone?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.communicationSession.findFirst({
    where: {
      organisationId: input.organisationId,
      provider: input.provider,
      providerSessionId: input.providerSessionId,
    },
  });

  const data = {
    agentId: input.agentId ?? undefined,
    contactId: input.contactId === undefined ? undefined : input.contactId,
    companyId: input.companyId === undefined ? undefined : input.companyId,
    opportunityId: input.opportunityId === undefined ? undefined : input.opportunityId,
    channel: input.channel ?? undefined,
    direction: input.direction ?? undefined,
    status: input.status ?? undefined,
    startedAt: input.startedAt === undefined ? undefined : input.startedAt,
    endedAt: input.endedAt === undefined ? undefined : input.endedAt,
    durationSeconds: input.durationSeconds === undefined ? undefined : input.durationSeconds,
    transcript: input.transcript === undefined ? undefined : input.transcript,
    summary: input.summary === undefined ? undefined : input.summary,
    sentiment: input.sentiment === undefined ? undefined : input.sentiment,
    outcome: input.outcome === undefined ? undefined : input.outcome,
    recordingUrl: input.recordingUrl === undefined ? undefined : input.recordingUrl,
    costCents: input.costCents === undefined ? undefined : input.costCents,
    usageUnits: input.usageUnits === undefined ? undefined : input.usageUnits,
    callerPhone: input.callerPhone === undefined ? undefined : input.callerPhone,
    metadata:
      input.metadata === undefined
        ? undefined
        : ((input.metadata ?? undefined) as Prisma.InputJsonValue | undefined),
  };

  const row = existing
    ? await prisma.communicationSession.update({ where: { id: existing.id }, data })
    : await prisma.communicationSession.create({
        data: {
          organisationId: input.organisationId,
          provider: input.provider,
          providerSessionId: input.providerSessionId,
          agentId: input.agentId ?? null,
          contactId: input.contactId ?? null,
          companyId: input.companyId ?? null,
          opportunityId: input.opportunityId ?? null,
          channel: input.channel ?? "voice",
          direction: input.direction ?? "inbound",
          status: input.status ?? "in_progress",
          startedAt: input.startedAt ?? new Date(),
          endedAt: input.endedAt ?? null,
          durationSeconds: input.durationSeconds ?? null,
          transcript: input.transcript ?? null,
          summary: input.summary ?? null,
          sentiment: input.sentiment ?? null,
          outcome: input.outcome ?? null,
          recordingUrl: input.recordingUrl ?? null,
          costCents: input.costCents ?? null,
          usageUnits: input.usageUnits ?? null,
          callerPhone: input.callerPhone ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });

  return serializeSession({ ...row, agent: null });
}

export async function replaceSessionMessages(input: {
  organisationId: string;
  sessionId: string;
  channel: string;
  messages: Array<{ role: string; content: string; timestamp?: Date }>;
}) {
  const { prisma } = await import("@dg/database");
  await prisma.communicationMessage.deleteMany({ where: { sessionId: input.sessionId } });
  if (!input.messages.length) return;
  await prisma.communicationMessage.createMany({
    data: input.messages.map((msg) => ({
      organisationId: input.organisationId,
      sessionId: input.sessionId,
      sender: msg.role,
      direction: msg.role === "agent" || msg.role === "assistant" ? "outbound" : "inbound",
      channel: input.channel,
      content: msg.content,
      timestamp: msg.timestamp ?? new Date(),
      status: "delivered",
    })),
  });
}

export async function recordCommunicationUsage(input: {
  organisationId: string;
  agentId?: string | null;
  sessionId?: string | null;
  provider: string;
  metric: string;
  units: number;
  providerCostCents?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const { prisma } = await import("@dg/database");
  await emptyIfUnmigrated(async () => {
    await prisma.communicationUsage.create({
      data: {
        organisationId: input.organisationId,
        agentId: input.agentId ?? null,
        sessionId: input.sessionId ?? null,
        provider: input.provider,
        metric: input.metric,
        units: input.units,
        providerCostCents: input.providerCostCents ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }, undefined);
}

export async function logSessionActivity(input: {
  organisationId: string;
  sessionId: string;
  contactId?: string | null;
  title: string;
  body?: string;
}) {
  await createActivity({
    organisationId: input.organisationId,
    entityType: input.contactId ? "Contact" : "CommunicationSession",
    entityId: input.contactId || input.sessionId,
    activityType: "ai_call",
    title: input.title,
    body: input.body,
    sourceApp: "ai-communications",
    metadata: { sessionId: input.sessionId },
  });
}

export async function auditCommunication(input: {
  organisationId: string;
  actorId?: string;
  actorType?: "user" | "system" | "connector";
  action: "create" | "update" | "delete";
  entityType: string;
  entityId: string;
  changes?: Prisma.InputJsonValue;
}) {
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    actorType: input.actorType ?? "system",
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    changes: input.changes,
  });
}
