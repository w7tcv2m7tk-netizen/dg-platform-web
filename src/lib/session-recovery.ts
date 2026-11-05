import type { PlatformSession, UserOrganisationSummary } from "@dg/platform-core";

export type SessionRecoveryDecision =
  | { kind: "none" }
  | { kind: "stale"; activeOrganisationId: string; organisations: UserOrganisationSummary[] }
  | { kind: "no_membership"; activeOrganisationId: string };

/**
 * Distinguish a stale tenant selection from a signed-out or genuinely
 * memberless account. Never silently replace an explicit tenant.
 */
export function resolveSessionRecovery(input: {
  session: PlatformSession | null;
  clerkUserId?: string | null;
  activeOrganisationId?: string | null;
  organisations: UserOrganisationSummary[];
}): SessionRecoveryDecision {
  if (input.session || !input.clerkUserId || !input.activeOrganisationId) {
    return { kind: "none" };
  }
  if (input.organisations.length > 0) {
    return {
      kind: "stale",
      activeOrganisationId: input.activeOrganisationId,
      organisations: input.organisations,
    };
  }
  return { kind: "no_membership", activeOrganisationId: input.activeOrganisationId };
}
