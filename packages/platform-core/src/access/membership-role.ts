/**
 * Bridge DB membership.role strings ↔ locked OrganisationRole / PlatformUserType.
 * Runtime DB values: owner | admin | member | dg:staff
 */

import {
  hasPlatformAuthority,
  isApiKeyPrincipal,
} from "./platform-authority";
import type { OrganisationRole, PlatformUserType } from "./roles";

export const MEMBERSHIP_ROLE_DB = {
  owner: "owner",
  admin: "admin",
  member: "member",
  dgStaff: "dg:staff",
} as const;

export type MembershipRoleDb =
  (typeof MEMBERSHIP_ROLE_DB)[keyof typeof MEMBERSHIP_ROLE_DB];

export function normalizeMembershipRole(role: string | null | undefined): MembershipRoleDb {
  const r = (role ?? "member").trim().toLowerCase();
  if (r === "owner") return "owner";
  if (r === "admin") return "admin";
  if (r === "dg:staff" || r === "dg_staff" || r === "staff") return "dg:staff";
  return "member";
}

export function toOrganisationRole(role: string | null | undefined): OrganisationRole {
  const r = normalizeMembershipRole(role);
  if (r === "owner") return "organisation_owner";
  if (r === "admin") return "organisation_admin";
  return "organisation_member";
}

/**
 * Platform user type for DigitalGate operators.
 *
 * Platform authority comes only from server-controlled inputs — the
 * `DG_COMMAND_CENTRE_ORG_IDS` allowlist or a `dg:staff` membership role.
 * Organisation name/slug is tenant-editable and must never be consulted here
 * (see ./platform-authority).
 *
 * Returns null for every ordinary customer organisation.
 */
export function toPlatformUserType(input: {
  role: string | null | undefined;
  organisationId?: string | null;
  /**
   * Optional pre-resolved platform-authority result. Supplied on the client,
   * where the DG_COMMAND_CENTRE_ORG_IDS allowlist is not readable, so navigation
   * matches the server decision without re-reading server-only env. When omitted
   * (server), authority is computed from the allowlist / dg:staff as before.
   */
  hasAuthority?: boolean;
  /**
   * Session principal id (`PlatformSession.clerkUserId`). API-key principals
   * (`api_key:*`) are non-interactive credentials and never resolve to a
   * platform user type, even if `hasAuthority` is supplied.
   */
  principalId?: string | null;
}): PlatformUserType | null {
  // API keys must not substitute for an interactive platform operator.
  if (isApiKeyPrincipal(input.principalId)) return null;

  const r = normalizeMembershipRole(input.role);

  const authorised =
    input.hasAuthority ??
    hasPlatformAuthority({ organisationId: input.organisationId, role: r });
  if (!authorised) {
    return null;
  }

  if (r === "owner") return "digitalgate_owner";
  if (r === "admin" || r === "dg:staff") return "digitalgate_admin";
  return "digitalgate_member";
}

export function isOrgAdminRole(role: string | null | undefined): boolean {
  const r = normalizeMembershipRole(role);
  return r === "owner" || r === "admin";
}

export function isOrgOwnerRole(role: string | null | undefined): boolean {
  return normalizeMembershipRole(role) === "owner";
}

/** Roles that can be assigned via Team UI (not owner — transfer is separate). */
export const ASSIGNABLE_MEMBERSHIP_ROLES = ["admin", "member"] as const;
export type AssignableMembershipRole = (typeof ASSIGNABLE_MEMBERSHIP_ROLES)[number];

export function isAssignableMembershipRole(
  role: string,
): role is AssignableMembershipRole {
  return (ASSIGNABLE_MEMBERSHIP_ROLES as readonly string[]).includes(role);
}
