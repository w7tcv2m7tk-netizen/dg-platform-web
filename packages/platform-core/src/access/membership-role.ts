/**
 * Bridge DB membership.role strings ↔ locked OrganisationRole / PlatformUserType.
 * Runtime DB values: owner | admin | member | dg:staff
 */

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
 * Platform user type when on DigitalGate operator org (or staff claim).
 * Owner of digitalgate → digitalgate_owner; dg:staff/admin → digitalgate_admin; else member.
 */
export function toPlatformUserType(input: {
  role: string | null | undefined;
  organisationSlug?: string | null;
  email?: string | null;
}): PlatformUserType | null {
  const slug = (input.organisationSlug ?? "").toLowerCase();
  const isOperator =
    slug === "digitalgate" ||
    slug.startsWith("digitalgate-") ||
    normalizeMembershipRole(input.role) === "dg:staff";
  if (!isOperator) return null;

  const r = normalizeMembershipRole(input.role);
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
