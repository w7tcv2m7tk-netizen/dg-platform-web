import type { Prisma } from "@dg/database";

export type MembershipProfile = {
  id: string;
  organisationId: string;
  clerkUserId: string;
  role: string;
  status: string;
  /** Clerk login email cache — not the public card address. */
  email: string | null;
  /** Per-org public contact email on the team / agent card. */
  publicEmail: string | null;
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
  publicEmail?: string | null;
};

/** Email shown on team cards / website agents — public override, else login email. */
export function membershipCardEmail(
  m: Pick<MembershipProfile, "publicEmail" | "email">,
): string | null {
  return m.publicEmail?.trim() || m.email?.trim() || null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() || "";
  return trimmed || null;
}

function serializeMembership(m: {
  id: string;
  organisationId: string;
  clerkUserId: string;
  role: string;
  status: string;
  email: string | null;
  publicEmail: string | null;
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
    publicEmail: m.publicEmail,
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
  // Do not copy Clerk image into membership.avatarUrl — that freezes a stale URL.
  // UI uses clerkImageUrl as live fallback until the member uploads a custom photo.

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
  if (patch.publicEmail !== undefined) {
    data.publicEmail = normalizeEmail(patch.publicEmail);
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
