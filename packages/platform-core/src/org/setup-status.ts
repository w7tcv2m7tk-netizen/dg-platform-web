export async function getPlatformSetupStatus(organisationId: string) {
  const { prisma } = await import("@dg/database");

  const [contactCount, activityCount, membershipCount, publishedWebsiteCount] = await Promise.all([
    prisma.contact.count({
      where: { organisationId, deletedAt: null },
    }),
    prisma.activity.count({
      where: { organisationId },
    }),
    prisma.membership.count({
      where: { organisationId },
    }),
    prisma.website.count({
      where: { organisationId, status: "published" },
    }),
  ]);

  return {
    orgProvisioned: true,
    hasTeamMember: membershipCount > 0,
    hasContacts: contactCount > 0,
    hasTimelineActivity: activityCount > 0,
    hasPublishedWebsite: publishedWebsiteCount > 0,
    contactCount,
    activityCount,
  };
}

export type PlatformSetupStatus = Awaited<
  ReturnType<typeof getPlatformSetupStatus>
>;
