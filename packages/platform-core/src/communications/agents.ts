import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { emptyIfUnmigrated } from "./db";
import { compileAgentSystemPrompt, getAuthorisedAgentContext } from "./context";
import { defaultVoiceProviderId, getCommunicationProvider } from "./providers/router";
import type {
  AgentBuilderConfig,
  AgentToolName,
  BusinessHours,
  CommunicationAgentStatus,
  SerializedCommunicationAgent,
} from "./providers/types";

const DEFAULT_TOOLS: AgentToolName[] = [
  "get_business_profile",
  "get_business_hours",
  "search_contact",
  "create_contact",
  "create_task",
];

function asConfig(value: unknown): AgentBuilderConfig {
  return value && typeof value === "object" ? (value as AgentBuilderConfig) : {};
}

function asHours(value: unknown): BusinessHours | null {
  return value && typeof value === "object" ? (value as BusinessHours) : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asChannels(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return ["voice"];
}

function serializeAgent(row: {
  id: string;
  organisationId: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  provider: string;
  providerAgentId: string | null;
  voiceId: string | null;
  model: string | null;
  systemPrompt: string | null;
  greeting: string | null;
  language: string;
  timezone: string;
  businessHours: unknown;
  enabledChannels: unknown;
  knowledgeBaseId: string | null;
  routingRules: unknown;
  transferRules: unknown;
  escalationRules: unknown;
  config: unknown;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedCommunicationAgent {
  return {
    id: row.id,
    organisationId: row.organisationId,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status as CommunicationAgentStatus,
    provider: row.provider,
    providerAgentId: row.providerAgentId,
    voiceId: row.voiceId,
    model: row.model,
    systemPrompt: row.systemPrompt,
    greeting: row.greeting,
    language: row.language,
    timezone: row.timezone,
    businessHours: asHours(row.businessHours),
    enabledChannels: asChannels(row.enabledChannels),
    knowledgeBaseId: row.knowledgeBaseId,
    routingRules: asRecord(row.routingRules),
    transferRules: asRecord(row.transferRules),
    escalationRules: asRecord(row.escalationRules),
    config: asConfig(row.config),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listCommunicationAgents(organisationId: string) {
  const { prisma } = await import("@dg/database");
  return emptyIfUnmigrated(async () => {
    const rows = await prisma.communicationAgent.findMany({
      where: { organisationId },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map(serializeAgent);
  }, [] as SerializedCommunicationAgent[]);
}

export async function getCommunicationAgent(organisationId: string, agentId: string) {
  const { prisma } = await import("@dg/database");
  return emptyIfUnmigrated(async () => {
    const row = await prisma.communicationAgent.findFirst({
      where: { organisationId, id: agentId },
    });
    return row ? serializeAgent(row) : null;
  }, null);
}

export async function findAgentByProviderId(provider: string, providerAgentId: string) {
  const { prisma } = await import("@dg/database");
  return emptyIfUnmigrated(async () => {
    const row = await prisma.communicationAgent.findFirst({
      where: { provider, providerAgentId },
    });
    return row ? serializeAgent(row) : null;
  }, null);
}

export type UpsertCommunicationAgentInput = {
  organisationId: string;
  actorId?: string;
  name: string;
  description?: string | null;
  type?: string;
  voiceId?: string | null;
  model?: string | null;
  greeting?: string | null;
  language?: string;
  timezone?: string;
  systemPrompt?: string | null;
  businessHours?: BusinessHours | null;
  enabledChannels?: string[];
  knowledgeBaseId?: string | null;
  routingRules?: Record<string, unknown> | null;
  transferRules?: Record<string, unknown> | null;
  escalationRules?: Record<string, unknown> | null;
  config?: AgentBuilderConfig;
  provider?: string;
};

export async function createCommunicationAgent(input: UpsertCommunicationAgentInput) {
  const { prisma } = await import("@dg/database");
  const config: AgentBuilderConfig = {
    enabledTools: DEFAULT_TOOLS,
    recordingConsent: true,
    fallback: "transfer",
    ...input.config,
  };
  const row = await prisma.communicationAgent.create({
    data: {
      organisationId: input.organisationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type?.trim() || "receptionist",
      status: "draft",
      provider: input.provider || defaultVoiceProviderId(),
      voiceId: input.voiceId || null,
      model: input.model || null,
      greeting: input.greeting?.trim() || "Hello, how can I help you today?",
      language: input.language || "en-AU",
      timezone: input.timezone || "Australia/Brisbane",
      systemPrompt: input.systemPrompt?.trim() || null,
      businessHours: (input.businessHours ?? undefined) as Prisma.InputJsonValue | undefined,
      enabledChannels: (input.enabledChannels ?? ["voice"]) as Prisma.InputJsonValue,
      knowledgeBaseId: input.knowledgeBaseId || null,
      routingRules: (input.routingRules ?? undefined) as Prisma.InputJsonValue | undefined,
      transferRules: (input.transferRules ?? undefined) as Prisma.InputJsonValue | undefined,
      escalationRules: (input.escalationRules ?? undefined) as Prisma.InputJsonValue | undefined,
      config: config as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "create",
    entityType: "CommunicationAgent",
    entityId: row.id,
    changes: { name: row.name, type: row.type },
  });

  return serializeAgent(row);
}

export async function updateCommunicationAgent(
  organisationId: string,
  agentId: string,
  input: Partial<UpsertCommunicationAgentInput> & { actorId?: string },
) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.communicationAgent.findFirst({
    where: { organisationId, id: agentId },
  });
  if (!existing) return null;

  const nextConfig = {
    ...asConfig(existing.config),
    ...input.config,
  };

  const row = await prisma.communicationAgent.update({
    where: { id: agentId },
    data: {
      name: input.name?.trim() ?? undefined,
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      type: input.type?.trim() ?? undefined,
      voiceId: input.voiceId === undefined ? undefined : input.voiceId,
      model: input.model === undefined ? undefined : input.model,
      greeting: input.greeting === undefined ? undefined : input.greeting?.trim() || null,
      language: input.language ?? undefined,
      timezone: input.timezone ?? undefined,
      systemPrompt:
        input.systemPrompt === undefined ? undefined : input.systemPrompt?.trim() || null,
      businessHours:
        input.businessHours === undefined
          ? undefined
          : ((input.businessHours ?? null) as Prisma.InputJsonValue),
      enabledChannels: input.enabledChannels
        ? (input.enabledChannels as Prisma.InputJsonValue)
        : undefined,
      knowledgeBaseId:
        input.knowledgeBaseId === undefined ? undefined : input.knowledgeBaseId || null,
      routingRules:
        input.routingRules === undefined
          ? undefined
          : ((input.routingRules ?? null) as Prisma.InputJsonValue),
      transferRules:
        input.transferRules === undefined
          ? undefined
          : ((input.transferRules ?? null) as Prisma.InputJsonValue),
      escalationRules:
        input.escalationRules === undefined
          ? undefined
          : ((input.escalationRules ?? null) as Prisma.InputJsonValue),
      config: input.config ? (nextConfig as Prisma.InputJsonValue) : undefined,
      status: existing.status === "published" ? "published" : existing.status,
    },
  });

  await writeAuditLog({
    organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "CommunicationAgent",
    entityId: row.id,
    changes: { name: row.name },
  });

  return serializeAgent(row);
}

export async function setCommunicationAgentStatus(input: {
  organisationId: string;
  agentId: string;
  status: CommunicationAgentStatus;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.communicationAgent.findFirst({
    where: { organisationId: input.organisationId, id: input.agentId },
  });
  if (!existing) return null;
  const row = await prisma.communicationAgent.update({
    where: { id: input.agentId },
    data: { status: input.status },
  });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "CommunicationAgent",
    entityId: row.id,
    changes: { status: input.status },
  });
  return serializeAgent(row);
}

export async function deleteCommunicationAgent(input: {
  organisationId: string;
  agentId: string;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.communicationAgent.findFirst({
    where: { organisationId: input.organisationId, id: input.agentId },
  });
  if (!existing) return false;

  if (existing.providerAgentId) {
    try {
      await getCommunicationProvider(existing.provider).deleteAgent({
        provider: existing.provider,
        providerAgentId: existing.providerAgentId,
      });
    } catch (err) {
      console.warn("[communications] provider deleteAgent failed", err);
    }
  }

  await prisma.communicationAgent.delete({ where: { id: existing.id } });
  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "delete",
    entityType: "CommunicationAgent",
    entityId: existing.id,
    changes: { name: existing.name },
  });
  return true;
}

export function toolWebhookUrl(): string {
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au"
  ).replace(/\/$/, "");
  return `${origin}/api/webhooks/elevenlabs/tools`;
}

export async function publishCommunicationAgent(input: {
  organisationId: string;
  agentId: string;
  actorId?: string;
}) {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.communicationAgent.findFirst({
    where: { organisationId: input.organisationId, id: input.agentId },
  });
  if (!existing) return null;

  const config = asConfig(existing.config);
  const businessContext = await getAuthorisedAgentContext(input.organisationId);
  const systemPrompt = compileAgentSystemPrompt({
    name: existing.name,
    type: existing.type,
    description: existing.description,
    greeting: existing.greeting,
    language: existing.language,
    timezone: existing.timezone,
    config,
    businessContext,
    extraPrompt: existing.systemPrompt,
  });

  const provider = getCommunicationProvider(existing.provider);
  const toolNames = config.enabledTools?.length ? config.enabledTools : DEFAULT_TOOLS;
  const tools = toolNames.map((name) => ({
    name,
    description: `DigitalGate tool: ${name.replace(/_/g, " ")}`,
    url: toolWebhookUrl(),
    method: "POST" as const,
  }));

  const payload = {
    name: existing.name,
    description: existing.description,
    greeting: existing.greeting,
    systemPrompt,
    language: existing.language,
    voiceId: existing.voiceId,
    model: existing.model,
    timezone: existing.timezone,
    tools,
  };

  const ref = existing.providerAgentId
    ? await provider.updateAgent(
        { provider: existing.provider, providerAgentId: existing.providerAgentId },
        payload,
      )
    : await provider.createAgent(payload);

  const row = await prisma.communicationAgent.update({
    where: { id: existing.id },
    data: {
      status: "published",
      provider: ref.provider,
      providerAgentId: ref.providerAgentId,
      systemPrompt,
      publishedAt: new Date(),
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "CommunicationAgent",
    entityId: row.id,
    changes: { status: "published", providerAgentId: ref.providerAgentId },
  });

  return serializeAgent(row);
}
