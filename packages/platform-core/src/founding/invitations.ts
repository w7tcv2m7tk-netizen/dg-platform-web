/**
 * Personal Founding 10 invitations — same cohort as public applications.
 * Sending an invitation does not consume a Founding 10 seat.
 */

import { createActivity } from "../activities";
import { ensureContactForLeadFields, getContact } from "../contacts";
import { createOpportunity, updateOpportunityStage } from "../opportunities";
import {
  foundingPersonalInviteUrl,
  renderFoundingPersonalInvitationEmail,
} from "./emails";
import {
  FOUNDING_COHORT_LIMIT,
  FOUNDING_PIPELINE_ID,
  FOUNDING_STAGE_NEXT_ACTION,
  isFoundingCohortSeat,
  isFoundingPipeline,
  normaliseFoundingStage,
  type FoundingStage,
} from "./pipeline";
import {
  newFoundingInviteToken,
  sendFoundingMail,
  findFoundingOpportunityByInviteToken,
} from "./stage-actions";
import type {
  FoundingEntryType,
  FoundingInvitationStatus,
  FoundingOpportunityMeta,
  FoundingSource,
} from "./types";

function asMeta(value: unknown): FoundingOpportunityMeta {
  if (!value || typeof value !== "object") return {};
  return value as FoundingOpportunityMeta;
}

function isFoundingSource(value: string | undefined): value is FoundingSource {
  return (
    value === "public_application" ||
    value === "direct_invitation" ||
    value === "referral" ||
    value === "existing_contact" ||
    value === "partner_reseller"
  );
}

async function persistMeta(opportunityId: string, metadata: FoundingOpportunityMeta) {
  const { prisma } = await import("@dg/database");
  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { metadata: metadata as import("@dg/database").Prisma.InputJsonValue },
  });
}

export type PublicFoundingInvitation = {
  token: string;
  firstName: string;
  businessName: string;
  invitedByName: string;
  status: FoundingInvitationStatus;
  withdrawn: boolean;
  alreadyInProgramme: boolean;
};

export async function getPublicFoundingInvitation(
  token: string,
): Promise<PublicFoundingInvitation | null> {
  const row = await findFoundingOpportunityByInviteToken(token);
  if (!row) return null;
  const meta = asMeta(row.metadata);
  const status = meta.founding_invitation_status || "draft";
  const firstName =
    (await resolveInviteeFirstName(row.organisationId, row.contactId, row.title)) || "there";
  return {
    token: meta.founding_invite_token || token,
    firstName,
    businessName: meta.business_name?.trim() || row.title.replace(/^Founding 10\s+(invitation|application)\s+[—-]\s+/i, ""),
    invitedByName: meta.founding_invited_by_name?.trim() || "Ben Roe",
    status,
    withdrawn: status === "withdrawn" || row.status === "lost",
    alreadyInProgramme: isFoundingCohortSeat(row.stage, row.status),
  };
}

async function resolveInviteeFirstName(
  organisationId: string,
  contactId: string | null,
  title: string,
): Promise<string> {
  if (contactId) {
    const contact = await getContact(organisationId, contactId);
    if (contact?.firstName?.trim()) return contact.firstName.trim();
  }
  const fromTitle = title.replace(/^Founding 10\s+(invitation|application)\s+[—-]\s+/i, "");
  return fromTitle.split(/\s+/)[0] || "there";
}

export type FoundingCohortSummary = {
  limit: number;
  invited: number;
  accepted: number;
  remaining: number;
};

export async function getFoundingCohortSummary(
  organisationId: string,
): Promise<FoundingCohortSummary> {
  if (!process.env.DATABASE_URL) {
    return { limit: FOUNDING_COHORT_LIMIT, invited: 0, accepted: 0, remaining: FOUNDING_COHORT_LIMIT };
  }
  const { prisma } = await import("@dg/database");
  const rows = await prisma.opportunity.findMany({
    where: { organisationId, pipelineId: FOUNDING_PIPELINE_ID },
    select: { stage: true, status: true, metadata: true },
  });
  let invited = 0;
  let accepted = 0;
  for (const row of rows) {
    const meta = asMeta(row.metadata);
    if (meta.founding_invitation_status === "withdrawn" || row.status === "lost") continue;
    if (isFoundingCohortSeat(row.stage, row.status)) accepted += 1;
    if (
      meta.founding_invitation_status === "sent" ||
      meta.founding_invitation_status === "accepted" ||
      Boolean(meta.founding_invitation_sent_at)
    ) {
      invited += 1;
    }
  }
  return {
    limit: FOUNDING_COHORT_LIMIT,
    invited,
    accepted,
    remaining: Math.max(0, FOUNDING_COHORT_LIMIT - accepted),
  };
}

export async function createFoundingInvitation(input: {
  organisationId: string;
  actorId?: string;
  actorName?: string;
  contactId?: string;
  opportunityId?: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  source?: FoundingSource;
  send?: boolean;
}): Promise<{
  opportunityId: string;
  inviteToken: string;
  inviteUrl: string;
  stage: FoundingStage;
  emailSent?: boolean;
  error?: string;
}> {
  const { prisma } = await import("@dg/database");
  let contactId = input.contactId?.trim() || "";
  if (!contactId) {
    const ensured = await ensureContactForLeadFields({
      organisationId: input.organisationId,
      actorId: input.actorId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      source: "founding_invitation",
    });
    contactId = ensured?.id ?? "";
  }
  if (!contactId) {
    return {
      opportunityId: "",
      inviteToken: "",
      inviteUrl: "",
      stage: "identified",
      error: "A name or email is required to create a Founding 10 invitation.",
    };
  }

  const contact = await getContact(input.organisationId, contactId);
  const displayName = [contact?.firstName, contact?.lastName].filter(Boolean).join(" ") || input.name?.trim() || "Prospect";
  let businessName = input.businessName?.trim();
  if (!businessName && contact?.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: contact.companyId, organisationId: input.organisationId },
      select: { name: true },
    });
    businessName = company?.name?.trim();
  }
  const source: FoundingSource = isFoundingSource(input.source)
    ? input.source
    : contactId && !input.email
      ? "existing_contact"
      : "direct_invitation";

  let row = input.opportunityId
    ? await prisma.opportunity.findFirst({
        where: { id: input.opportunityId, organisationId: input.organisationId },
      })
    : await prisma.opportunity.findFirst({
        where: {
          organisationId: input.organisationId,
          pipelineId: FOUNDING_PIPELINE_ID,
          contactId,
          status: { not: "lost" },
        },
        orderBy: { updatedAt: "desc" },
      });

  const inviteToken =
    asMeta(row?.metadata).founding_invite_token || newFoundingInviteToken();
  const title = `Founding 10 invitation — ${businessName ? `${displayName} (${businessName})` : displayName}`;
  let createdNew = false;

  if (row && asMeta(row.metadata).founding_entry_type === "application") {
    return {
      opportunityId: row.id,
      inviteToken: asMeta(row.metadata).founding_invite_token || inviteToken,
      inviteUrl: foundingPersonalInviteUrl(
        asMeta(row.metadata).founding_invite_token || inviteToken,
      ),
      stage: normaliseFoundingStage(row.stage),
    };
  }

  if (!row) {
    const created = await createOpportunity({
      organisationId: input.organisationId,
      actorId: input.actorId,
      title,
      stage: "identified",
      contactId,
      pipelineId: FOUNDING_PIPELINE_ID,
      metadata: {
        lead_type: "founding_10",
        founding_entry_type: "personal_invitation" satisfies FoundingEntryType,
        founding_source: source,
        founding_invitation_status: "draft" satisfies FoundingInvitationStatus,
        founding_invite_token: inviteToken,
        founding_invited_by: input.actorId,
        founding_invited_by_name: input.actorName || "Ben Roe",
        business_name: businessName,
      },
    });
    row = await prisma.opportunity.findFirst({ where: { id: created.id } });
    createdNew = true;
  } else if (!isFoundingPipeline(row.pipelineId)) {
    await prisma.opportunity.update({
      where: { id: row.id },
      data: {
        pipelineId: FOUNDING_PIPELINE_ID,
        title: row.title || title,
      },
    });
  }

  if (!row) {
    return {
      opportunityId: "",
      inviteToken: "",
      inviteUrl: "",
      stage: "identified",
      error: "Could not create the invitation record.",
    };
  }

  const meta: FoundingOpportunityMeta = {
    ...asMeta(row.metadata),
    founding_entry_type: "personal_invitation",
    founding_source: asMeta(row.metadata).founding_source || source,
    founding_invitation_status: asMeta(row.metadata).founding_invitation_status || "draft",
    founding_invite_token: inviteToken,
    founding_invited_by: asMeta(row.metadata).founding_invited_by || input.actorId,
    founding_invited_by_name:
      asMeta(row.metadata).founding_invited_by_name || input.actorName || "Ben Roe",
    business_name: businessName || asMeta(row.metadata).business_name,
    next_action: FOUNDING_STAGE_NEXT_ACTION.identified,
    founding_stage: normaliseFoundingStage(row.stage),
  };
  await persistMeta(row.id, meta);

  if (createdNew) {
    await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Opportunity",
    entityId: row.id,
    activityType: "founding_invitation_created",
    title: "Founding 10 invitation created",
    body: `${displayName}${businessName ? ` · ${businessName}` : ""}`,
    sourceApp: "founding",
    });
  }

  if (input.send) {
    const sent = await sendFoundingInvitation({
      organisationId: input.organisationId,
      opportunityId: row.id,
      actorId: input.actorId,
      resend: false,
    });
    return {
      opportunityId: row.id,
      inviteToken,
      inviteUrl: foundingPersonalInviteUrl(inviteToken),
      stage: sent.stage,
      emailSent: sent.emailSent,
      error: sent.error,
    };
  }

  return {
    opportunityId: row.id,
    inviteToken,
    inviteUrl: foundingPersonalInviteUrl(inviteToken),
    stage: normaliseFoundingStage(row.stage),
  };
}

export async function sendFoundingInvitation(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
  resend?: boolean;
}): Promise<{ stage: FoundingStage; emailSent: boolean; error?: string }> {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
  });
  if (!row || !isFoundingPipeline(row.pipelineId)) {
    return { stage: "identified", emailSent: false, error: "Founding opportunity not found" };
  }
  const meta = asMeta(row.metadata);
  if (meta.founding_invitation_status === "withdrawn" || row.status === "lost") {
    return {
      stage: normaliseFoundingStage(row.stage),
      emailSent: false,
      error: "This invitation was withdrawn.",
    };
  }

  const inviteToken = meta.founding_invite_token || newFoundingInviteToken();
  const contact = row.contactId ? await getContact(input.organisationId, row.contactId) : null;
  const to = contact?.email?.trim();
  if (!to) {
    return {
      stage: normaliseFoundingStage(row.stage),
      emailSent: false,
      error: "The contact needs an email address before the invitation can be sent.",
    };
  }
  const firstName = contact?.firstName?.trim() || "there";
  const businessName =
    meta.business_name?.trim() ||
    row.title.replace(/^Founding 10\s+(invitation|application)\s+[—-]\s+/i, "");
  const email = renderFoundingPersonalInvitationEmail({
    firstName,
    businessName,
    inviteToken,
  });
  const result = await sendFoundingMail({
    organisationId: input.organisationId,
    to,
    ...email,
    purpose: "founding_10_personal_invitation",
    opportunityId: row.id,
    actorId: input.actorId,
    activityTitle: input.resend
      ? "Founding 10 invitation resent"
      : "Founding 10 invitation sent",
  });

  const emailSent = result.status === "sent";
  const emailError = emailSent
    ? undefined
    : result.error
      ? `Email could not be delivered (${result.error}). Copy the invitation link below.`
      : process.env.RESEND_API_KEY?.trim()
        ? "Email could not be delivered. Copy the invitation link below."
        : "Email provider is not configured — copy the invitation link below.";

  const currentStage = normaliseFoundingStage(row.stage);
  if (input.resend) {
    const nextMeta: FoundingOpportunityMeta = {
      ...meta,
      founding_invite_token: inviteToken,
      founding_invitation_sent_at: new Date().toISOString(),
    };
    await persistMeta(row.id, nextMeta);
    return {
      stage: currentStage,
      emailSent,
      error: emailError,
    };
  }

  const nextMeta: FoundingOpportunityMeta = {
    ...meta,
    founding_invite_token: inviteToken,
    founding_entry_type: meta.founding_entry_type || "personal_invitation",
    founding_invitation_status: "sent",
    founding_invitation_sent_at: new Date().toISOString(),
    founding_stage: "invited",
    next_action: FOUNDING_STAGE_NEXT_ACTION.invited,
  };
  await persistMeta(row.id, nextMeta);
  await updateOpportunityStage(input.organisationId, row.id, "invited", input.actorId);
  return {
    stage: "invited",
    emailSent,
    error: emailError,
  };
}

export async function markFoundingInvitationAccepted(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
}): Promise<{ stage: FoundingStage; error?: string }> {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
  });
  if (!row || !isFoundingPipeline(row.pipelineId)) {
    return { stage: "identified", error: "Founding opportunity not found" };
  }
  const meta = asMeta(row.metadata);
  if (meta.founding_invitation_status === "withdrawn" || row.status === "lost") {
    return { stage: normaliseFoundingStage(row.stage), error: "This invitation was withdrawn." };
  }
  if (isFoundingCohortSeat(row.stage, row.status)) {
    return { stage: normaliseFoundingStage(row.stage) };
  }
  const nextMeta: FoundingOpportunityMeta = {
    ...meta,
    founding_invite_token: meta.founding_invite_token || newFoundingInviteToken(),
    founding_invitation_status: "accepted",
    founding_invitation_accepted_at: new Date().toISOString(),
    founding_stage: "invitation_accepted",
    next_action: FOUNDING_STAGE_NEXT_ACTION.invitation_accepted,
  };
  await persistMeta(row.id, nextMeta);
  await updateOpportunityStage(
    input.organisationId,
    row.id,
    "invitation_accepted",
    input.actorId,
  );
  return { stage: "invitation_accepted" };
}

export async function withdrawFoundingInvitation(input: {
  organisationId: string;
  opportunityId: string;
  actorId?: string;
}): Promise<{ stage: FoundingStage }> {
  const { prisma } = await import("@dg/database");
  const row = await prisma.opportunity.findFirst({
    where: { id: input.opportunityId, organisationId: input.organisationId },
  });
  if (!row || !isFoundingPipeline(row.pipelineId)) {
    return { stage: "identified" };
  }
  const meta: FoundingOpportunityMeta = {
    ...asMeta(row.metadata),
    founding_invitation_status: "withdrawn",
    founding_invitation_withdrawn_at: new Date().toISOString(),
  };
  await persistMeta(row.id, meta);
  await prisma.opportunity.update({
    where: { id: row.id },
    data: { status: "lost", lostReason: "Invitation withdrawn" },
  });
  await createActivity({
    organisationId: input.organisationId,
    actorId: input.actorId,
    entityType: "Opportunity",
    entityId: row.id,
    activityType: "founding_invitation_withdrawn",
    title: "Founding 10 invitation withdrawn",
    sourceApp: "founding",
  });
  return { stage: normaliseFoundingStage(row.stage) };
}

export async function acceptFoundingInvitationByToken(token: string): Promise<{
  ok: boolean;
  alreadyAccepted?: boolean;
  withdrawn?: boolean;
  consultationUrl: string;
  error?: string;
}> {
  const consultationUrl = "https://digitalgate.com.au/strategy-session";
  const row = await findFoundingOpportunityByInviteToken(token);
  if (!row) return { ok: false, consultationUrl, error: "Invitation not found." };
  const meta = asMeta(row.metadata);
  if (meta.founding_invitation_status === "withdrawn" || row.status === "lost") {
    return { ok: false, withdrawn: true, consultationUrl, error: "This invitation is no longer active." };
  }
  if (meta.founding_invitation_status === "accepted" || isFoundingCohortSeat(row.stage, row.status)) {
    return { ok: true, alreadyAccepted: true, consultationUrl };
  }

  const nextMeta: FoundingOpportunityMeta = {
    ...meta,
    founding_invitation_status: "accepted",
    founding_invitation_accepted_at: new Date().toISOString(),
    founding_stage: "invitation_accepted",
    next_action: FOUNDING_STAGE_NEXT_ACTION.invitation_accepted,
  };
  await persistMeta(row.id, nextMeta);
  await updateOpportunityStage(
    row.organisationId,
    row.id,
    "invitation_accepted",
    undefined,
  );
  await createActivity({
    organisationId: row.organisationId,
    entityType: "Opportunity",
    entityId: row.id,
    activityType: "founding_invitation_accepted",
    title: "Founding 10 invitation accepted",
    sourceApp: "founding",
  });
  return { ok: true, consultationUrl };
}
