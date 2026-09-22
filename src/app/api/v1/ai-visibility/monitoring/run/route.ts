import {
  assertEntitlement, LlmChatError, runAiVisibilityModelObservations } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePermission, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const aiGate = await assertEntitlement(session.organisationId, "useAi");
  if (!aiGate.ok) {
    return NextResponse.json(
      { error: { code: aiGate.code, message: aiGate.message } },
      { status: 403 },
    );
  }

  const denied = requirePermission(session, {
    module: "growth",
    action: "edit",
    scope: "organisation",
  });
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const requested = typeof body.maxPrompts === "number" ? body.maxPrompts : 3;
  const maxPrompts = Math.max(1, Math.min(10, Math.floor(requested)));

  try {
    const data = await runAiVisibilityModelObservations({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      maxPrompts,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof LlmChatError) {
      return NextResponse.json(
        {
          error: {
            code: "model_observation_unavailable",
            message:
              "DigitalGate could not reach a configured AI model. No observation was recorded. Try again or ask your administrator to check AI provider access.",
          },
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "AI Visibility observation could not run";
    const setupIssue = /Business Profile|active AI Visibility prompt/i.test(message);
    return NextResponse.json(
      {
        error: {
          code: setupIssue ? "observation_setup_required" : "observation_failed",
          message,
        },
      },
      { status: setupIssue ? 422 : 500 },
    );
  }
}
