import { NextResponse } from "next/server";
import {
  canAccessCommandCentre,
  FOUNDING_STAGES,
  isFoundingStage,
  markFoundingInvitationAccepted,
  runFoundingStaffAction,
  sendFoundingInvitation,
  withdrawFoundingInvitation,
  type FoundingStageAction,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

const ACTIONS = new Set<FoundingStageAction>([
  "accept",
  "send_agreement",
  "mark_signed",
  "invite_onboarding",
  "advance",
  "send_invitation",
  "resend_invitation",
  "mark_invitation_accepted",
  "withdraw_invitation",
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

  if (action === "send_invitation" || action === "resend_invitation") {
    const result = await sendFoundingInvitation({
      organisationId: session.organisationId,
      opportunityId,
      actorId: session.clerkUserId,
      resend: action === "resend_invitation",
    });
    if (result.error) {
      return NextResponse.json(
        { error: { code: "invitation_error", message: result.error } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: result });
  }

  if (action === "withdraw_invitation") {
    const result = await withdrawFoundingInvitation({
      organisationId: session.organisationId,
      opportunityId,
      actorId: session.clerkUserId,
    });
    return NextResponse.json({ data: result });
  }

  if (action === "mark_invitation_accepted") {
    const result = await markFoundingInvitationAccepted({
      organisationId: session.organisationId,
      opportunityId,
      actorId: session.clerkUserId,
    });
    if (result.error) {
      return NextResponse.json(
        { error: { code: "invitation_error", message: result.error } },
        { status: 422 },
      );
    }
    return NextResponse.json({ data: result });
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
