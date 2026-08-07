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
  avatarUrl: string | null;
  /** Clerk account image when available (may differ from avatarUrl override). */
  clerkImageUrl?: string | null;
  externalRefs: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type MembershipProfilePatch = {
  displayName?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
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
  avatarUrl: string | null;
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
    avatarUrl: m.avatarUrl,
    externalRefs: (m.externalRefs as Record<string, unknown> | null) ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

/** List active + invited members for an organisation (Team page). */
export async function listOrganisationMembers(
  organisationId: string,
): Promise<MembershipProfile[]> {
  if (!process.env.DATABASE_URL) return [];

  const { prisma } = await import("@dg/database");
  const rows = await prisma.membership.findMany({
    where: {
      organisationId,
      status: { in: ["active", "invited"] },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeMembership);
}

/**
 * Enrich memberships with Clerk account name/image.
 * Fills empty displayName from Clerk; exposes clerkImageUrl for UI fallback.
 */
export async function enrichMembersWithClerkAccount(
  members: MembershipProfile[],
): Promise<MembershipProfile[]> {
  if (!members.length) return members;

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const ids = [...new Set(members.map((m) => m.clerkUserId).filter(Boolean))];
    if (!ids.length) return members;

    const users = await client.users.getUserList({ userId: ids, limit: 100 });
    const byId = new Map(users.data.map((u) => [u.id, u]));

    return members.map((m) => {
      const user = byId.get(m.clerkUserId);
      if (!user) return m;
      const clerkName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.primaryEmailAddress?.emailAddress ||
        null;
      return {
        ...m,
        displayName: m.displayName?.trim() || clerkName,
        email: m.email || user.primaryEmailAddress?.emailAddress || null,
        // Keep stored team avatar separate; UI falls back to clerkImageUrl.
        clerkImageUrl: user.imageUrl || null,
      };
    });
  } catch {
    return members;
  }
}

/** Pull Clerk name/email/image into membership when fields are empty. */
export async function syncMembershipFromClerkAccount(input: {
  organisationId: string;
  clerkUserId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
}): Promise<MembershipProfile | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const existing = await prisma.membership.findFirst({
    where: {
      organisationId: input.organisationId,
      clerkUserId: input.clerkUserId,
      status: "active",
    },
  });
  if (!existing) return null;

  const data: Prisma.MembershipUpdateInput = {};
  if (!existing.displayName?.trim() && input.name?.trim()) {
    data.displayName = input.name.trim();
  }
  if (!existing.email?.trim() && input.email?.trim()) {
    data.email = input.email.trim().toLowerCase();
  }
  // Team avatar is an explicit override — Clerk image is shown via enrichMembersWithClerkAccount.

  if (Object.keys(data).length === 0) {
    return serializeMembership(existing);
  }

  const updated = await prisma.membership.update({
    where: { id: existing.id },
    data,
  });
  return serializeMembership(updated);
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
  if (patch.avatarUrl !== undefined) {
    data.avatarUrl = patch.avatarUrl?.trim() || null;
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
