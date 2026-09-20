import { llmChat, llmConfigured } from "../ai/llm";
import { buildAidaEvidenceContext, formatAidaEvidencePrompt } from "../ai/evidence-context";
import { resolveEnabledAppIds } from "../apps/org-apps";
import { getBusinessContext, buildAiSystemPrompt } from "../org/business-context";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import { gatherOverviewLiveMetrics } from "../overview/gather-live-metrics";
import { captureDigitalTwinSnapshot } from "../twin/capture-snapshot";
import { formatSupportMessage } from "./format";

const SYSTEM_PROMPT = `You are Aida, DigitalGate's AI Business Advisor and Platform Support Assistant for the authenticated DigitalGate platform (Australian digital platform: websites, marketing, CRM, automation, real estate tools, accommodation apps, and the client portal at app.digitalgate.com.au).

Voice: warm, concise, practical Australian English. You are Aida, not Ben and not a human staff member.

You have two jobs:
1. Business Advisor — help clients think through practical business growth, digital marketing, lead generation, CRM/process improvement, automation, websites, customer experience, prioritisation and how DigitalGate capabilities may help.
2. Platform Support — explain portal/onboarding, point people to dashboards and apps, troubleshoot normal usage, clarify how support works, set expectations for business-hours human follow-up, and suggest emailing support@digitalgate.com.au when needed.

Use only information actually present in this conversation or supplied in the authenticated organisation evidence below. Treat evidence marked unavailable as unknown, never as zero. When quoting operational figures, prefer the supplied source/freshness metadata and do not imply a provider is live when the evidence is a snapshot.

You cannot: change billing, issue refunds, perform account mutations, access private data beyond the context you were given, promise SLAs, invent features, or claim a human is online right now.

For business-advice questions, give a useful recommendation and the next practical step. If important business context is missing, ask one focused question rather than pretending to know it.

If the client asks for a person, disputes money, reports an outage, or raises anything high-stakes/legal, say a DigitalGate team member will follow up and keep the reply short.

Keep replies generally under ~180 words. Prefer 1–3 short paragraphs or bullets. End with one clear next step when useful.`;

function sanitizeReply(text: string): string {
  return text
    .replace(/^aida:\s*/i, "")
    .replace(/^assist:\s*/i, "")
    .replace(/^digitalgate assist:\s*/i, "")
    .trim()
    .slice(0, 2400);
}

function aiEnabled(): boolean {
  const flag = process.env.DG_SUPPORT_AI_AUTO_REPLY?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return llmConfigured();
}

/** Fire-and-forget Aida reply after a client message. */
export async function queueSupportAiReply(
  conversationId: string,
  triggerMessageId: number,
  clientName: string,
  clientEmail: string,
) {
  if (!aiEnabled()) return;

  // Small delay so the client POST returns before Aida appears.
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
            ? "Aida"
            : "Staff";
      return `${who}: ${row.body.trim()}`;
    })
    .join("\n");

  // Build context strictly from the organisation pinned to this conversation.
  // Never infer tenant from the user or another active organisation.
  let businessContextPrompt = "";
  try {
    const org = await prisma.organisation.findUnique({
      where: { id: conversation.organisationId },
      select: { id: true, name: true, locale: true, currency: true, timezone: true, industry: true, settings: true },
    });
    if (org) {
      const settings = (org.settings as { apps?: { enabled?: string[] } } | null) ?? {};
      const enabledAppIds = resolveEnabledAppIds(settings);
      const [profile, metrics] = await Promise.all([
        getOrganisationBusinessProfile(org.id),
        gatherOverviewLiveMetrics(org.id, { includeFinancials: false }),
      ]);
      const twinSnapshot = captureDigitalTwinSnapshot({
        organisationId: org.id,
        organisationName: org.name,
        enabledAppIds,
        metrics,
        connectors: {},
        profile,
      });
      const context = await getBusinessContext({
        organisationId: org.id,
        organisationName: org.name,
        locale: org.locale ?? "en-AU",
        currency: org.currency ?? "AUD",
        timezone: org.timezone,
        industry: org.industry,
        enabledAppIds,
        twinSnapshot,
        profileOverride: profile,
      });
      businessContextPrompt = [
        buildAiSystemPrompt(context),
        "",
        formatAidaEvidencePrompt(buildAidaEvidenceContext(context)),
      ].join("\n");
    }
  } catch (err) {
    console.warn("[support-ai] business context unavailable", err instanceof Error ? err.message : err);
  }

  const userPrompt = [
    `Client name: ${clientName}`,
    `Client email: ${clientEmail}`,
    "",
    "Recent thread:",
    transcript,
    "",
    "Write Aida's next reply only (no role prefix).",
  ].join("\n");

  try {
    const result = await llmChat({
      messages: [
        { role: "system", content: businessContextPrompt ? `${SYSTEM_PROMPT}\n\n${businessContextPrompt}` : SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 550,
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
