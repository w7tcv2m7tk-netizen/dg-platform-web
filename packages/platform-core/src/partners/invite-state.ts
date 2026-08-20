import type { PartnerInvitationStatus } from "./types";

export const PARTNER_INVITE_DRAFT_PREFIX = "invite-draft:";
export const PARTNER_INVITE_SENT_PREFIX = "invite:";
export const PARTNER_INVITE_ACCEPTED_PREFIX = "invite-accepted:";

export function partnerInviteClerkId(
  token: string,
  status: Exclude<PartnerInvitationStatus, "withdrawn">,
): string {
  if (status === "draft") return `${PARTNER_INVITE_DRAFT_PREFIX}${token}`;
  if (status === "accepted") return `${PARTNER_INVITE_ACCEPTED_PREFIX}${token}`;
  return `${PARTNER_INVITE_SENT_PREFIX}${token}`;
}

export function parsePartnerInviteClerkId(clerkUserId: string | null | undefined): {
  token: string | null;
  invitationStatus: PartnerInvitationStatus | null;
} {
  const value = clerkUserId?.trim() || "";
  if (value.startsWith(PARTNER_INVITE_ACCEPTED_PREFIX)) {
    return {
      token: value.slice(PARTNER_INVITE_ACCEPTED_PREFIX.length) || null,
      invitationStatus: "accepted",
    };
  }
  if (value.startsWith(PARTNER_INVITE_DRAFT_PREFIX)) {
    return {
      token: value.slice(PARTNER_INVITE_DRAFT_PREFIX.length) || null,
      invitationStatus: "draft",
    };
  }
  if (value.startsWith(PARTNER_INVITE_SENT_PREFIX)) {
    return {
      token: value.slice(PARTNER_INVITE_SENT_PREFIX.length) || null,
      invitationStatus: "sent",
    };
  }
  return { token: null, invitationStatus: null };
}

export function isPendingPartnerInviteClerkId(clerkUserId: string | null | undefined): boolean {
  return parsePartnerInviteClerkId(clerkUserId).token != null;
}
