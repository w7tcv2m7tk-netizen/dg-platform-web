export async function getPlatformSetupStatus(organisationId: string) {
  const { prisma } = await import("@dg/database");

  const [contactCount, activityCount, membershipCount] = await Promise.all([
    prisma.contact.count({
      where: { organisationId, deletedAt: null },
    }),
    prisma.activity.count({
      where: { organisationId },
    }),
    prisma.membership.count({
      where: { organisationId },
    }),
  ]);

  return {
    orgProvisioned: true,
    hasTeamMember: membershipCount > 0,
    hasContacts: contactCount > 0,
    hasTimelineActivity: activityCount > 0,
    contactCount,
    activityCount,
  };
}

export type PlatformSetupStatus = Awaited<
  ReturnType<typeof getPlatformSetupStatus>
>;
