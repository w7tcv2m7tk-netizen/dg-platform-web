import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@dg/database";

export const AIDA_CONVERSATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type AidaChatRole = "user" | "assistant";

export type AidaChatMessage = {
  id: string;
  role: AidaChatRole;
  content: string;
  createdAt: string;
  quickActionId?: string;
};

export type AidaVisitorContext = {
  businessType?: string;
  facts: string[];
  opportunities: string[];
  intent?: "exploring" | "qualified" | "high_intent" | "human_requested";
};

export type AidaConversationRecord = {
  id: string;
  organisationId: string;
  status: string;
  messages: AidaChatMessage[];
  visitorContext: AidaVisitorContext;
  contactId: string | null;
  leadId: string | null;
  pageSlug: string | null;
  expiresAt: Date;
};

export function hashAidaToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Tenant + expiry gate. Never return another organisation’s conversation. */
export function aidaRowVisibleToOrganisation(
  row: { organisationId: string; expiresAt: Date },
  organisationId: string,
  now: Date = new Date(),
): boolean {
  if (row.organisationId !== organisationId) return false;
  return row.expiresAt.getTime() > now.getTime();
}

export function createAidaVisitorToken(): string {
  return randomBytes(32).toString("hex");
}

function parseMessages(raw: unknown): AidaChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: AidaChatMessage[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : "";
    const role = rec.role === "user" || rec.role === "assistant" ? rec.role : null;
    const content = typeof rec.content === "string" ? rec.content : "";
    const createdAt = typeof rec.createdAt === "string" ? rec.createdAt : "";
    if (!id || !role || !content) continue;
    out.push({
      id,
      role,
      content,
      createdAt: createdAt || new Date(0).toISOString(),
      quickActionId:
        typeof rec.quickActionId === "string" ? rec.quickActionId : undefined,
    });
  }
  return out;
}

function parseContext(raw: unknown): AidaVisitorContext {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { facts: [], opportunities: [] };
  }
  const rec = raw as Record<string, unknown>;
  return {
    businessType: typeof rec.businessType === "string" ? rec.businessType : undefined,
    facts: Array.isArray(rec.facts)
      ? rec.facts.filter((x): x is string => typeof x === "string").slice(0, 12)
      : [],
    opportunities: Array.isArray(rec.opportunities)
      ? rec.opportunities.filter((x): x is string => typeof x === "string").slice(0, 8)
      : [],
    intent:
      rec.intent === "exploring" ||
      rec.intent === "qualified" ||
      rec.intent === "high_intent" ||
      rec.intent === "human_requested"
        ? rec.intent
        : undefined,
  };
}

function mapRow(row: {
  id: string;
  organisationId: string;
  status: string;
  messages: unknown;
  visitorContext: unknown;
  contactId: string | null;
  leadId: string | null;
  pageSlug: string | null;
  expiresAt: Date;
}): AidaConversationRecord {
  return {
    id: row.id,
    organisationId: row.organisationId,
    status: row.status,
    messages: parseMessages(row.messages),
    visitorContext: parseContext(row.visitorContext),
    contactId: row.contactId,
    leadId: row.leadId,
    pageSlug: row.pageSlug,
    expiresAt: row.expiresAt,
  };
}

export async function createAidaConversation(input: {
  organisationId: string;
  pageSlug?: string | null;
}): Promise<{ token: string; conversation: AidaConversationRecord }> {
  const { prisma } = await import("@dg/database");
  const token = createAidaVisitorToken();
  const row = await prisma.aidaConversation.create({
    data: {
      organisationId: input.organisationId,
      tokenHash: hashAidaToken(token),
      status: "open",
      messages: [] as unknown as Prisma.InputJsonValue,
      visitorContext: { facts: [], opportunities: [] } as unknown as Prisma.InputJsonValue,
      pageSlug: input.pageSlug?.trim() || null,
      expiresAt: new Date(Date.now() + AIDA_CONVERSATION_TTL_MS),
    },
  });
  return { token, conversation: mapRow(row) };
}

export async function getAidaConversationByToken(input: {
  token: string;
  organisationId: string;
}): Promise<AidaConversationRecord | null> {
  const token = input.token.trim();
  if (!token || token.length < 32) return null;
  const { prisma } = await import("@dg/database");
  const row = await prisma.aidaConversation.findUnique({
    where: { tokenHash: hashAidaToken(token) },
  });
  if (!row) return null;
  if (!aidaRowVisibleToOrganisation(row, input.organisationId)) return null;
  return mapRow(row);
}

export async function saveAidaConversation(input: {
  id: string;
  organisationId: string;
  messages: AidaChatMessage[];
  visitorContext?: AidaVisitorContext;
  status?: string;
  contactId?: string | null;
  leadId?: string | null;
}): Promise<AidaConversationRecord | null> {
  const { prisma } = await import("@dg/database");
  const result = await prisma.aidaConversation.updateMany({
    where: { id: input.id, organisationId: input.organisationId },
    data: {
      messages: input.messages as unknown as Prisma.InputJsonValue,
      ...(input.visitorContext
        ? { visitorContext: input.visitorContext as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
      ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
    },
  });
  if (result.count === 0) return null;
  const row = await prisma.aidaConversation.findFirst({
    where: { id: input.id, organisationId: input.organisationId },
  });
  return row ? mapRow(row) : null;
}

export function conversationSummaryForCrm(messages: AidaChatMessage[]): string {
  return messages
    .slice(-12)
    .map((m) => `${m.role === "user" ? "Visitor" : "Aida"}: ${m.content}`)
    .join("\n\n")
    .slice(0, 4000);
}
