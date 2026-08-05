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
}

export interface ResolveSessionInput {
  clerkUserId: string;
  email: string;
  name: string;
  clerkOrgId?: string;
  orgName?: string;
}

/** Resolve tenant context for the current Clerk user; provisions org if needed. */
export async function resolvePlatformSession(
  input: ResolveSessionInput,
): Promise<PlatformSession | null> {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  const { provisionOrganisation } = await import("../org/provision");
  const result = await provisionOrganisation({
    clerkUserId: input.clerkUserId,
    email: input.email,
    name: input.name,
    clerkOrgId: input.clerkOrgId,
    orgName: input.orgName,
  });

  const { prisma } = await import("@dg/database");

  const membership = await prisma.membership.findFirst({
    where: { clerkUserId: input.clerkUserId },
    include: { organisation: true },
  });

  if (!membership) return null;

  if (input.email && membership.email !== input.email) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        email: input.email,
        displayName: input.name,
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
  };
}

export async function getOrganisationById(organisationId: string) {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  return prisma.organisation.findUnique({ where: { id: organisationId } });
}
