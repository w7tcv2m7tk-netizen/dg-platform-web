import {
  getMembershipByClerkUser,
  setMembershipExternalRefs,
  type MembershipProfile,
} from "../../org/membership-profile";
import { resolveOrgWordPressConnector } from "./org-connector";

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

/** Upsert team member profile to WordPress agent CPT (when RE module is present). */
export async function publishMembershipToWordPressAgent(input: {
  organisationId: string;
  membership: MembershipProfile;
}): Promise<PublishAgentResult> {
  const connector = await resolveOrgWordPressConnector(input.organisationId);
  if (!connector.apiKey?.trim()) {
    return {
      ok: false,
      reason: "missing_key",
      message: "WordPress API key not configured for this organisation",
    };
  }

  const name = input.membership.displayName?.trim() || input.membership.email || "Team member";
  const payload = {
    dg_membership_id: input.membership.id,
    name,
    email: input.membership.email ?? undefined,
    phone: input.membership.phone ?? undefined,
    title: input.membership.jobTitle ?? undefined,
    bio: input.membership.bio ?? undefined,
    photo_url: input.membership.avatarUrl ?? undefined,
  };

  try {
    const res = await fetch(`${connector.baseUrl}/agents`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": connector.apiKey,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      created?: boolean;
      message?: string;
      code?: string;
      agent?: { id?: number; permalink?: string };
    } | null;

    if (res.status === 404 || data?.code === "unavailable") {
      return {
        ok: false,
        reason: "skipped",
        message: "This WordPress site does not support agent profiles yet (or Real Estate module is off).",
      };
    }

    if (!res.ok || !data?.agent?.id) {
      return {
        ok: false,
        reason: "upstream_error",
        message: data?.message ?? `WordPress returned HTTP ${res.status}`,
      };
    }

    await setMembershipExternalRefs(input.membership.id, {
      wp_agent_id: data.agent.id,
      wp_agent_permalink: data.agent.permalink,
      wp_agent_synced_at: new Date().toISOString(),
    });

    return {
      ok: true,
      created: Boolean(data.created),
      wpAgentId: data.agent.id,
      permalink: data.agent.permalink,
    };
  } catch (err) {
    return {
      ok: false,
      reason: "network_error",
      message: err instanceof Error ? err.message : "Could not reach WordPress",
    };
  }
}

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
  return publishMembershipToWordPressAgent({
    organisationId: input.organisationId,
    membership,
  });
}
