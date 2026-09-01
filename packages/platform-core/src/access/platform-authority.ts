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
 * Non-interactive API-key sessions (`api_key:*` principals) never hold platform
 * authority regardless of allowlist/role: a credential must not substitute for
 * an interactive platform-operator identity (see `isApiKeyPrincipal`).
 *
 * Fails closed: with no allowlist configured and no `dg:staff` membership,
 * nobody holds platform authority.
 */

export const PLATFORM_STAFF_ROLE = "dg:staff";

export const PLATFORM_OPERATOR_ORG_IDS_ENV = "DG_COMMAND_CENTRE_ORG_IDS";

/**
 * Synthetic principal-id prefix for non-interactive API-key sessions (see
 * `apiKeyToPlatformSession`). Kept here — beside the authority check that must
 * recognise it — so the detector cannot drift from the session producer.
 */
export const API_KEY_PRINCIPAL_PREFIX = "api_key:";

/**
 * True when the caller is a non-interactive API-key credential rather than an
 * interactive human identity.
 *
 * An API key is minted by a tenant admin, bound to a single organisation, and
 * carries no human accountability. It must never become a substitute for an
 * interactive platform-operator identity, so it never holds platform authority —
 * even when its organisation is on the `DG_COMMAND_CENTRE_ORG_IDS` allowlist.
 */
export function isApiKeyPrincipal(principalId?: string | null): boolean {
  return (
    typeof principalId === "string" &&
    principalId.startsWith(API_KEY_PRINCIPAL_PREFIX)
  );
}

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
  /**
   * Session principal id (e.g. `PlatformSession.clerkUserId`). When it is a
   * non-interactive API-key principal (`api_key:*`) the caller can never hold
   * platform authority. Optional — omit for interactive membership-derived
   * checks, where the principal is always a human.
   */
  principalId?: string | null;
};

/**
 * True when the caller acts with DigitalGate platform authority.
 *
 * Never derived from organisation name/slug — see module header.
 */
export function hasPlatformAuthority(input: PlatformAuthorityInput): boolean {
  // A non-interactive credential never substitutes for an interactive operator.
  if (isApiKeyPrincipal(input.principalId)) return false;
  if (input.role?.trim().toLowerCase() === PLATFORM_STAFF_ROLE) return true;
  return isPlatformOperatorOrganisationId(input.organisationId);
}
