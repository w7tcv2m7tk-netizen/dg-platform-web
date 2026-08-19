import { createActivity } from "../activities";
import { sendMessage } from "../communications";
import { getContact } from "../contacts";
import { createTask, listTasks } from "../tasks";
import {
  renderFoundingAcceptanceEmail,
  renderFoundingAgreementEmail,
  renderFoundingOnboardingInviteEmail,
  renderFoundingSetupPlanEmail,
} from "./emails";
import {
  FOUNDING_PIPELINE_ID,
  FOUNDING_STAGE_NEXT_ACTION,
  isFoundingPipeline,
  nextFoundingStage,
  normaliseFoundingStage,
  type FoundingStage,
} from "./pipeline";
import type { FoundingOpportunityMeta, FoundingStageAction } from "./types";

function asMeta(value: unknown): FoundingOpportunityMeta {
  if (!value || typeof value !== "object") return {};
  return value as FoundingOpportunityMeta;
}

function firstNameFrom(name: string | null | undefined, email?: string | null): string {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email?.split("@")[0];
  return local || "there";
}

export function newFoundingInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function findFoundingOpportunityByInviteToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed || !process.env.DATABASE_URL) return null;
  const { prisma } = await import("@dg/database");
  try {
    const byPath = await prisma.opportunity.findFirst({
      where: {
        pipelineId: FOUNDING_PIPELINE_ID,
        metadata: { path: ["founding_invite_token"], equals: trimmed },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (byPath) return byPath;
  } catch (err) {
    console.warn("[founding] invite token json path lookup failed", err);
  }
  const rows = await prisma.opportunity.findMany({
    where: { pipelineId: FOUNDING_PIPELINE_ID },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return (
    rows.find((row) => asMeta(row.metadata).founding_invite_token === trimmed) ?? null
  );
}

async function loadOpportunity(organisationId: string, opportunityId: string) {
  const { prisma } = await import("@dg/database");
  return prisma.opportunity.findFirst({
    where: { id: opportunityId, organisationId },
  });
}

async function persistMeta(
  opportunityId: string,
  metadata: Record<string, unknown>,
) {
  const { prisma } = await import("@dg/database");
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { metadata: metadata as import("@dg/database").Prisma.InputJsonValue },
  });
}

async function ensureStageTask(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
  stage: FoundingStage;
  title: string;
}) {
  const existing = await listTasks({
    organisationId: input.organisationId,
    entityType: "Opportunity",
    entityId: input.opportunityId,
    limit: 50,
  });
  const marker = `Founding next: ${input.stage}`;
  if (existing.items.some((task) => task.title === marker && task.status === "open")) {
    return;
  }
  await createTask({
    organisationId: input.organisationId,
    actorId: input.actorId,
    title: marker,
    description: input.title,
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    priority: "high",
    sourceApp: "founding",
    entityType: "Opportunity",
    entityId: input.opportunityId,
    metadata: { founding: true, stage: input.stage },
  });
}

async function resolveRecipient(organisationId: string, contactId: string | null) {
  if (!contactId) return null;
  const contact = await getContact(organisationId, contactId);
  if (!contact?.email?.trim()) return null;
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
  return {
    email: contact.email.trim(),
    name,
    firstName: firstNameFrom(name, contact.email),
  };
}

export async function sendFoundingMail(input: {
  organisationId: string;
  to: string;
  subject: string;
  body: string;
  bodyHtml: string;
  footerNote: string;
  purpose: string;
  opportunityId: string;
  actorId?: string;
  activityTitle: string;
}) {
  const result = await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to: input.to,
    subject: input.subject,
    body: input.body,
    bodyHtml: input.bodyHtml,
    metadata: {
      purpose: input.purpose,
      footerNote: input.footerNote,
      replyTo: "hello@digitalgate.com.au",
    },
  });
  await createActivity({
    organisationId: input.organisationId,
    entityType: "Opportunity",
    entityId: input.opportunityId,
    activityType: result.status === "sent" ? "email_sent" : "email_queued",
    title: input.activityTitle,
    body: `${input.to} · ${result.provider}${result.error ? ` · ${result.error}` : ""}`,
    sourceApp: "founding",
    actorId: input.actorId,
    metadata: {
      emailStatus: result.status,
      provider: result.provider,
      purpose: input.purpose,
    },
  });
  return result;
}

export async function applyFoundingStageSideEffects(input: {
  organisationId: string;
  opportunityId: string;
  previousStage: string;
  stage: string;
  actorId?: string;
}): Promise<void> {
  const row = await loadOpportunity(input.organisationId, input.opportunityId);
  if (!row || !isFoundingPipeline(row.pipelineId)) return;

  const stage = normaliseFoundingStage(input.stage);
  const meta = asMeta(row.metadata);
  const nextAction = FOUNDING_STAGE_NEXT_ACTION[stage];
  await persistMeta(row.id, {
    ...meta,
    founding_stage: stage,
    next_action: nextAction,
  });
  await ensureStageTask({
    organisationId: input.organisationId,
    opportunityId: row.id,
    actorId: input.actorId,
    stage,
    title: nextAction,
  });
}

export async function runFoundingStaffAction(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
  action: FoundingStageAction;
  stage?: FoundingStage;
}): Promise<{
  stage: FoundingStage;
  inviteToken: string;
  emailSent?: boolean;
} | null> {
  const { updateOpportunityStage } = await import("../opportunities");
  const row = await loadOpportunity(input.organisationId, input.opportunityId);
  if (!row || !isFoundingPipeline(row.pipelineId)) return null;

  const meta = { ...asMeta(row.metadata) };
  const inviteToken = meta.founding_invite_token || newFoundingInviteToken();
  meta.founding_invite_token = inviteToken;
  await persistMeta(row.id, meta);

  const recipient = await resolveRecipient(input.organisationId, row.contactId);
  const businessName =
    (typeof (row.metadata as Record<string, unknown> | null)?.business_name === "string"
      ? String((row.metadata as Record<string, unknown>).business_name)
      : null) || row.title.replace(/^Founding 10 application\s+[—-]\s+/i, "");

  let target: FoundingStage = normaliseFoundingStage(row.stage);
  if (input.action === "accept") target = "accepted";
  if (input.action === "send_agreement") target = "agreement_sent";
  if (input.action === "mark_signed") target = "agreement_signed";
  if (input.action === "invite_onboarding") target = "onboarding_invited";
  if (input.action === "mark_invitation_accepted") target = "invitation_accepted";
  if (input.action === "advance") {
    target = input.stage ?? nextFoundingStage(row.stage) ?? target;
  }

  let emailSent = false;
  if (recipient) {
    if (input.action === "accept" && !meta.acceptance_email_sent_at) {
      const email = renderFoundingAcceptanceEmail({
        firstName: recipient.firstName,
        businessName,
        inviteToken,
      });
      await sendFoundingMail({
        organisationId: input.organisationId,
        to: recipient.email,
        ...email,
        purpose: "founding_10_acceptance",
        opportunityId: row.id,
        actorId: input.actorId,
        activityTitle: "Founding 10 acceptance email sent",
      });
      meta.acceptance_email_sent_at = new Date().toISOString();
      emailSent = true;
    }
    if (input.action === "send_agreement" && !meta.agreement_email_sent_at) {
      const email = renderFoundingAgreementEmail({
        firstName: recipient.firstName,
        businessName,
        inviteToken,
      });
      await sendFoundingMail({
        organisationId: input.organisationId,
        to: recipient.email,
        ...email,
        purpose: "founding_10_agreement",
        opportunityId: row.id,
        actorId: input.actorId,
        activityTitle: "Founding 10 agreement email sent",
      });
      meta.agreement_email_sent_at = new Date().toISOString();
      emailSent = true;
    }
    if (
      (input.action === "invite_onboarding" || input.action === "mark_signed") &&
      !meta.onboarding_invite_sent_at
    ) {
      const email = renderFoundingOnboardingInviteEmail({
        firstName: recipient.firstName,
        inviteToken,
      });
      await sendFoundingMail({
        organisationId: input.organisationId,
        to: recipient.email,
        ...email,
        purpose: "founding_10_onboarding_invite",
        opportunityId: row.id,
        actorId: input.actorId,
        activityTitle: "Founding 10 onboarding invite sent",
      });
      meta.onboarding_invite_sent_at = new Date().toISOString();
      if (input.action === "mark_signed") {
        meta.agreement_signed_at = new Date().toISOString();
      }
      emailSent = true;
    }
  }

  await persistMeta(row.id, meta);
  await updateOpportunityStage(
    input.organisationId,
    row.id,
    target,
    input.actorId,
  );
  return { stage: target, inviteToken, emailSent };
}

export async function claimFoundingInvite(input: {
  customerOrganisationId: string;
  inviteToken: string;
}) {
  const { saveFoundingOnboarding } = await import("./onboarding");
  const opportunity = await findFoundingOpportunityByInviteToken(input.inviteToken);
  if (!opportunity) return null;
  const meta = asMeta(opportunity.metadata);
  await persistMeta(opportunity.id, {
    ...meta,
    founding_customer_organisation_id: input.customerOrganisationId,
  });
  const record = await saveFoundingOnboarding(input.customerOrganisationId, {
    inviteToken: input.inviteToken,
    opportunityId: opportunity.id,
    pipelineOrganisationId: opportunity.organisationId,
    startedAt: new Date().toISOString(),
  });
  return { opportunity, record };
}

export async function markFoundingAgreementSigned(input: {
  customerOrganisationId: string;
  actorId?: string;
  inviteToken?: string;
}) {
  const { getFoundingOnboarding, saveFoundingOnboarding } = await import("./onboarding");
  const { updateOpportunityStage } = await import("../opportunities");
  let record = await getFoundingOnboarding(input.customerOrganisationId);
  const token = input.inviteToken || record?.inviteToken;
  if (token && !record?.opportunityId) {
    await claimFoundingInvite({
      customerOrganisationId: input.customerOrganisationId,
      inviteToken: token,
    });
    record = await getFoundingOnboarding(input.customerOrganisationId);
  }
  const signed = await saveFoundingOnboarding(input.customerOrganisationId, {
    agreementSignedAt: new Date().toISOString(),
  });
  if (record?.opportunityId && record.pipelineOrganisationId) {
    await runFoundingStaffAction({
      organisationId: record.pipelineOrganisationId,
      opportunityId: record.opportunityId,
      actorId: input.actorId,
      action: "mark_signed",
    });
    await updateOpportunityStage(
      record.pipelineOrganisationId,
      record.opportunityId,
      "onboarding_invited",
      input.actorId,
    );
  }
  return signed;
}

export async function notifyFoundingSetupPlan(input: {
  organisationId: string;
  opportunityOrganisationId?: string;
  opportunityId?: string;
  actorId?: string;
  to?: string;
  firstName: string;
  businessName?: string;
  priorities: string[];
  recommendedCore: string[];
  recommendedGrowth: string[];
  recommendedIndustry: string[];
}) {
  if (!input.to) return;
  const email = renderFoundingSetupPlanEmail({
    firstName: input.firstName,
    businessName: input.businessName,
    priorities: input.priorities,
    recommendedCore: input.recommendedCore,
    recommendedGrowth: input.recommendedGrowth,
    recommendedIndustry: input.recommendedIndustry,
  });
  await sendFoundingMail({
    organisationId: input.organisationId,
    to: input.to,
    ...email,
    purpose: "founding_10_setup_plan",
    opportunityId: input.opportunityId || input.organisationId,
    actorId: input.actorId,
    activityTitle: "Founding setup plan email sent",
  });
}
