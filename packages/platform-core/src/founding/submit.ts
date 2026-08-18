import { createActivity } from "../activities";
import { getOrganisationBusinessProfile } from "../org/onboarding-profile";
import {
  applyOnboardingToProfileAndGoals,
  buildImplementationPlan,
  createFoundingImplementationWork,
  saveFoundingImplementation,
} from "./implementation";
import { getFoundingOnboarding, saveFoundingOnboarding } from "./onboarding";
import { updateOpportunityStage } from "../opportunities";
import { notifyFoundingSetupPlan } from "./stage-actions";

export async function submitFoundingOnboarding(input: {
  organisationId: string;
  actorId?: string;
  actorEmail?: string;
  actorName?: string;
}) {
  const record = await getFoundingOnboarding(input.organisationId);
  if (!record) {
    return { error: "Start onboarding before submitting." };
  }
  if (record.submittedAt) {
    return { error: "Onboarding already submitted." };
  }

  const submitted = await saveFoundingOnboarding(input.organisationId, {
    submittedAt: new Date().toISOString(),
    currentStep: "go_live",
    completedSteps: record.completedSteps.includes("go_live")
      ? record.completedSteps
      : [...record.completedSteps, "go_live"],
  });

  const plan = buildImplementationPlan(
    submitted.answers,
    input.organisationId,
    submitted.opportunityId,
  );
  await saveFoundingImplementation(input.organisationId, plan);
  await applyOnboardingToProfileAndGoals({
    organisationId: input.organisationId,
    answers: submitted.answers,
  });
  await createFoundingImplementationWork({
    organisationId: input.organisationId,
    actorId: input.actorId,
    opportunityId: submitted.opportunityId,
    plan,
  });

  if (submitted.opportunityId && submitted.pipelineOrganisationId) {
    await updateOpportunityStage(
      submitted.pipelineOrganisationId,
      submitted.opportunityId,
      "onboarding_complete",
      input.actorId,
    );
    await updateOpportunityStage(
      submitted.pipelineOrganisationId,
      submitted.opportunityId,
      "configuration",
      input.actorId,
    );
    await createFoundingImplementationWork({
      organisationId: submitted.pipelineOrganisationId,
      actorId: input.actorId,
      opportunityId: submitted.opportunityId,
      plan,
    });
  }

  const profile = await getOrganisationBusinessProfile(input.organisationId);
  const to =
    submitted.answers.primaryContactEmail ||
    profile?.contactEmail ||
    input.actorEmail;
  await notifyFoundingSetupPlan({
    organisationId: input.organisationId,
    opportunityOrganisationId: submitted.pipelineOrganisationId,
    opportunityId: submitted.opportunityId,
    actorId: input.actorId,
    to,
    firstName:
      submitted.answers.primaryContactName?.split(/\s+/)[0] ||
      input.actorName?.split(/\s+/)[0] ||
      "there",
    businessName: submitted.answers.legalName || profile?.businessName || undefined,
    priorities: plan.priorities,
    recommendedCore: plan.recommendedCore,
    recommendedGrowth: plan.recommendedGrowth,
    recommendedIndustry: plan.recommendedIndustry,
  });

  await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Organisation",
    entityId: input.organisationId,
    activityType: "founding_onboarding_submitted",
    title: "Founding onboarding submitted",
    body: "Implementation plan and 30-day success tasks created.",
    sourceApp: "founding",
  });

  return { record: submitted, plan };
}
