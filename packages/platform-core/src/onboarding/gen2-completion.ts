import { getPlatformSubscriptionStrict, type PlatformSubscriptionRow } from "../billing/subscription-store";

type CompletionAuthority = Pick<PlatformSubscriptionRow, "organisationId" | "platformExempt" | "status" | "entitlement" | "stripeCustomerId" | "stripeSubscriptionId" | "stripeStatus" | "trialEnd" | "currentPeriodEnd">;

/** Completion requires current canonical authority; legacy settings are not evidence. */
export function canCompleteGen2Onboarding(authority: CompletionAuthority | null | undefined, organisationId: string, now = new Date()): boolean {
  if (!authority || !organisationId || authority.organisationId !== organisationId) return false;
  if (authority.platformExempt === true) return true;
  if (!authority.stripeCustomerId || !authority.stripeSubscriptionId || !["FULL", "FULL_WITH_WARNING", "MOSTLY_FULL"].includes(authority.entitlement)) return false;
  if (authority.stripeStatus === "trialing") return ["TRIALING", "CANCEL_AT_PERIOD_END"].includes(authority.status) && Boolean(authority.trialEnd && authority.trialEnd > now);
  if (authority.stripeStatus === "active") return ["ACTIVE", "CANCEL_AT_PERIOD_END"].includes(authority.status) && Boolean(authority.currentPeriodEnd && authority.currentPeriodEnd > now);
  return false;
}

export class OnboardingCompletionNotConfirmed extends Error {
  constructor() { super("Confirm your subscription before completing setup."); }
}

/** Covers explicit completion and steps which implicitly advance to hand-off. */
export function requestsGen2OnboardingCompletion(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const patch = raw as Record<string, unknown>;
  const vip = patch.vipSetup as Record<string, unknown> | null | undefined;
  const journey = patch.journeyPosition as Record<string, unknown> | null | undefined;
  const checklist = patch.checklist as Record<string, unknown> | null | undefined;
  return Boolean(patch.completedAt || patch.subscriptionActivatedAt || vip?.completedAt || vip?.firstLoginHandoverCompletedAt ||
    patch.currentStep === "implementation" || journey?.stage === "implementation" ||
    patch.markStepComplete === "implementation" || patch.markStepComplete === "checklist" || patch.markStepComplete === "stripe" ||
    (Array.isArray(patch.completedSteps) && patch.completedSteps.some(step => step === "implementation" || step === "stripe")) ||
    checklist?.implementation || checklist?.subscription);
}

export async function assertGen2OnboardingCompletionAllowed(organisationId: string, patch: unknown): Promise<void> {
  if (requestsGen2OnboardingCompletion(patch) && !canCompleteGen2Onboarding(await getPlatformSubscriptionStrict(organisationId), organisationId)) {
    throw new OnboardingCompletionNotConfirmed();
  }
}
