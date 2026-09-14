import { GEN2_CHECKLIST_ITEMS, GEN2_ONBOARDING_STEPS, GEN2_ONBOARDING_STEP_LABELS, getGen2OnboardingProgress } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const auth = await requirePlatformOperator(req, "command.clients.read");
  if (isNextResponse(auth)) return auth;

  const { orgId } = await params;
  const progress = await getGen2OnboardingProgress(orgId);
  const completed = new Set(progress.completedSteps);
  const requiredChecklist = GEN2_CHECKLIST_ITEMS.filter((item) => !item.optional);
  const completedRequired = requiredChecklist.filter((item) => {
    if (item.step && completed.has(item.step)) return true;
    return Boolean(progress.checklist?.[item.id]);
  }).length;
  const percentComplete = Math.round((completedRequired / requiredChecklist.length) * 100);

  return NextResponse.json({
    data: {
      percentComplete,
      currentStep: progress.currentStep,
      currentStepLabel: GEN2_ONBOARDING_STEP_LABELS[progress.currentStep],
      startedAt: progress.startedAt || null,
      updatedAt: progress.updatedAt || null,
      completedAt: progress.completedAt ?? null,
      founding: progress.founding,
      completedSteps: progress.completedSteps,
      steps: GEN2_ONBOARDING_STEPS.map((step) => ({
        id: step,
        label: GEN2_ONBOARDING_STEP_LABELS[step],
        complete: completed.has(step),
        current: step === progress.currentStep && !completed.has(step),
      })),
      checklist: GEN2_CHECKLIST_ITEMS.map((item) => ({
        id: item.id,
        label: item.label,
        optional: Boolean(item.optional),
        complete: item.step ? completed.has(item.step) || Boolean(progress.checklist?.[item.id]) : Boolean(progress.checklist?.[item.id]),
      })),
    },
  });
}
