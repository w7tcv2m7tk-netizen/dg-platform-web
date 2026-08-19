/**
 * Team invites — pending seats (`invite:email`) become real memberships
 * when the person signs in, at the role chosen on the invite.
 */

export type TeamInviteRole = "admin" | "member";

export function normalizeTeamInviteRole(role: unknown): TeamInviteRole {
  return role === "admin" ? "admin" : "member";
}

export function teamInvitePlaceholderId(email: string): string {
  return `invite:${email.trim().toLowerCase()}`;
}

export function parseTeamInviteMetadata(
  meta: Record<string, unknown> | null | undefined,
): { organisationId?: string; role?: TeamInviteRole } {
  if (!meta) return {};
  const organisationId =
    typeof meta.dgOrganisationId === "string" && meta.dgOrganisationId.trim()
      ? meta.dgOrganisationId.trim()
      : undefined;
  const role =
    meta.dgRole === "admin" || meta.dgRole === "member"
      ? meta.dgRole
      : undefined;
  return { organisationId, role };
}

export type ClaimedTeamInvite = {
  organisationId: string;
  membershipId: string;
  slug: string;
  role: string;
};

async function loadOrgSlug(organisationId: string): Promise<string> {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { slug: true },
  });
  return org?.slug ?? organisationId;
}

/**
 * Activate a pending (or removed) seat for this Clerk user in one org.
 */
export async function activateTeamInviteSeat(input: {
  organisationId: string;
  clerkUserId: string;
  email: string;
  name?: string;
  role: TeamInviteRole;
}): Promise<ClaimedTeamInvite | null> {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  const email = input.email.trim().toLowerCase();
  const placeholderId = teamInvitePlaceholderId(email);
  const displayName = input.name?.trim() || email.split("@")[0] || email;

  const existing = await prisma.membership.findFirst({
    where: {
      organisationId: input.organisationId,
      clerkUserId: input.clerkUserId,
    },
  });

  const pending = await prisma.membership.findFirst({
    where: {
      organisationId: input.organisationId,
      OR: [{ clerkUserId: placeholderId }, { email, status: "invited" }],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    const updated = await prisma.membership.update({
      where: { id: existing.id },
      data: {
        status: "active",
        role: existing.role === "owner" ? "owner" : input.role,
        email,
        displayName: existing.displayName?.trim() || displayName,
      },
    });
    if (pending && pending.id !== existing.id) {
      await prisma.membership.update({
        where: { id: pending.id },
        data: { status: "removed" },
      });
    }
    return {
      organisationId: input.organisationId,
      membershipId: updated.id,
      slug: await loadOrgSlug(input.organisationId),
      role: updated.role,
    };
  }

  if (pending) {
    const updated = await prisma.membership.update({
      where: { id: pending.id },
      data: {
        clerkUserId: input.clerkUserId,
        status: "active",
        role: input.role,
        email,
        displayName: pending.displayName?.trim() || displayName,
      },
    });
    return {
      organisationId: input.organisationId,
      membershipId: updated.id,
      slug: await loadOrgSlug(input.organisationId),
      role: updated.role,
    };
  }

  const created = await prisma.membership.create({
    data: {
      organisationId: input.organisationId,
      clerkUserId: input.clerkUserId,
      role: input.role,
      status: "active",
      email,
      displayName,
    },
  });
  return {
    organisationId: input.organisationId,
    membershipId: created.id,
    slug: await loadOrgSlug(input.organisationId),
    role: created.role,
  };
}

/** Store a pending seat until they accept and sign in. */
export async function ensurePendingTeamInvite(input: {
  organisationId: string;
  email: string;
  role: TeamInviteRole;
}): Promise<{ membershipId: string; created: boolean }> {
  if (!process.env.DATABASE_URL) {
    return { membershipId: "", created: false };
  }
  const { prisma } = await import("@dg/database");
  const email = input.email.trim().toLowerCase();
  const placeholderId = teamInvitePlaceholderId(email);

  const existing = await prisma.membership.findFirst({
    where: {
      organisationId: input.organisationId,
      OR: [{ email }, { clerkUserId: placeholderId }],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    if (existing.status === "active" && !existing.clerkUserId.startsWith("invite:")) {
      return { membershipId: existing.id, created: false };
    }
    const updated = await prisma.membership.update({
      where: { id: existing.id },
      data: {
        clerkUserId: existing.clerkUserId.startsWith("invite:")
          ? placeholderId
          : existing.clerkUserId,
        email,
        role: existing.role === "owner" ? "owner" : input.role,
        status: existing.clerkUserId.startsWith("invite:") ? "invited" : existing.status,
      },
    });
    return { membershipId: updated.id, created: false };
  }

  const created = await prisma.membership.create({
    data: {
      organisationId: input.organisationId,
      clerkUserId: placeholderId,
      email,
      role: input.role,
      status: "invited",
      displayName: email.split("@")[0] ?? email,
    },
  });
  return { membershipId: created.id, created: true };
}

/**
 * Convert every pending invite for this email into an active membership.
 * Also honours Clerk invitation publicMetadata (dgOrganisationId / dgRole).
 */
export async function claimTeamInvitesForUser(input: {
  clerkUserId: string;
  email: string;
  name?: string;
  organisationId?: string;
  role?: TeamInviteRole;
}): Promise<ClaimedTeamInvite | null> {
  if (!process.env.DATABASE_URL) return null;

  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return null;

  const { prisma } = await import("@dg/database");
  const placeholderId = teamInvitePlaceholderId(email);

  const pending = await prisma.membership.findMany({
    where: {
      status: { in: ["invited", "removed"] },
      OR: [{ clerkUserId: placeholderId }, { email }],
    },
    orderBy: { updatedAt: "desc" },
  });

  const claimed: ClaimedTeamInvite[] = [];
  const seen = new Set<string>();

  const queue: Array<{ organisationId: string; role: TeamInviteRole }> = [];
  for (const row of pending) {
    if (row.status === "removed" && row.clerkUserId !== placeholderId) continue;
    queue.push({
      organisationId: row.organisationId,
      role: normalizeTeamInviteRole(row.role),
    });
  }
  if (input.organisationId) {
    queue.unshift({
      organisationId: input.organisationId,
      role: input.role ?? "member",
    });
  }

  for (const item of queue) {
    if (seen.has(item.organisationId)) continue;
    seen.add(item.organisationId);
    const seat = await activateTeamInviteSeat({
      organisationId: item.organisationId,
      clerkUserId: input.clerkUserId,
      email,
      name: input.name,
      role: item.role,
    });
    if (seat) claimed.push(seat);
  }

  if (input.organisationId) {
    return claimed.find((c) => c.organisationId === input.organisationId) ?? claimed[0] ?? null;
  }
  return claimed[0] ?? null;
}
