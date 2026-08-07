export type CommandCentreAccessInput = {
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
  role?: string;
};

/** True when this tenant may see Command Centre (DigitalGate internal org only). */
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

/** Industry apps hidden from DigitalGate operator org navigation. */
export const OPERATOR_ORG_HIDDEN_APP_IDS = ["real-estate", "accommodation"] as const;

export function filterEnabledAppsForOperatorOrg(
  enabledIds: string[],
  isOperatorOrg: boolean,
): string[] {
  if (!isOperatorOrg) return enabledIds;
  const hidden = new Set<string>(OPERATOR_ORG_HIDDEN_APP_IDS);
  return enabledIds.filter((id) => !hidden.has(id));
}
