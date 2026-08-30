/**
 * Platform authority — the single source of truth for "is this caller a
 * DigitalGate platform operator?".
 *
 * SECURITY BOUNDARY. Only server-controlled inputs may appear here:
 *
 *   1. `DG_COMMAND_CENTRE_ORG_IDS` — deployment-time environment allowlist.
 *   2. `membership.role === "dg:staff"` — writable only directly in the
 *      database; the Team UI/API can only assign `admin` | `member`
 *      (see ASSIGNABLE_MEMBERSHIP_ROLES in ./membership-role).
 *
 * Organisation `name`, `slug`, `settings` and any other tenant-editable field
 * MUST NEVER appear in this module. A customer chooses its own organisation
 * name at signup, so deriving platform authority from it lets any user mint
 * operator privileges.
 *
 * Fails closed: with no allowlist configured and no `dg:staff` membership,
 * nobody holds platform authority.
 */

export const PLATFORM_STAFF_ROLE = "dg:staff";

export const PLATFORM_OPERATOR_ORG_IDS_ENV = "DG_COMMAND_CENTRE_ORG_IDS";

/** Organisation ids explicitly designated as platform operators at deploy time. */
export function platformOperatorOrganisationIds(): string[] {
  return (
    process.env[PLATFORM_OPERATOR_ORG_IDS_ENV]?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  );
}

/** True when this organisation id is an allowlisted platform operator org. */
export function isPlatformOperatorOrganisationId(
  organisationId: string | null | undefined,
): boolean {
  const id = organisationId?.trim();
  if (!id) return false;
  return platformOperatorOrganisationIds().includes(id);
}

export type PlatformAuthorityInput = {
  /** Active tenant id from the authenticated session. */
  organisationId?: string | null;
  /** Membership role from the authenticated session. */
  role?: string | null;
};

/**
 * True when the caller acts with DigitalGate platform authority.
 *
 * Never derived from organisation name/slug — see module header.
 */
export function hasPlatformAuthority(input: PlatformAuthorityInput): boolean {
  if (input.role?.trim().toLowerCase() === PLATFORM_STAFF_ROLE) return true;
  return isPlatformOperatorOrganisationId(input.organisationId);
}
