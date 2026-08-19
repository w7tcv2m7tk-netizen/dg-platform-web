export interface PlatformSession {
  clerkUserId: string;
  email: string;
  name: string;
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  membershipId: string;
  role: string;
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

/** Resolve tenant context for the current Clerk user; provisions org if needed. */
export async function resolvePlatformSession(
  input: ResolveSessionInput,
): Promise<PlatformSession | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const { provisionOrganisation } = await import("../org/provision");
  const { resolveUserMembership, listUserOrganisations } = await import("../org/memberships");

  const provisioned = await provisionOrganisation({
    clerkUserId: input.clerkUserId,
    email: input.email,
    name: input.name,
    clerkOrgId: input.clerkOrgId,
    orgName: input.orgName,
    referralCode: input.referralCode,
  });

  // Late attribution when org already existed at signup but cookie arrived later
  if (input.referralCode && provisioned.organisationId) {
    try {
      const { attributeOrganisationReferral } = await import("../referrals");
      await attributeOrganisationReferral({
        organisationId: provisioned.organisationId,
        referralCode: input.referralCode,
        inviteEmail: input.email,
      });
    } catch {
      /* non-fatal */
    }
  }

  const { prisma } = await import("@dg/database");

  const membership = await resolveUserMembership(
    input.clerkUserId,
    input.activeOrganisationId ||
      (provisioned.joinedViaInvite ? provisioned.organisationId : undefined),
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
    dbConfigured: true,
    organisations,
  };
}

export async function getOrganisationById(organisationId: string) {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  return prisma.organisation.findUnique({ where: { id: organisationId } });
}
