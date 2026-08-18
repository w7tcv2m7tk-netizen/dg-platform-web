import { NextResponse } from "next/server";
import {
  claimFoundingInvite,
  FOUNDING_ONBOARDING_STEPS,
  getFoundingOnboarding,
  markStepComplete,
  saveFoundingOnboarding,
  type FoundingOnboardingAnswers,
  type FoundingOnboardingStep,
} from "@dg/platform-core";

import { isNextResponse, requirePlatformSession } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const invite = url.searchParams.get("invite")?.trim();
  if (invite) {
    await claimFoundingInvite({
      customerOrganisationId: session.organisationId,
      inviteToken: invite,
    });
  }

  const record = await getFoundingOnboarding(session.organisationId);
  return NextResponse.json({ data: record });
}

export async function PATCH(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as {
    inviteToken?: string;
    currentStep?: string;
    completeStep?: string;
    answers?: FoundingOnboardingAnswers;
  } | null;
  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  if (body.inviteToken?.trim()) {
    await claimFoundingInvite({
      customerOrganisationId: session.organisationId,
      inviteToken: body.inviteToken.trim(),
    });
  }

  const completeStep = FOUNDING_ONBOARDING_STEPS.includes(
    body.completeStep as FoundingOnboardingStep,
  )
    ? (body.completeStep as FoundingOnboardingStep)
    : undefined;
  const currentStep = FOUNDING_ONBOARDING_STEPS.includes(
    body.currentStep as FoundingOnboardingStep,
  )
    ? (body.currentStep as FoundingOnboardingStep)
    : undefined;

  let record = await saveFoundingOnboarding(session.organisationId, {
    answers: body.answers,
    currentStep,
  });
  if (completeStep) {
    const marked = markStepComplete(record, completeStep);
    record = await saveFoundingOnboarding(session.organisationId, {
      currentStep: marked.currentStep,
      completedSteps: marked.completedSteps,
    });
  }

  if (completeStep === "business_profile" && record.opportunityId && record.pipelineOrganisationId) {
    const { updateOpportunityStage } = await import("@dg/platform-core");
    await updateOpportunityStage(
      record.pipelineOrganisationId,
      record.opportunityId,
      "onboarding_started",
      session.clerkUserId,
    );
  }

  return NextResponse.json({ data: record });
}
