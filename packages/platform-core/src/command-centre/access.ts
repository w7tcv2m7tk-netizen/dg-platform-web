export type CommandCentreAccessInput = {
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
  role?: string;
};

/** True when the signed-in user is DigitalGate staff, independent of the active tenant. */
export function isDigitalGateStaffEmail(email?: string | null): boolean {
  const normalised = email?.trim().toLowerCase() ?? "";
  return normalised.endsWith("@digitalgate.com.au");
}

/** True when the *active* tenant may see Command Centre (DigitalGate operator org only). */
export function canAccessCommandCentre(input: CommandCentreAccessInput): boolean {
  const allowlist = process.env.DG_COMMAND_CENTRE_ORG_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (allowlist?.length && allowlist.includes(input.organisationId)) {
    return true;
  }

  if (input.role === "dg:staff") {
    return true;
  }

  const slug = input.organisationSlug?.toLowerCase() ?? "";
  if (slug === "digitalgate" || slug.startsWith("digitalgate-")) {
    return true;
  }

  const name = input.organisationName?.toLowerCase() ?? "";
  if (/\bdigitalgate\b/.test(name)) {
    return true;
  }

  return false;
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

