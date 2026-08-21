import { createContact, listContacts } from "../contacts";
import { platformEvents } from "../events";
import type { PlatformEventType } from "../events";
import { createOpportunity, listOpportunities } from "../opportunities";
import { findAgentByProviderId } from "./agents";
import {
  buildOpportunityIntelligenceFromConversation,
  formatOpportunityIntelligenceBlock,
  shouldGenerateSalesIntelligence,
  type OpportunityIntelligence,
} from "./sales-intelligence";
import {
  auditCommunication,
  logSessionActivity,
  recordCommunicationUsage,
  replaceSessionMessages,
  upsertCommunicationSession,
} from "./sessions";
import type { ProviderConversation } from "./providers/types";

function digits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export async function identifyOrCreateCaller(input: {
  organisationId: string;
  phone?: string | null;
}): Promise<{ contactId: string | null; created: boolean }> {
  const phone = input.phone?.trim();
  if (!phone) return { contactId: null, created: false };

  const matches = await listContacts({
    organisationId: input.organisationId,
    search: phone,
    limit: 10,
  });
  const needle = digits(phone);
  const existing = matches.items.find(
    (contact) => digits(contact.phone) === needle || contact.phone === phone,
  );
  if (existing) return { contactId: existing.id, created: false };

  const created = await createContact({
    organisationId: input.organisationId,
    firstName: "Caller",
    lastName: phone,
    phone,
    source: "AI Communications",
    tags: "ai-voice",
  });
  return { contactId: created.id, created: true };
}

function mapStatus(raw?: string | null): string {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("fail")) return "failed";
  if (value.includes("miss") || value.includes("no_answer") || value.includes("unanswered")) {
    return "missed";
  }
  if (value.includes("transfer")) return "transferred";
  if (value.includes("progress") || value.includes("ongoing") || value.includes("initiated")) {
    return "in_progress";
  }
  if (value.includes("done") || value.includes("complete") || value.includes("processed")) {
    return "completed";
  }
  return value || "completed";
}

function inferOutcome(input: {
  status: string;
  summary?: string | null;
}): string {
  if (input.status === "missed") return "follow_up_required";
  if (input.status === "transferred") return "transferred";
  if (input.status === "failed") return "unknown";
  const text = (input.summary ?? "").toLowerCase();
  if (/appoint|book|consult/.test(text)) return "appointment_booked";
  if (/not interested|no thanks/.test(text)) return "not_interested";
  if (/support|issue|problem/.test(text)) return "support_issue";
  if (/exist(ing)? customer/.test(text)) return "existing_customer";
  if (/lead|qualif|sell|buy|enquiry|inquiry/.test(text)) return "lead";
  if (text) return "information_request";
  return "unknown";
}

function eventForStatus(status: string): PlatformEventType {
  if (status === "missed") return "call.missed";
  if (status === "failed") return "call.failed";
  if (status === "transferred") return "call.transferred";
  if (status === "in_progress") return "call.started";
  return "call.completed";
}

export async function ingestProviderConversation(input: {
  provider: string;
  conversation: ProviderConversation;
  organisationId?: string;
  agentId?: string;
}): Promise<{ sessionId: string; organisationId: string } | null> {
  const providerSessionId = input.conversation.providerSessionId?.trim();
  if (!providerSessionId) return null;

  const agent =
    input.agentId && input.organisationId
      ? null
      : input.conversation.agentProviderId
        ? await findAgentByProviderId(input.provider, input.conversation.agentProviderId)
        : null;

  const organisationId = input.organisationId || agent?.organisationId;
  const agentId = input.agentId || agent?.id || null;
  if (!organisationId) {
    console.warn("[communications] webhook conversation had no matching DigitalGate agent", {
      provider: input.provider,
      providerSessionId,
      agentProviderId: input.conversation.agentProviderId,
    });
    return null;
  }

  const status = mapStatus(input.conversation.status);
  const summary = input.conversation.summary ?? null;
  const outcome = inferOutcome({ status, summary });
  const caller = await identifyOrCreateCaller({
    organisationId,
    phone: input.conversation.callerPhone,
  });

  const agentType = agent?.type ?? null;

  let salesIntelligence: OpportunityIntelligence | null = null;
  let opportunityId: string | null = null;

  if (
    shouldGenerateSalesIntelligence({
      agentType,
      outcome,
      transcript: input.conversation.transcript,
      summary,
    })
  ) {
    salesIntelligence = buildOpportunityIntelligenceFromConversation({
      transcript: input.conversation.transcript,
      summary,
      agentType,
    });

    opportunityId = await attachSalesIntelligenceToOpportunity({
      organisationId,
      contactId: caller.contactId,
      intelligence: salesIntelligence,
      summary,
    });
    salesIntelligence = {
      ...salesIntelligence,
      sessionId: undefined,
    };
  }

  const session = await upsertCommunicationSession({
    organisationId,
    agentId,
    provider: input.provider,
    providerSessionId,
    contactId: caller.contactId,
    opportunityId,
    channel: "voice",
    direction: "inbound",
    status,
    startedAt: input.conversation.startedAt ?? null,
    endedAt: input.conversation.endedAt ?? null,
    durationSeconds: input.conversation.durationSeconds ?? null,
    transcript: input.conversation.transcript ?? null,
    summary,
    outcome,
    recordingUrl: input.conversation.recordingUrl ?? null,
    costCents: input.conversation.usage?.costCents ?? null,
    usageUnits: input.conversation.usage?.units ?? null,
    callerPhone: input.conversation.callerPhone ?? null,
    metadata: {
      providerRaw: Boolean(input.conversation.raw),
      contactCreated: caller.created,
      ...(salesIntelligence
        ? {
            salesIntelligence: {
              ...salesIntelligence,
              sessionId: undefined,
              source: "voice_post_call" as const,
            },
            opportunityIntelligenceText: formatOpportunityIntelligenceBlock({
              ...salesIntelligence,
              source: "voice_post_call",
            }),
          }
        : {}),
    },
  });

  if (salesIntelligence) {
    salesIntelligence = { ...salesIntelligence, sessionId: session.id, source: "voice_post_call" };
    // Re-stamp session id onto opportunity metadata for traceability
    if (opportunityId) {
      await stampIntelligenceSessionId({
        organisationId,
        opportunityId,
        sessionId: session.id,
        intelligence: salesIntelligence,
      });
    }
  }

  if (input.conversation.messages?.length) {
    await replaceSessionMessages({
      organisationId,
      sessionId: session.id,
      channel: "voice",
      messages: input.conversation.messages,
    });
  }

  if (input.conversation.usage?.units) {
    await recordCommunicationUsage({
      organisationId,
      agentId,
      sessionId: session.id,
      provider: input.provider,
      metric: "conversation",
      units: input.conversation.usage.units,
      providerCostCents: input.conversation.usage.costCents ?? null,
    });
  }

  await logSessionActivity({
    organisationId,
    sessionId: session.id,
    contactId: caller.contactId,
    title: salesIntelligence
      ? `Sales Intelligence · score ${salesIntelligence.opportunityScore}/100`
      : `AI ${status === "in_progress" ? "call in progress" : "call recorded"}`,
    body: salesIntelligence
      ? formatOpportunityIntelligenceBlock(salesIntelligence)
      : summary || input.conversation.transcript?.slice(0, 500) || undefined,
  });

  await auditCommunication({
    organisationId,
    actorType: "connector",
    action: session.createdAt === session.updatedAt ? "create" : "update",
    entityType: "CommunicationSession",
    entityId: session.id,
    changes: { status, providerSessionId, outcome },
  });

  await platformEvents.publish({
    type: "conversation.created",
    organisationId,
    entityType: "CommunicationSession",
    entityId: session.id,
    payload: { provider: input.provider, providerSessionId, agentId },
    occurredAt: new Date(),
  });

  await platformEvents.publish({
    type: eventForStatus(status),
    organisationId,
    entityType: "CommunicationSession",
    entityId: session.id,
    payload: {
      status,
      outcome,
      contactId: caller.contactId,
      agentId,
      durationSeconds: input.conversation.durationSeconds ?? null,
    },
    occurredAt: new Date(),
  });

  if (outcome === "lead" || salesIntelligence) {
    await platformEvents.publish({
      type: "lead.qualified",
      organisationId,
      entityType: "CommunicationSession",
      entityId: session.id,
      payload: {
        contactId: caller.contactId,
        agentId,
        opportunityId,
        opportunityScore: salesIntelligence?.opportunityScore ?? null,
      },
      occurredAt: new Date(),
    });
  }

  return { sessionId: session.id, organisationId };
}

async function attachSalesIntelligenceToOpportunity(input: {
  organisationId: string;
  contactId: string | null;
  intelligence: OpportunityIntelligence;
  summary?: string | null;
}): Promise<string | null> {
  const { prisma } = await import("@dg/database");
  const title =
    input.intelligence.primaryProblem
      ? `Voice opportunity · ${input.intelligence.primaryProblem.slice(0, 60)}`
      : "Voice sales opportunity";

  let opportunityId: string | null = null;
  if (input.contactId) {
    const existing = await listOpportunities({
      organisationId: input.organisationId,
      status: "open",
      limit: 5,
    });
    const match = existing.items.find((item) => item.contactId === input.contactId);
    if (match) opportunityId = match.id;
  }

  const metadata = {
    salesIntelligence: {
      ...input.intelligence,
      source: "voice_post_call",
    },
    opportunityScore: input.intelligence.opportunityScore,
    recommendedNextStep: input.intelligence.recommendedNextStep,
  };

  if (opportunityId) {
    const row = await prisma.opportunity.findFirst({
      where: { id: opportunityId, organisationId: input.organisationId },
    });
    if (!row) return null;
    const prev = (row.metadata as Record<string, unknown> | null) ?? {};
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        probability: input.intelligence.opportunityScore,
        metadata: { ...prev, ...metadata } as object,
      },
    });
    return opportunityId;
  }

  const created = await createOpportunity({
    organisationId: input.organisationId,
    title,
    stage: input.intelligence.opportunityScore >= 75 ? "qualified" : "new",
    contactId: input.contactId ?? undefined,
    metadata: {
      ...metadata,
      source: "ai_voice",
      summary: input.summary ?? null,
    },
  });
  return created.id;
}

async function stampIntelligenceSessionId(input: {
  organisationId: string;
  opportunityId: string;
  sessionId: string;
  intelligence: OpportunityIntelligence;
}) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
  });
  if (!row) return;
  const prev = (row.metadata as Record<string, unknown> | null) ?? {};
  const prevIntel =
    prev.salesIntelligence && typeof prev.salesIntelligence === "object"
      ? (prev.salesIntelligence as Record<string, unknown>)
      : {};
  await prisma.opportunity.update({
    where: { id: input.opportunityId },
    data: {
      metadata: {
        ...prev,
        salesIntelligence: {
          ...prevIntel,
          ...input.intelligence,
          sessionId: input.sessionId,
          source: "voice_post_call",
        },
      } as object,
    },
  });
}
