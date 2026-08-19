/**
 * Founding 10 customer pipeline.
 * Two entries into the same cohort: public application, or personal invitation.
 * Invitation ≠ a seat. A seat is counted only from `accepted` onward.
 */

export const FOUNDING_PIPELINE_ID = "founding_10" as const;
export const FOUNDING_COHORT_LIMIT = 10;

export const FOUNDING_STAGES = [
  "identified",
  "contacted",
  "conversation",
  "invited",
  "invitation_accepted",
  "application_received",
  "discovery_booked",
  "discovery_completed",
  "accepted",
  "agreement_sent",
  "agreement_signed",
  "onboarding_invited",
  "onboarding_started",
  "onboarding_complete",
  "configuration",
  "implementation",
  "go_live",
  "thirty_day_review",
] as const;

export const FOUNDING_INVITATION_STAGES = [
  "identified",
  "contacted",
  "conversation",
  "invited",
  "invitation_accepted",
] as const;

export type FoundingStage = (typeof FOUNDING_STAGES)[number];

const LEGACY_STAGE_MAP: Record<string, FoundingStage> = {
  application: "application_received",
  new: "application_received",
  booked: "discovery_booked",
  discovery: "discovery_booked",
  consulted: "discovery_completed",
  won: "accepted",
  onboarding: "onboarding_started",
  live: "go_live",
  "30_day_review": "thirty_day_review",
  review: "thirty_day_review",
};

export function isFoundingStage(value: string): value is FoundingStage {
  return (FOUNDING_STAGES as readonly string[]).includes(value);
}

export function normaliseFoundingStage(stage: string | null | undefined): FoundingStage {
  const raw = (stage || "").trim().toLowerCase();
  if (isFoundingStage(raw)) return raw;
  return LEGACY_STAGE_MAP[raw] ?? "application_received";
}

export const FOUNDING_STAGE_LABELS: Record<FoundingStage, string> = {
  identified: "Identified",
  contacted: "Contacted",
  conversation: "Conversation",
  invited: "Invited",
  invitation_accepted: "Invitation accepted",
  application_received: "Application received",
  discovery_booked: "Discovery booked",
  discovery_completed: "Discovery completed",
  accepted: "Accepted",
  agreement_sent: "Agreement sent",
  agreement_signed: "Agreement signed",
  onboarding_invited: "Onboarding invited",
  onboarding_started: "Onboarding started",
  onboarding_complete: "Onboarding complete",
  configuration: "Configuration",
  implementation: "Implementation",
  go_live: "Go live",
  thirty_day_review: "30-day review",
};

export const FOUNDING_STAGE_NEXT_ACTION: Record<FoundingStage, string> = {
  identified: "Have the conversation, then send a personal Founding 10 invitation.",
  contacted: "Follow up. Do not send the generic application form as the next step.",
  conversation: "If they are a strong fit, send a personal Founding 10 invitation.",
  invited: "Wait for them to accept the invitation, or resend / withdraw.",
  invitation_accepted: "Book the Platform Consultation. They are not yet one of the 10.",
  application_received: "Review the application and book a discovery / platform consultation.",
  discovery_booked: "Run discovery. Learn how they run the business before demoing.",
  discovery_completed: "Accept into Founding 10, or decline with a clear reason.",
  accepted: "Send the Founding Agreement. Do not start the onboarding wizard yet.",
  agreement_sent: "Chase signature. Keep legal separate from onboarding.",
  agreement_signed: "Invite them to signed-in Gen 2 onboarding.",
  onboarding_invited: "Confirm they can sign in and open /onboarding.",
  onboarding_started: "Follow up if the wizard stalls. They can finish over more than one sitting.",
  onboarding_complete: "Review the implementation plan and begin configuration.",
  configuration: "Configure Core, selected Apps, and first connectors.",
  implementation: "Complete migration, workflows, and training. Set a go-live date.",
  go_live: "Confirm first value. Schedule the 30-day Founding Customer review.",
  thirty_day_review: "Review usage, goals, issues, feature requests, and a possible referral.",
};

export function foundingStageIndex(stage: string): number {
  const normalised = normaliseFoundingStage(stage);
  return FOUNDING_STAGES.indexOf(normalised);
}

export function nextFoundingStage(stage: string): FoundingStage | null {
  const index = foundingStageIndex(stage);
  if (index < 0 || index >= FOUNDING_STAGES.length - 1) return null;
  return FOUNDING_STAGES[index + 1] ?? null;
}

export function isFoundingPipeline(
  pipelineId?: string | null,
  leadType?: string | null,
): boolean {
  if (pipelineId === FOUNDING_PIPELINE_ID) return true;
  return (leadType || "").trim().toLowerCase() === "founding_10";
}

/** Seat in the 10 — not merely invited. Lost / withdrawn rows do not count. */
export function isFoundingCohortSeat(stage: string, status?: string | null): boolean {
  if ((status || "").toLowerCase() === "lost") return false;
  return foundingStageIndex(stage) >= foundingStageIndex("accepted");
}

export function isFoundingInvitationStage(stage: string): boolean {
  return (FOUNDING_INVITATION_STAGES as readonly string[]).includes(
    normaliseFoundingStage(stage),
  );
}
