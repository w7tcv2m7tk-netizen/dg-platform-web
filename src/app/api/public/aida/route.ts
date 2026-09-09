import { NextResponse } from "next/server";
import {
  type AidaChatMessage,
  aidaPublicIpRateLimited,
  appendTurn,
  captureDgEnquiry,
  clientIpFromHeaders,
  conversationSummaryForCrm,
  createAidaConversation,
  getAidaConversationByToken,
  getWebsiteBySlug,
  isAidaQuickActionId,
  isPublicAidaSiteSlug,
  mergeVisitorContext,
  openingAssistantMessage,
  platformEvents,
  resolveOrgBrandPresetKey,
  runPublicAidaTurn,
  saveAidaConversation,
  validateAidaUserMessage,
} from "@dg/platform-core";
import { knownSlugForPublicHost } from "@/lib/public-host-slugs";
import { publicAidaPricingBrief } from "@/lib/aida-pricing-brief";
import { loadPublicAidaDocCorpus } from "@/lib/load-platform-doc";
import { spamGuardResponse } from "@/lib/public-form-spam-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AidaAction = "bootstrap" | "message" | "capture" | "event";

type AidaBody = {
  action?: string;
  token?: string;
  siteSlug?: string;
  pageSlug?: string;
  text?: string;
  quickActionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  website?: string;
  event?: string;
  honeypot?: string;
  organisationId?: string;
};

function hostAllowedForAida(req: Request, siteSlug: string): boolean {
  if (!isPublicAidaSiteSlug(siteSlug)) return false;
  const raw =
    req.headers.get("x-dg-custom-host")?.trim() ||
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim() ||
    "";
  const host = raw.toLowerCase().split(":")[0]?.replace(/\.$/, "") ?? "";
  if (!host) return true;
  const known = knownSlugForPublicHost(host);
  if (known && known !== "digitalgate") return false;
  return true;
}

function clientSafeConversation(input: {
  token?: string;
  status: string;
  messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
  action?: string;
  leadCaptured?: boolean;
}) {
  return {
    token: input.token,
    status: input.status,
    messages: input.messages,
    action: input.action,
    leadCaptured: input.leadCaptured ?? false,
    contactPath: "/contact",
    pricingPath: "/pricing",
  };
}

async function resolveDigitalgateOrgId(): Promise<string | null> {
  const site =
    (await getWebsiteBySlug("digitalgate", { publishedOnly: true })) ||
    (await getWebsiteBySlug("digitalgate"));
  if (site?.organisationId) return site.organisationId;
  const { prisma } = await import("@dg/database");
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true, industry: true, settings: true },
    take: 100,
  });
  for (const org of orgs) {
    if (resolveOrgBrandPresetKey(org) === "digitalgate") return org.id;
  }
  return null;
}

async function emitAida(
  organisationId: string,
  type:
    | "aida_opened"
    | "aida_conversation_started"
    | "aida_quick_action_selected"
    | "aida_message_sent"
    | "aida_business_fit_started"
    | "aida_lead_capture_started"
    | "aida_lead_created"
    | "aida_handoff_requested"
    | "aida_booking_started"
    | "aida_error",
  payload: Record<string, unknown>,
  entityId?: string,
) {
  await platformEvents.publish({
    type,
    organisationId,
    entityType: "AidaConversation",
    entityId,
    payload,
    occurredAt: new Date(),
  });
}

export async function POST(req: Request) {
  let body: AidaBody;
  try {
    body = (await req.json()) as AidaBody;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Expected JSON" } },
      { status: 400 },
    );
  }

  if (body.organisationId) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "organisationId is not accepted" } },
      { status: 403 },
    );
  }

  const siteSlug = (body.siteSlug ?? "digitalgate").trim().toLowerCase();
  if (!hostAllowedForAida(req, siteSlug)) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Ask Aida is only available on the DigitalGate website" } },
      { status: 403 },
    );
  }

  const action = (body.action ?? "").trim() as AidaAction;
  if (!["bootstrap", "message", "capture", "event"].includes(action)) {
    return NextResponse.json(
      { error: { code: "invalid_request", message: "Unknown action" } },
      { status: 400 },
    );
  }

  const ip = clientIpFromHeaders(req.headers);
  if (action === "bootstrap" && aidaPublicIpRateLimited(ip, "bootstrap")) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many conversations from this network. Please wait a few minutes." } },
      { status: 429 },
    );
  }
  if ((action === "message" || action === "capture") && aidaPublicIpRateLimited(ip, "message")) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Too many messages. Please wait a few minutes." } },
      { status: 429 },
    );
  }

  const spam = spamGuardResponse(
    req,
    {
      honeypot: body.honeypot,
      name: body.name,
      email: body.email,
      message: body.text,
    },
    `ask-aida:${siteSlug}`,
  );
  if (spam && (action === "message" || action === "capture")) return spam;

  const organisationId = await resolveDigitalgateOrgId();
  if (!organisationId) {
    return NextResponse.json(
      { error: { code: "not_found", message: "DigitalGate organisation not found" } },
      { status: 503 },
    );
  }

  try {
    if (action === "bootstrap") {
      const existing = body.token
        ? await getAidaConversationByToken({ token: body.token, organisationId })
        : null;
      if (existing) {
        await emitAida(organisationId, "aida_opened", { pageSlug: body.pageSlug ?? null }, existing.id);
        return NextResponse.json({
          data: clientSafeConversation({
            token: body.token,
            status: existing.status,
            messages: existing.messages,
            leadCaptured: Boolean(existing.leadId),
          }),
        });
      }
      const created = await createAidaConversation({
        organisationId,
        pageSlug: body.pageSlug,
      });
      const messages = [openingAssistantMessage()];
      await saveAidaConversation({
        id: created.conversation.id,
        organisationId,
        messages,
      });
      await emitAida(organisationId, "aida_conversation_started", { pageSlug: body.pageSlug ?? null }, created.conversation.id);
      await emitAida(organisationId, "aida_opened", { pageSlug: body.pageSlug ?? null }, created.conversation.id);
      return NextResponse.json({
        data: clientSafeConversation({
          token: created.token,
          status: "open",
          messages,
        }),
      });
    }

    const token = body.token?.trim() ?? "";
    const conversation = await getAidaConversationByToken({ token, organisationId });
    if (!conversation) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Conversation not found or expired" } },
        { status: 404 },
      );
    }

    if (action === "event") {
      const name = body.event?.trim();
      if (name === "aida_booking_started") {
        await emitAida(organisationId, "aida_booking_started", {}, conversation.id);
      }
      return NextResponse.json({ data: { ok: true } });
    }

    if (action === "capture") {
      const name = body.name?.trim() ?? "";
      const email = body.email?.trim() ?? "";
      if (!name || !email) {
        return NextResponse.json(
          { error: { code: "validation_error", message: "Name and email are required" } },
          { status: 400 },
        );
      }
      await emitAida(organisationId, "aida_lead_capture_started", {}, conversation.id);
      const summary = conversationSummaryForCrm(conversation.messages);
      const captured = await captureDgEnquiry({
        type: "aida",
        name,
        email,
        phone: body.phone,
        businessName: body.businessName,
        website: body.website,
        industry: conversation.visitorContext.businessType,
        wantToSolve: conversation.visitorContext.facts.slice(0, 4).join(" · ") || undefined,
        message: [
          summary,
          conversation.visitorContext.opportunities.length
            ? `Identified opportunities: ${conversation.visitorContext.opportunities.join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        siteSlug,
        heardAbout: "Aida website",
      });
      if (!captured.ok) {
        return NextResponse.json(
          { error: { code: captured.code, message: captured.message } },
          { status: 422 },
        );
      }
      if (captured.contactId === "hp") {
        return NextResponse.json({ data: { ok: true } }, { status: 201 });
      }
      const thanks: AidaChatMessage[] = [
        ...conversation.messages,
        {
          id: `cap_${Date.now()}`,
          role: "assistant",
          content:
            "Thank you. I’ve passed a summary to the DigitalGate team. If you’d like a conversation in person, you can also reach them via Contact.",
          createdAt: new Date().toISOString(),
        },
      ];
      await saveAidaConversation({
        id: conversation.id,
        organisationId,
        messages: thanks,
        status: "captured",
        contactId: captured.contactId,
        leadId: captured.leadId,
        visitorContext: {
          ...conversation.visitorContext,
          intent: "qualified",
        },
      });
      await emitAida(
        organisationId,
        "aida_lead_created",
        { leadId: captured.leadId, contactId: captured.contactId },
        conversation.id,
      );
      return NextResponse.json({
        data: clientSafeConversation({
          token,
          status: "captured",
          messages: thanks,
          leadCaptured: true,
        }),
      });
    }

    const parsed = validateAidaUserMessage(body.text);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: "validation_error", message: parsed.message } },
        { status: 400 },
      );
    }

    const quickActionId = body.quickActionId?.trim();
    if (quickActionId && !isAidaQuickActionId(quickActionId)) {
      return NextResponse.json(
        { error: { code: "invalid_request", message: "Unknown quick action" } },
        { status: 400 },
      );
    }

    await emitAida(
      organisationId,
      "aida_message_sent",
      { chars: parsed.text.length, quickAction: Boolean(quickActionId) },
      conversation.id,
    );
    if (quickActionId) {
      await emitAida(organisationId, "aida_quick_action_selected", { quickActionId }, conversation.id);
    }
    if (quickActionId === "help_my_business") {
      await emitAida(organisationId, "aida_business_fit_started", {}, conversation.id);
    }

    const docs = await loadPublicAidaDocCorpus();
    const turn = await runPublicAidaTurn({
      userText: parsed.text,
      quickActionId,
      history: conversation.messages,
      docs,
      pricingBrief: publicAidaPricingBrief(),
    });

    if (turn.source === "llm_error" || turn.source === "no_llm") {
      await emitAida(organisationId, "aida_error", { source: turn.source }, conversation.id);
    }
    if (turn.action === "handoff") {
      await emitAida(organisationId, "aida_handoff_requested", {}, conversation.id);
    }

    const messages = appendTurn(
      conversation.messages,
      parsed.text,
      turn.reply,
      quickActionId,
    );
    await saveAidaConversation({
      id: conversation.id,
      organisationId,
      messages,
      visitorContext: mergeVisitorContext(conversation.visitorContext, parsed.text, turn.action),
      status: turn.action === "handoff" ? "handed_off" : conversation.status,
    });

    return NextResponse.json({
      data: clientSafeConversation({
        token,
        status: turn.action === "handoff" ? "handed_off" : conversation.status,
        messages,
        action: turn.action,
        leadCaptured: Boolean(conversation.leadId),
      }),
    });
  } catch (err) {
    console.error("[ask-aida]", err instanceof Error ? err.message : "failed");
    return NextResponse.json(
      { error: { code: "server_error", message: "Aida is unavailable right now. Please try again." } },
      { status: 500 },
    );
  }
}
