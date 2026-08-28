/**
 * Personal Founding Reseller invitations — invitation / acceptance only.
 * Sending an invitation does not consume a Founding Reseller seat.
 */

import { sendMessage } from "../communications";
import { createPartner, getPartnerById, getPartnerByInviteToken, updatePartner } from "./crud";
import {
  deliveryPartnerInviteUrl,
  deliveryPartnerPortalUrl,
  foundingResellerInviteUrl,
  foundingResellerPortalUrl,
  renderDeliveryPartnerInvitationEmail,
  renderFoundingResellerInvitationEmail,
} from "./emails";
import { partnerInviteClerkId } from "./invite-state";
import type { PartnerInvitationStatus, SerializedPartner } from "./types";

function newInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function firstNameFrom(displayName: string | null | undefined, email?: string | null): string {
  const fromName = displayName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email?.split("@")[0]?.trim();
  return local || "there";
}

export type PublicFoundingResellerInvitation = {
  token: string;
  firstName: string;
  businessName: string;
  invitedByName: string;
  status: PartnerInvitationStatus;
  withdrawn: boolean;
  alreadyAccepted: boolean;
};

export async function getPublicFoundingResellerInvitation(
  token: string,
): Promise<PublicFoundingResellerInvitation | null> {
  const partner = await getPartnerByInviteToken(token);
  if (!partner) return null;
  const status = partner.invitationStatus || "draft";
  return {
    token: partner.inviteToken || token,
    firstName: firstNameFrom(partner.displayName, partner.email),
    businessName: partner.businessName?.trim() || partner.displayName?.trim() || "your network",
    invitedByName: partner.invitedByName?.trim() || "Ben Roe",
    status,
    withdrawn: status === "withdrawn" || partner.status === "inactive",
    alreadyAccepted: status === "accepted" || partner.status === "active",
  };
}

export async function createFoundingResellerInvitation(input: {
  organisationId: string;
  actorName?: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  send?: boolean;
}): Promise<{
  partnerId: string;
  inviteToken: string;
  inviteUrl: string;
  emailSent?: boolean;
  error?: string;
}> {
  const email = input.email?.trim().toLowerCase();
  const name = input.name?.trim();
  if (!email && !name) {
    return {
      partnerId: "",
      inviteToken: "",
      inviteUrl: "",
      error: "A name or email is required to create a Founding Reseller invitation.",
    };
  }

  const inviteToken = newInviteToken();
  let partner: Awaited<ReturnType<typeof createPartner>>;
  try {
    partner = await createPartner({
      clerkUserId: partnerInviteClerkId(inviteToken, "draft"),
      partnerType: "FOUNDING_RESELLER",
      cohort: "founding_10",
      displayName: name,
      email,
      phone: input.phone?.trim(),
      businessName: input.businessName?.trim(),
    });
  } catch (err) {
    return {
      partnerId: "",
      inviteToken: "",
      inviteUrl: "",
      error: err instanceof Error ? err.message : "Could not create invitation.",
    };
  }

  if (input.send) {
    const sent = await sendFoundingResellerInvitation({
      organisationId: input.organisationId,
      partnerId: partner.id,
    });
    return {
      partnerId: partner.id,
      inviteToken,
      inviteUrl: foundingResellerInviteUrl(inviteToken),
      emailSent: sent.emailSent,
      error: sent.error,
    };
  }

  return {
    partnerId: partner.id,
    inviteToken,
    inviteUrl: foundingResellerInviteUrl(inviteToken),
  };
}

export async function sendFoundingResellerInvitation(input: {
  organisationId: string;
  partnerId: string;
}): Promise<{ emailSent: boolean; error?: string; partner?: SerializedPartner }> {
  const partner = await getPartnerById(input.partnerId);
  if (!partner) return { emailSent: false, error: "Partner invitation not found" };
  if (partner.invitationStatus === "withdrawn" || partner.status === "inactive") {
    return { emailSent: false, error: "This invitation was withdrawn." };
  }
  const to = partner.email?.trim();
  if (!to) {
    return {
      emailSent: false,
      error: "The invitee needs an email address before the invitation can be sent.",
    };
  }

  const inviteToken = partner.inviteToken || newInviteToken();
  const email = renderFoundingResellerInvitationEmail({
    firstName: firstNameFrom(partner.displayName, to),
    businessName: partner.businessName,
    inviteToken,
  });
  const result = await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to,
    subject: email.subject,
    body: email.body,
    bodyHtml: email.bodyHtml,
    metadata: {
      purpose: "founding_10_reseller_invite",
      footerNote: email.footerNote,
      replyTo: "hello@digitalgate.com.au",
    },
  });

  const updated = partner.clerkUserId
    ? partner
    : await updatePartner(partner.id, {
        clerkUserId: partnerInviteClerkId(inviteToken, "sent"),
      });

  if (result.status !== "sent" && result.status !== "queued") {
    return {
      emailSent: false,
      error: result.error || "The invitation email could not be sent.",
      partner: updated,
    };
  }

  return { emailSent: true, partner: updated };
}

export async function acceptFoundingResellerInvitationByToken(token: string): Promise<{
  ok: boolean;
  withdrawn?: boolean;
  error?: string;
  portalUrl: string;
}> {
  const portalUrl = foundingResellerPortalUrl();
  const partner = await getPartnerByInviteToken(token);
  if (!partner) {
    return { ok: false, error: "Invitation not found", portalUrl };
  }
  if (partner.invitationStatus === "withdrawn" || partner.status === "inactive") {
    return { ok: false, withdrawn: true, error: "This invitation is no longer active.", portalUrl };
  }
  if (!partner.clerkUserId && partner.invitationStatus !== "accepted") {
    await updatePartner(partner.id, {
      clerkUserId: partnerInviteClerkId(partner.inviteToken || token, "accepted"),
    });
  }
  return { ok: true, portalUrl };
}

export async function withdrawFoundingResellerInvitation(partnerId: string): Promise<SerializedPartner> {
  return updatePartner(partnerId, {
    status: "inactive",
  });
}

// ─── Delivery Partner invitations ─────────────────────────────────────────────

export type PublicDeliveryPartnerInvitation = {
  token: string;
  firstName: string;
  businessName: string;
  invitedByName: string;
  status: PartnerInvitationStatus;
  deliveryRole: "lead" | "member";
  withdrawn: boolean;
  alreadyAccepted: boolean;
};

export async function getPublicDeliveryPartnerInvitation(
  token: string,
): Promise<PublicDeliveryPartnerInvitation | null> {
  const partner = await getPartnerByInviteToken(token);
  if (!partner || partner.partnerType !== "IMPLEMENTATION_PARTNER") return null;
  const status = partner.invitationStatus || "draft";
  return {
    token: partner.inviteToken || token,
    firstName: firstNameFrom(partner.displayName, partner.email),
    businessName: partner.businessName?.trim() || partner.displayName?.trim() || "your practice",
    invitedByName: partner.invitedByName?.trim() || "Ben Roe",
    status,
    deliveryRole: partner.deliveryRole === "lead" ? "lead" : "member",
    withdrawn: status === "withdrawn" || partner.status === "inactive",
    alreadyAccepted: status === "accepted" || partner.status === "active",
  };
}

export async function createDeliveryPartnerInvitation(input: {
  organisationId: string;
  actorName?: string;
  name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  deliveryRole?: "lead" | "member";
  send?: boolean;
}): Promise<{
  partnerId: string;
  inviteToken: string;
  inviteUrl: string;
  emailSent?: boolean;
  error?: string;
}> {
  const email = input.email?.trim().toLowerCase();
  const name = input.name?.trim();
  if (!email && !name) {
    return {
      partnerId: "",
      inviteToken: "",
      inviteUrl: "",
      error: "A name or email is required to create a Delivery invitation.",
    };
  }

  const inviteToken = newInviteToken();
  const deliveryRole = input.deliveryRole === "lead" ? "lead" : "member";
  const partner = await createPartner({
    clerkUserId: partnerInviteClerkId(inviteToken, "draft"),
    partnerType: "IMPLEMENTATION_PARTNER",
    cohort: "founding_delivery",
    displayName: name,
    email,
    phone: input.phone?.trim(),
    businessName: input.businessName?.trim(),
    deliveryRole,
  });

  if (input.send) {
    const sent = await sendDeliveryPartnerInvitation({
      organisationId: input.organisationId,
      partnerId: partner.id,
    });
    return {
      partnerId: partner.id,
      inviteToken,
      inviteUrl: deliveryPartnerInviteUrl(inviteToken),
      emailSent: sent.emailSent,
      error: sent.error,
    };
  }

  return {
    partnerId: partner.id,
    inviteToken,
    inviteUrl: deliveryPartnerInviteUrl(inviteToken),
  };
}

export async function sendDeliveryPartnerInvitation(input: {
  organisationId: string;
  partnerId: string;
}): Promise<{ emailSent: boolean; error?: string; partner?: SerializedPartner }> {
  const partner = await getPartnerById(input.partnerId);
  if (!partner) return { emailSent: false, error: "Partner invitation not found" };
  if (partner.partnerType !== "IMPLEMENTATION_PARTNER") {
    return { emailSent: false, error: "This invitation is not a Delivery Partner invite." };
  }
  if (partner.invitationStatus === "withdrawn" || partner.status === "inactive") {
    return { emailSent: false, error: "This invitation was withdrawn." };
  }
  const to = partner.email?.trim();
  if (!to) {
    return {
      emailSent: false,
      error: "The invitee needs an email address before the invitation can be sent.",
    };
  }

  const inviteToken = partner.inviteToken || newInviteToken();
  const deliveryRole = partner.deliveryRole === "lead" ? "lead" : "member";
  const email = renderDeliveryPartnerInvitationEmail({
    firstName: firstNameFrom(partner.displayName, to),
    businessName: partner.businessName,
    inviteToken,
    deliveryRole,
  });
  const result = await sendMessage({
    organisationId: input.organisationId,
    channel: "email",
    to,
    subject: email.subject,
    body: email.body,
    bodyHtml: email.bodyHtml,
    metadata: {
      purpose: "delivery_partner_invite",
      footerNote: email.footerNote,
      replyTo: "hello@digitalgate.com.au",
    },
  });

  const updated = partner.clerkUserId
    ? partner
    : await updatePartner(partner.id, {
        clerkUserId: partnerInviteClerkId(inviteToken, "sent"),
      });

  if (result.status !== "sent" && result.status !== "queued") {
    return {
      emailSent: false,
      error: result.error || "The invitation email could not be sent.",
      partner: updated,
    };
  }

  return { emailSent: true, partner: updated };
}

export async function acceptDeliveryPartnerInvitationByToken(token: string): Promise<{
  ok: boolean;
  withdrawn?: boolean;
  error?: string;
  portalUrl: string;
}> {
  const portalUrl = deliveryPartnerPortalUrl();
  const partner = await getPartnerByInviteToken(token);
  if (!partner || partner.partnerType !== "IMPLEMENTATION_PARTNER") {
    return { ok: false, error: "Invitation not found", portalUrl };
  }
  if (partner.invitationStatus === "withdrawn" || partner.status === "inactive") {
    return { ok: false, withdrawn: true, error: "This invitation is no longer active.", portalUrl };
  }
  if (!partner.clerkUserId && partner.invitationStatus !== "accepted") {
    await updatePartner(partner.id, {
      clerkUserId: partnerInviteClerkId(partner.inviteToken || token, "accepted"),
    });
  }
  return { ok: true, portalUrl };
}

/** Accept either Founding Reseller or Delivery Partner invite by token. */
export async function acceptPartnerInvitationByToken(token: string): Promise<{
  ok: boolean;
  withdrawn?: boolean;
  error?: string;
  portalUrl: string;
  partnerType?: string;
}> {
  const partner = await getPartnerByInviteToken(token);
  if (!partner) {
    return {
      ok: false,
      error: "Invitation not found",
      portalUrl: foundingResellerPortalUrl(),
    };
  }
  if (partner.partnerType === "IMPLEMENTATION_PARTNER") {
    return acceptDeliveryPartnerInvitationByToken(token);
  }
  return acceptFoundingResellerInvitationByToken(token);
}
