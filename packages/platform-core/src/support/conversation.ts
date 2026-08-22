import type { PlatformSession } from "../session";
import { queueSupportAiReply } from "./ai-reply";
import { formatSupportMessage } from "./format";
import { notifyStaffSupportMessage } from "./notify";
import type {
  SupportConversationResult,
  SupportPostMessageResult,
  SupportChatMessage,
} from "./types";

async function getOrCreateConversation(session: PlatformSession) {
  const { prisma } = await import("@dg/database");

  const existing = await prisma.supportConversation.findUnique({
    where: { clerkUserId: session.clerkUserId },
  });
  if (existing) return existing;

  return prisma.supportConversation.create({
    data: {
      clerkUserId: session.clerkUserId,
      organisationId: session.organisationId,
      status: "open",
    },
  });
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
