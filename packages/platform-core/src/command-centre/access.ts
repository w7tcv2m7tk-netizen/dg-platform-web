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
