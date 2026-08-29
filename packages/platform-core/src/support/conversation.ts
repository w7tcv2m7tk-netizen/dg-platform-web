import type { PlatformSession } from "../session";
import { queueSupportAiReply } from "./ai-reply";
import { formatSupportMessage } from "./format";
import { notifyStaffSupportMessage } from "./notify";
import type {
  SupportConversationResult,
  SupportPostMessageResult,
  SupportChatMessage,
} from "./types";

/**
 * Get or create the support thread for this Clerk user **in this organisation**.
 * organisationId is set at create time and never changed.
 */
async function getOrCreateConversation(session: PlatformSession) {
  const { prisma } = await import("@dg/database");
  const organisationId = session.organisationId;
  if (!organisationId) {
    throw new Error("Support conversation requires organisationId");
  }

  const existing = await prisma.supportConversation.findUnique({
    where: {
      clerkUserId_organisationId: {
        clerkUserId: session.clerkUserId,
        organisationId,
      },
    },
  });
  if (existing) {
    // Defence in depth — never serve another tenant's thread.
    if (existing.organisationId !== organisationId) {
      throw new Error("Support conversation organisation mismatch");
    }
    return existing;
  }

  return prisma.supportConversation.create({
    data: {
      clerkUserId: session.clerkUserId,
      organisationId,
      status: "open",
    },
  });
}

async function assertConversationBelongsToSession(
  conversationId: string,
  organisationId: string,
  clerkUserId: string,
) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.supportConversation.findFirst({
    where: {
      id: conversationId,
      organisationId,
      clerkUserId,
    },
  });
  return row;
}

async function loadMessages(
  conversationId: string,
  clientName: string,
  after = 0,
): Promise<SupportChatMessage[]> {
  const { prisma } = await import("@dg/database");

  const rows = await prisma.supportMessage.findMany({
    where: {
      conversationId,
      ...(after > 0 ? { id: { gt: after } } : {}),
    },
    orderBy: { id: "asc" },
    take: after > 0 ? 100 : 200,
    select: {
      id: true,
      senderRole: true,
      body: true,
      createdAt: true,
      senderClerkUserId: true,
    },
  });

  return rows.map((row) => formatSupportMessage(row, clientName));
}

export async function getSupportConversation(
  session: PlatformSession,
): Promise<SupportConversationResult> {
  if (!session.dbConfigured) {
    return {
      ok: false,
      code: "not_linked",
      message: "Complete onboarding with this email to use live chat.",
    };
  }

  try {
    const conversation = await getOrCreateConversation(session);
    const messages = await loadMessages(conversation.id, session.name);
    return {
      ok: true,
      conversationId: conversation.id,
      organisationId: conversation.organisationId,
      messages,
    };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Support chat unavailable — please try again shortly.",
    };
  }
}

export async function getSupportMessages(
  session: PlatformSession,
  after: number,
): Promise<SupportChatMessage[]> {
  try {
    const conversation = await getOrCreateConversation(session);
    return loadMessages(conversation.id, session.name, after);
  } catch {
    return [];
  }
}

export async function postSupportClientMessage(
  session: PlatformSession,
  message: string,
): Promise<SupportPostMessageResult> {
  const body = message.trim();
  if (!body) {
    return {
      ok: false,
      code: "validation_error",
      message: "Message is required",
    };
  }

  if (!session.dbConfigured) {
    return {
      ok: false,
      code: "unavailable",
      message: "Support chat unavailable — please try again shortly.",
    };
  }

  try {
    const { prisma } = await import("@dg/database");
    const conversation = await getOrCreateConversation(session);

    const row = await prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderRole: "client",
        senderClerkUserId: session.clerkUserId,
        body,
      },
    });

    // Never touch organisationId — only status / activity timestamps.
    await prisma.supportConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: "open" },
    });

    const aiMayReply =
      !conversation.aiPaused &&
      (process.env.DG_SUPPORT_AI_AUTO_REPLY?.trim().toLowerCase() !== "0" &&
        process.env.DG_SUPPORT_AI_AUTO_REPLY?.trim().toLowerCase() !== "false" &&
        process.env.DG_SUPPORT_AI_AUTO_REPLY?.trim().toLowerCase() !== "off");

    void notifyStaffSupportMessage({
      clientName: session.name,
      clientEmail: session.email,
      organisationName: session.organisationName,
      organisationSlug: session.organisationSlug,
      organisationId: session.organisationId,
      body,
      conversationId: conversation.id,
      aiMayReply,
    });

    void queueSupportAiReply(
      conversation.id,
      row.id,
      session.name,
      session.email,
    );

    const messages = await loadMessages(conversation.id, session.name);
    return { ok: true, messages };
  } catch {
    return {
      ok: false,
      code: "unavailable",
      message: "Could not send message — please try again.",
    };
  }
}

export type StaffSupportConversationRow = {
  id: string;
  clerkUserId: string;
  organisationId: string;
  organisationName: string | null;
  organisationSlug: string | null;
  contactName: string | null;
  contactEmail: string | null;
  status: string;
  aiPaused: boolean;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
  lastMessageRole: string | null;
};

export type ListSupportConversationsInput = {
  limit?: number;
  aiPausedOnly?: boolean;
  /** Filter to one customer organisation (operator inbox). */
  organisationId?: string;
  status?: "open" | "resolved" | "all";
  /** Free-text match on org name / slug / contact. */
  q?: string;
};

/** Staff inbox — support conversations across organisations, keyed by originating org. */
export async function listOpenSupportConversations(
  input?: ListSupportConversationsInput,
): Promise<StaffSupportConversationRow[]> {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const status = input?.status ?? "open";

  const rows = await prisma.supportConversation.findMany({
    where: {
      ...(status === "all" ? {} : { status }),
      ...(input?.aiPausedOnly ? { aiPaused: true } : {}),
      ...(input?.organisationId ? { organisationId: input.organisationId } : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: limit,
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { id: "desc" },
        take: 1,
        select: { body: true, senderRole: true },
      },
    },
  });

  const orgIds = [...new Set(rows.map((r) => r.organisationId))];
  const clerkIds = [...new Set(rows.map((r) => r.clerkUserId))];

  const [orgs, memberships] = await Promise.all([
    orgIds.length
      ? prisma.organisation.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true, slug: true },
        })
      : Promise.resolve([]),
    clerkIds.length && orgIds.length
      ? prisma.membership.findMany({
          where: {
            clerkUserId: { in: clerkIds },
            organisationId: { in: orgIds },
          },
          select: {
            clerkUserId: true,
            organisationId: true,
            displayName: true,
            email: true,
            publicEmail: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const memberKey = (clerkUserId: string, organisationId: string) =>
    `${clerkUserId}::${organisationId}`;
  const memberByKey = new Map(
    memberships.map((m) => [memberKey(m.clerkUserId, m.organisationId), m]),
  );

  let mapped: StaffSupportConversationRow[] = rows.map((r) => {
    const org = orgById.get(r.organisationId);
    const member = memberByKey.get(memberKey(r.clerkUserId, r.organisationId));
    const last = r.messages[0] ?? null;
    return {
      id: r.id,
      clerkUserId: r.clerkUserId,
      organisationId: r.organisationId,
      organisationName: org?.name ?? null,
      organisationSlug: org?.slug ?? null,
      contactName: member?.displayName ?? null,
      contactEmail: member?.publicEmail ?? member?.email ?? null,
      status: r.status,
      aiPaused: r.aiPaused,
      lastMessageAt: r.lastMessageAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      messageCount: r._count.messages,
      lastMessagePreview: last?.body
        ? last.body.replace(/\s+/g, " ").trim().slice(0, 140)
        : null,
      lastMessageRole: last?.senderRole ?? null,
    };
  });

  const q = input?.q?.trim().toLowerCase();
  if (q) {
    mapped = mapped.filter((r) => {
      const hay = [
        r.organisationName,
        r.organisationSlug,
        r.contactName,
        r.contactEmail,
        r.lastMessagePreview,
        r.clerkUserId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return mapped;
}

/**
 * Correct a mis-attributed conversation's organisation (data repair).
 * Does not move messages between orgs by inference — explicit target only.
 * If a thread already exists for (clerkUser, targetOrg), merge messages into it.
 */
export async function reassignSupportConversationOrganisation(input: {
  conversationId: string;
  organisationId: string;
}): Promise<
  | { ok: true; conversationId: string; mergedIntoId?: string }
  | { ok: false; message: string }
> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, message: "DATABASE_URL not configured" };
  }
  const { prisma } = await import("@dg/database");

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { id: true },
  });
  if (!org) return { ok: false, message: "Organisation not found" };

  const conversation = await prisma.supportConversation.findUnique({
    where: { id: input.conversationId },
  });
  if (!conversation) return { ok: false, message: "Conversation not found" };
  if (conversation.organisationId === input.organisationId) {
    return { ok: true, conversationId: conversation.id };
  }

  const conflict = await prisma.supportConversation.findUnique({
    where: {
      clerkUserId_organisationId: {
        clerkUserId: conversation.clerkUserId,
        organisationId: input.organisationId,
      },
    },
  });

  if (conflict) {
    await prisma.$transaction(async (tx) => {
      await tx.supportMessage.updateMany({
        where: { conversationId: conversation.id },
        data: { conversationId: conflict.id },
      });
      await tx.supportConversation.update({
        where: { id: conflict.id },
        data: {
          lastMessageAt: new Date(
            Math.max(
              conflict.lastMessageAt.getTime(),
              conversation.lastMessageAt.getTime(),
            ),
          ),
          status: "open",
        },
      });
      await tx.supportConversation.delete({ where: { id: conversation.id } });
    });
    return { ok: true, conversationId: conflict.id, mergedIntoId: conflict.id };
  }

  await prisma.supportConversation.update({
    where: { id: conversation.id },
    data: { organisationId: input.organisationId },
  });
  return { ok: true, conversationId: conversation.id };
}

/** @internal — used by message loaders that already have a conversation id. */
export async function loadSupportMessagesForOrg(input: {
  conversationId: string;
  organisationId: string;
  clerkUserId: string;
  clientName: string;
  after?: number;
}): Promise<SupportChatMessage[] | null> {
  const row = await assertConversationBelongsToSession(
    input.conversationId,
    input.organisationId,
    input.clerkUserId,
  );
  if (!row) return null;
  return loadMessages(input.conversationId, input.clientName, input.after ?? 0);
}
