import type { Prisma } from "@dg/database";

export type MembershipProfile = {
  id: string;
  organisationId: string;
  clerkUserId: string;
  role: string;
  status: string;
  email: string | null;
  displayName: string | null;
  bio: string | null;
  jobTitle: string | null;
  phone: string | null;
  externalRefs: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type MembershipProfilePatch = {
  displayName?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
};

function serializeMembership(m: {
  id: string;
  organisationId: string;
  clerkUserId: string;
  role: string;
  status: string;
  email: string | null;
  displayName: string | null;
  bio: string | null;
  jobTitle: string | null;
  phone: string | null;
  externalRefs: unknown;
  createdAt: Date;
  updatedAt: Date;
}): MembershipProfile {
  return {
    id: m.id,
    organisationId: m.organisationId,
    clerkUserId: m.clerkUserId,
    role: m.role,
    status: m.status,
    email: m.email,
    displayName: m.displayName,
    bio: m.bio,
    jobTitle: m.jobTitle,
    phone: m.phone,
    externalRefs: (m.externalRefs as Record<string, unknown> | null) ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

/** List active members for an organisation (Team page). */
export async function listOrganisationMembers(
  organisationId: string,
): Promise<MembershipProfile[]> {
  if (!process.env.DATABASE_URL) return [];

  const { prisma } = await import("@dg/database");
  const rows = await prisma.membership.findMany({
    where: { organisationId, status: "active" },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeMembership);
}

export async function getMembershipProfile(
  organisationId: string,
  membershipId: string,
): Promise<MembershipProfile | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const row = await prisma.membership.findFirst({
    where: { id: membershipId, organisationId },
  });
  return row ? serializeMembership(row) : null;
}

export async function getMembershipByClerkUser(
  organisationId: string,
  clerkUserId: string,
): Promise<MembershipProfile | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const row = await prisma.membership.findFirst({
    where: { organisationId, clerkUserId, status: "active" },
  });
  return row ? serializeMembership(row) : null;
}

/** Update own (or owner-managed) membership profile fields. */
export async function updateMembershipProfile(
  organisationId: string,
  membershipId: string,
  patch: MembershipProfilePatch,
): Promise<MembershipProfile | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const existing = await prisma.membership.findFirst({
    where: { id: membershipId, organisationId },
  });
  if (!existing) return null;

  const data: Prisma.MembershipUpdateInput = {};
  if (patch.displayName !== undefined) {
    data.displayName = patch.displayName?.trim() || null;
  }
  if (patch.bio !== undefined) {
    data.bio = patch.bio?.trim() || null;
  }
  if (patch.jobTitle !== undefined) {
    data.jobTitle = patch.jobTitle?.trim() || null;
  }
  if (patch.phone !== undefined) {
    data.phone = patch.phone?.trim() || null;
  }

  const updated = await prisma.membership.update({
    where: { id: membershipId },
    data,
  });

  return serializeMembership(updated);
}

export async function setMembershipExternalRefs(
  membershipId: string,
  refs: Record<string, unknown>,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const existing = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { externalRefs: true },
  });
  if (!existing) return;

  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      externalRefs: {
        ...((existing.externalRefs as Record<string, unknown> | null) ?? {}),
        ...refs,
      } as InputJsonValue,
    },
  });
}
