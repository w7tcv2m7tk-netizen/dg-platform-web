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
  /** Server-resolved canonical purchase projections; never populated from profile settings. */
  industryPurchaseIds?: string[];
  premiumPurchaseKeys?: string[];
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

  let industryPurchaseIds: string[] = [];
  let premiumPurchaseKeys: string[] = [];
  try {
    const { authorisedIndustryPurchaseIds, authorisedPremiumPurchaseKeys } = await import("../industry/purchase-authority");
    const subscription = await prisma.platformSubscription.findUnique({
      where: { organisationId: membership.organisationId },
      select: {
        organisationId: true, industryApps: true, premiumApps: true, status: true,
        entitlement: true, stripeStatus: true, stripeSubscriptionId: true,
        stripeCustomerId: true, trialEnd: true, currentPeriodEnd: true,
        gracePeriodEndsAt: true, cancelAtPeriodEnd: true,
      },
    });
    industryPurchaseIds = authorisedIndustryPurchaseIds(subscription, membership.organisationId);
    premiumPurchaseKeys = authorisedPremiumPurchaseKeys(subscription, membership.organisationId);
  } catch {
    // A failed authority read denies paid application features while preserving
    // access to the authenticated core platform.
  }

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
    industryPurchaseIds,
    premiumPurchaseKeys,
    dbConfigured: true,
    organisations,
  };
}

export async function getOrganisationById(organisationId: string) {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");
  return prisma.organisation.findUnique({ where: { id: organisationId } });
}
