import {
  hasPlatformAuthority,
  isPlatformOperatorOrganisationId,
} from "../access/platform-authority";

export type CommandCentreAccessInput = {
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
  role?: string;
  /**
   * Session principal id (`PlatformSession.clerkUserId`). Non-interactive
   * API-key principals (`api_key:*`) can never reach Command Centre — see
   * `hasPlatformAuthority` / `isApiKeyPrincipal`.
   */
  principalId?: string | null;
};

/** True when the signed-in user is DigitalGate staff, independent of the active tenant. */
export function isDigitalGateStaffEmail(email?: string | null): boolean {
  const normalised = email?.trim().toLowerCase() ?? "";
  return normalised.endsWith("@digitalgate.com.au");
}

/**
 * True when the *active* tenant may see Command Centre.
 *
 * SECURITY BOUNDARY — delegates to the single platform-authority source.
 * Platform authority requires either the explicit `dg:staff` role or the
 * `owner` role while operating inside a server-allowlisted operator organisation.
 * Ordinary `admin` / `member` membership in that organisation is insufficient.
 * Organisation name and slug are tenant-editable and are intentionally ignored:
 * any user could otherwise create an organisation called "DigitalGate …" and
 * inherit operator privileges.
 *
 * `organisationName` / `organisationSlug` remain on the input type only so
 * existing callers keep compiling; they are never read.
 */
export function canAccessCommandCentre(input: CommandCentreAccessInput): boolean {
  return hasPlatformAuthority({
    organisationId: input.organisationId,
    role: input.role,
    principalId: input.principalId,
  });
}

/**
 * DigitalGate operator org — exclude from customer benchmarking where noted.
 *
 * Presentation-only filter, but it shares the platform-authority source so a
 * tenant cannot classify itself as the operator org by naming.
 */
export function isPlatformOperatorOrganisation(org: {
  organisationId?: string;
  organisationSlug?: string | null;
  organisationName?: string | null;
}): boolean {
  return isPlatformOperatorOrganisationId(org.organisationId);
}

/** Industry app ids (kept for docs / optional tooling). */
export const OPERATOR_ORG_HIDDEN_APP_IDS = [
  "real-estate",
  "accommodation",
  "property-management",
  "commercial",
  "property-development",
  "services",
  "finance",
  "automotive",
  "creator",
] as const;

/**
 * Previously stripped Industry apps from the DigitalGate operator org nav.
 * No longer filters — staff must activate/deactivate Industry floors on DG for
 * testing and demo. Kept as a pass-through for callers.
 */
export function filterEnabledAppsForOperatorOrg(
  enabledIds: string[],
  _isOperatorOrg: boolean,
): string[] {
  return enabledIds;
}

