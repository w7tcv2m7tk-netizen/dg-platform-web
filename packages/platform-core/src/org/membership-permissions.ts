import type { Prisma } from "@dg/database";

import type { PermissionGrant } from "../access/roles";
import { getMembershipProfile, type MembershipProfile } from "./membership-profile";

export type UpdateMembershipPermissionsResult =
  | { ok: true; member: MembershipProfile }
  | { ok: false; code: "db_unavailable" | "not_found" | "forbidden_owner"; message: string };

/**
 * Replace a membership's explicit granular grants.
 *
 * Role defaults remain the baseline; these grants add deliberately authorised
 * exceptions. Authority to call this function is enforced by the API layer.
 */
export async function updateMembershipPermissions(input: {
  organisationId: string;
  membershipId: string;
  grants: PermissionGrant[];
}): Promise<UpdateMembershipPermissionsResult> {
  if (!process.env.DATABASE_URL) {
    return { ok: false, code: "db_unavailable", message: "Database not configured" };
  }

  const { prisma } = await import("@dg/database");
  const target = await prisma.membership.findFirst({
    where: { id: input.membershipId, organisationId: input.organisationId },
    select: { id: true, role: true },
  });

  if (!target) {
    return { ok: false, code: "not_found", message: "Team member not found" };
  }
  if (target.role === "owner") {
    return {
      ok: false,
      code: "forbidden_owner",
      message: "The Organisation Owner already has full organisation access",
    };
  }

  await prisma.membership.update({
    where: { id: target.id },
    data: { permissions: input.grants as unknown as Prisma.InputJsonValue },
  });

  const member = await getMembershipProfile(input.organisationId, target.id);
  if (!member) {
    return { ok: false, code: "not_found", message: "Team member not found" };
  }
  return { ok: true, member };
}
