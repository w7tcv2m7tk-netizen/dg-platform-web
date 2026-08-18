import { NextResponse } from "next/server";
import {
  canAccessCommandCentre,
  FOUNDING_STAGES,
  isFoundingStage,
  runFoundingStaffAction,
  type FoundingStageAction,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

const ACTIONS = new Set<FoundingStageAction>([
  "accept",
  "send_agreement",
  "mark_signed",
  "invite_onboarding",
  "advance",
]);

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const allowed = canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Founding pipeline actions are staff-only." } },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    opportunityId?: string;
    action?: string;
    stage?: string;
  } | null;
  const opportunityId = body?.opportunityId?.trim();
  const action = body?.action as FoundingStageAction | undefined;
  if (!opportunityId || !action || !ACTIONS.has(action)) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "opportunityId and a valid action are required",
        },
      },
      { status: 422 },
    );
  }

  const stage =
    typeof body?.stage === "string" && isFoundingStage(body.stage) ? body.stage : undefined;
  if (action === "advance" && body?.stage && !FOUNDING_STAGES.includes(stage as never)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid stage" } },
      { status: 422 },
    );
  }

  const result = await runFoundingStaffAction({
    organisationId: session.organisationId,
    opportunityId,
    actorId: session.clerkUserId,
    action,
    stage,
  });
  if (!result) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Founding opportunity not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: result });
}
