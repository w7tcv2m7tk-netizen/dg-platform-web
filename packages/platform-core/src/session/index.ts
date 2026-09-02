export interface PlatformSession {
  clerkUserId: string;
  email: string;
  name: string;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  membershipId: string;
  role: string;
  /** Optional granular grants from membership.permissions */
  permissionGrants?: unknown;
  dbConfigured: boolean;
  organisations: import("../org/memberships").UserOrganisationSummary[];
}

export interface ResolveSessionInput {
  clerkUserId: string;
  email: string;
  name: string;
  clerkOrgId?: string;
  orgName?: string;
  /** Active tenant from cookie — must match a membership or falls back to first org. */
  activeOrganisationId?: string;
  /** Platform Refer & Earn code from /r/{code} cookie */
  referralCode?: string | null;
}

/** Resolve tenant context for the current Clerk user; never provisions an organisation. */
export async function resolvePlatformSession(
  input: ResolveSessionInput,
): Promise<PlatformSession | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const { resolveUserMembership, listUserOrganisations } = await import("../org/memberships");
  const { prisma } = await import("@dg/database");

  // Session resolution is read-only with respect to organisation provisioning.
  // Organisation creation belongs to the explicit onboarding/create flow.
  const membership = await resolveUserMembership(
    input.clerkUserId,
    input.activeOrganisationId,
  );

  if (!membership) return null;

  const organisations = await listUserOrganisations(input.clerkUserId);

  if (input.email && membership.email !== input.email) {
    // Keep login email cache in sync — never overwrite displayName / publicEmail here.
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        email: input.email,
      },
    });
  }

  return {
    clerkUserId: input.clerkUserId,
    email: input.email,
    name: input.name,
    organisationId: membership.organisationId,
    organisationName: membership.organisation.name,
    organisationSlug: membership.organisation.slug,
    membershipId: membership.id,
    role: membership.role,
    permissionGrants:
      (membership as { permissions?: unknown }).permissions ??
      ((membership.externalRefs as { permissionGrants?: unknown } | null)?.permissionGrants ??
        undefined),
    dbConfigured: true,
    organisations,
  };
}

export async function getOrganisationById(organisationId: string) {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  return prisma.organisation.findUnique({ where: { id: organisationId } });
}
