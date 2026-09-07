import { getMembershipByClerkUser, type MembershipProfile } from "../../org/membership-profile";

export type PublishAgentResult =
  | {
      ok: true;
      created: boolean;
      wpAgentId: number;
      permalink?: string;
    }
  | {
      ok: false;
      reason: "missing_key" | "not_found" | "upstream_error" | "network_error" | "skipped";
      message: string;
    };

const WORDPRESS_AGENT_PUBLISH_DISABLED: PublishAgentResult = {
  ok: false,
  reason: "skipped",
  message:
    "WordPress agent publishing is disabled. Gen 2 / Platform Core is authoritative; WordPress is supported only as an inbound migration source.",
};

/**
 * Legacy compatibility shim.
 *
 * DigitalGate Gen 2 never mirrors team/member profiles to WordPress. WordPress
 * may be used only as an explicit inbound migration source when onboarding a
 * legacy client. This function intentionally performs no connector resolution,
 * network request, external-ref write, or WordPress mutation.
 */
export async function publishMembershipToWordPressAgent(_input: {
  organisationId: string;
  membership: MembershipProfile;
}): Promise<PublishAgentResult> {
  return WORDPRESS_AGENT_PUBLISH_DISABLED;
}

/** Legacy compatibility shim for historical callers. */
export async function publishClerkUserAgentProfile(input: {
  organisationId: string;
  clerkUserId: string;
}): Promise<PublishAgentResult> {
  const membership = await getMembershipByClerkUser(
    input.organisationId,
    input.clerkUserId,
  );
  if (!membership) {
    return { ok: false, reason: "not_found", message: "Membership not found" };
  }
  return WORDPRESS_AGENT_PUBLISH_DISABLED;
}
