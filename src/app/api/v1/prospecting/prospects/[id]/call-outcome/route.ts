import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";
import { generateAiAssist, getBusinessContext } from "@dg/platform-core";

interface RouteParams { params: Promise<{ id: string }> }

const OUTCOMES = new Set(["no_answer", "interested", "follow_up", "not_interested", "wrong_contact"]);

function followUpDraft(input: { name: string | null; business: string; notes: string; outcome: string }) {
  const firstName = input.name?.trim().split(/\s+/)[0];
  const hello = firstName ? `Hi ${firstName}` : "Hi";
  const context = input.notes.trim()
    ? `Thanks for the chat. As discussed, ${input.notes.trim().replace(/\s+/g, " ")}`
    : "Thanks for taking my call today.";
  if (input.outcome === "no_answer") {
    return `${hello}, Ben Roe here from DigitalGate. I tried to give you a quick call regarding ${input.business}. I noticed a couple of opportunities around your digital presence and lead generation that may be worth showing you. Happy to send the details through if useful. Cheers, Ben`;
  }
  return `${hello}, ${context} I'll keep this brief and send through the relevant DigitalGate information rather than a generic platform overview. Let me know if there is anything specific you'd like me to include. Cheers, Ben`;
}

export async function POST(req: Request, { params }: RouteParams) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "prospecting.prospects.write");
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const outcome = typeof body?.outcome === "string" ? body.outcome : "";
  if (!OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: { code: "validation_error", message: "Choose a valid call outcome" } }, { status: 422 });
  }

  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 3000) : "";
  const followUpAt = typeof body?.followUpAt === "string" && body.followUpAt ? new Date(body.followUpAt) : null;
  if (followUpAt && Number.isNaN(followUpAt.getTime())) {
    return NextResponse.json({ error: { code: "validation_error", message: "Follow-up date is invalid" } }, { status: 422 });
  }

  const { prisma } = await import("@dg/database");
  const prospect = await prisma.growthProspect.findFirst({
    where: { id, organisationId: session.organisationId, archivedAt: null },
  });
  if (!prospect) return NextResponse.json({ error: { code: "not_found", message: "Prospect not found" } }, { status: 404 });

  const nextStage =
    outcome === "not_interested" ? "lost" :
    outcome === "interested" || outcome === "follow_up" || outcome === "no_answer" ? "follow_up_due" :
    prospect.stage;

  const nextAction =
    outcome === "not_interested" ? "Closed — not interested" :
    outcome === "wrong_contact" ? "Find the correct decision-maker" :
    followUpAt ? `Follow up ${followUpAt.toLocaleString("en-AU")}` :
    outcome === "interested" ? "Send personalised follow-up and book consultation" :
    outcome === "no_answer" ? "Try again and send a short follow-up" :
    "Follow up";

  await prisma.$transaction(async (tx) => {
    await tx.growthProspectEngagement.create({
      data: {
        prospectId: prospect.id,
        type: "call_outcome",
        metadata: { outcome, notes: notes || null, nextAction, actorId: session.clerkUserId },
      },
    });
    if (followUpAt) {
      await tx.growthProspectEngagement.create({
        data: {
          prospectId: prospect.id,
          type: "follow_up_due",
          occurredAt: followUpAt,
          metadata: { body: notes || null, nextAction: "Follow up", outcome },
        },
      });
    }
    await tx.growthProspect.update({
      where: { id: prospect.id },
      data: {
        stage: nextStage,
        metadata: {
          ...((prospect.metadata && typeof prospect.metadata === "object" ? prospect.metadata : {}) as Record<string, unknown>),
          salesWorkflow: { lastCallOutcome: outcome, lastCallAt: new Date().toISOString(), nextAction, followUpAt: followUpAt?.toISOString() ?? null },
        },
      },
    });
  });

  return NextResponse.json({
    data: {
      outcome,
      nextStage,
      nextAction,
      followUpDraft: await (async () => {
        const fallback = followUpDraft({ name: prospect.contactName, business: prospect.businessName, notes, outcome });
        try {
          const context = await getBusinessContext({ organisationId: session.organisationId, organisationName: session.organisationName || "Your business" });
          const ai = await generateAiAssist({
            context,
            action: "lead_follow_up",
            entity: {
              kind: "lead",
              id: prospect.id,
              title: prospect.businessName,
              stage: nextStage,
              contactName: prospect.contactName,
              contactEmail: prospect.contactEmail,
              contactPhone: prospect.contactPhone,
              notes: [notes ? `Call outcome: ${outcome}. ${notes}` : `Call outcome: ${outcome}.`, `Next action: ${nextAction}`],
            },
          });
          return ai.output || fallback;
        } catch (error) {
          console.warn("[prospecting] Aida follow-up failed; using deterministic draft", error);
          return fallback;
        }
      })(),
    },
  });
}
