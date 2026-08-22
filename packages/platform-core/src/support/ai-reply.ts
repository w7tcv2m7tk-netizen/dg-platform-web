import { llmChat, llmConfigured } from "../ai/llm";
import { formatSupportMessage } from "./format";

const SYSTEM_PROMPT = `You are DigitalGate Assist, first-line support for DigitalGate (Australian digital platform: websites, marketing, real estate tools, accommodation apps, and the client portal at app.digitalgate.com.au).

Voice: warm, concise, Australian English. You are an assistant, not Ben.

You can: explain portal/onboarding, point people to dashboards and apps, clarify how Live Support works, set expectations (business-hours human follow-up), and suggest emailing support@digitalgate.com.au when needed.

You cannot: change billing, issue refunds, access private data beyond this thread, promise SLAs, invent features, or claim a human is online right now.

If the client asks for a person, disputes money, reports an outage, or anything high-stakes/legal, say a DigitalGate team member will follow up and keep the reply short.

Keep replies under ~120 words. Prefer 1–3 short paragraphs or bullets. End with one clear next step when useful.`;

function sanitizeReply(text: string): string {
  return text
    .replace(/^assist:\s*/i, "")
    .replace(/^digitalgate assist:\s*/i, "")
    .trim()
    .slice(0, 2000);
}

function aiEnabled(): boolean {
  const flag = process.env.DG_SUPPORT_AI_AUTO_REPLY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return llmConfigured();
}

/** Fire-and-forget first-line AI reply after a client message. */
export async function queueSupportAiReply(
  conversationId: string,
  triggerMessageId: number,
  clientName: string,
  clientEmail: string,
) {
  if (!aiEnabled()) return;

  // Small delay so the client POST returns before Assist appears.
  await new Promise((r) => setTimeout(r, 400));

  const { prisma } = await import("@dg/database");

  const conversation = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation || conversation.aiPaused) return;

  const latestClient = await prisma.supportMessage.findFirst({
    where: { conversationId, senderRole: "client" },
    orderBy: { id: "desc" },
    select: { id: true },
  });
  if (!latestClient || latestClient.id !== triggerMessageId) return;

  const alreadyAnswered = await prisma.supportMessage.findFirst({
    where: {
      conversationId,
      id: { gt: triggerMessageId },
      senderRole: { in: ["ai", "staff"] },
    },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (alreadyAnswered) return;

  const recent = await prisma.supportMessage.findMany({
    where: { conversationId },
    orderBy: { id: "desc" },
    take: 12,
    select: { senderRole: true, body: true },
  });
  recent.reverse();

  const transcript = recent
    .map((row) => {
      const who =
        row.senderRole === "client"
          ? "Client"
          : row.senderRole === "ai"
            ? "Assist"
            : "Staff";
      return `${who}: ${row.body.trim()}`;
    })
    .join("\n");

  const userPrompt = [
    `Client name: ${clientName}`,
    `Client email: ${clientEmail}`,
    "",
    "Recent thread:",
    transcript,
    "",
    "Write the next Assist reply only (no role prefix).",
  ].join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 450,
      tier: "standard",
    });

    const text = sanitizeReply(result.text ?? "");
    if (!text) return;

    const fresh = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      select: { aiPaused: true },
    });
    if (!fresh || fresh.aiPaused) return;

    const race = await prisma.supportMessage.findFirst({
      where: {
        conversationId,
        id: { gt: triggerMessageId },
        senderRole: { in: ["ai", "staff"] },
      },
      select: { id: true },
    });
    if (race) return;

    const row = await prisma.supportMessage.create({
      data: {
        conversationId,
        senderRole: "ai",
        body: text,
      },
    });

    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    void row;
    void formatSupportMessage(row, clientName);
  } catch (err) {
    console.error("[support-ai]", err);
  }
}
