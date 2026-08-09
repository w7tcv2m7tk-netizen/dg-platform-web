export type CommandCentreOrgRef = {
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
};

export type CommandCentreAccessInput = {
  organisationId: string;
  organisationName?: string;
  organisationSlug?: string;
  role?: string;
  /** All orgs the user belongs to — Command Centre unlocks if ANY is DigitalGate. */
  organisations?: CommandCentreOrgRef[];
};

function orgLooksLikeDigitalGate(org: {
  organisationId?: string;
  organisationName?: string;
  organisationSlug?: string;
}): boolean {
  const slug = org.organisationSlug?.toLowerCase() ?? "";
  if (slug === "digitalgate" || slug.startsWith("digitalgate-")) {
    return true;
  }
  const name = org.organisationName?.toLowerCase() ?? "";
  return /\bdigitalgate\b/.test(name);
}

/** True when this user may see Command Centre (DigitalGate staff / operator org). */
export function canAccessCommandCentre(input: CommandCentreAccessInput): boolean {
  const allowlist = process.env.DG_COMMAND_CENTRE_ORG_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (allowlist?.length) {
    if (allowlist.includes(input.organisationId)) return true;
    if (input.organisations?.some((o) => allowlist.includes(o.organisationId))) {
      return true;
    }
  }

  if (input.role === "dg:staff") {
    return true;
  }

  if (
    orgLooksLikeDigitalGate({
      organisationId: input.organisationId,
      organisationName: input.organisationName,
      organisationSlug: input.organisationSlug,
    })
  ) {
    return true;
  }

  // Staff often work inside a client org — still show Command Centre if they
  // also belong to DigitalGate (or another allowlisted operator org).
  if (
    input.organisations?.some((o) =>
      orgLooksLikeDigitalGate({
        organisationId: o.organisationId,
        organisationName: o.organisationName,
        organisationSlug: o.organisationSlug,
      }),
    )
  ) {
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
