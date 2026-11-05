import { getOrganisationBillingStatus, isVerifiedStripeBilling, type OrganisationBillingStatus } from "../billing/org-billing-status";

/** Completion authority comes only from the canonical, organisation-scoped resolver. */
export function canCompleteGen2Onboarding(billing: Pick<OrganisationBillingStatus, "kind" | "hasStripeCustomer" | "platformExempt"> | null | undefined): boolean {
  return (billing?.kind === "platform_exempt" && billing.platformExempt === true) || isVerifiedStripeBilling(billing);
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
  if (requestsGen2OnboardingCompletion(patch) && !canCompleteGen2Onboarding(await getOrganisationBillingStatus(organisationId))) {
    throw new OnboardingCompletionNotConfirmed();
  }
}
