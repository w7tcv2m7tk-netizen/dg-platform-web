/**
 * Organisation provisioning — called on Clerk signup / org creation.
 * Implementation uses Prisma when DATABASE_URL is configured.
 */

export interface ProvisionOrganisationInput {
  clerkUserId: string;
  clerkOrgId?: string;
  email: string;
  name: string;
  orgName?: string;
  /** Platform Refer & Earn code from /r/{code} cookie or query */
  referralCode?: string | null;
}

export interface ProvisionOrganisationResult {
  organisationId: string;
  membershipId: string;
  slug: string;
  created: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function deriveOrgName(input: ProvisionOrganisationInput): string {
  if (input.orgName?.trim()) {
    return input.orgName.trim();
  }
  const name = input.name?.trim();
  // Require a real personal name — empty / punctuation-only became "'s Organisation"
  if (
    name &&
    name !== input.email &&
    !name.includes("@") &&
    /[a-z0-9]/i.test(name)
  ) {
    return `${name}'s Organisation`;
  }
  const local = input.email.split("@")[0]?.replace(/[^a-z0-9]+/gi, " ").trim();
  if (local) {
    return `${local.charAt(0).toUpperCase()}${local.slice(1)} Organisation`;
  }
  return "My Organisation";
}

/**
 * Provision tenant on first sign-in. Returns stub when DB not configured.
 */
export async function provisionOrganisation(
  input: ProvisionOrganisationInput,
): Promise<ProvisionOrganisationResult> {
  const orgName = deriveOrgName(input);
  const slug = slugify(orgName) || slugify(input.email.split("@")[0]);

  if (!process.env.DATABASE_URL) {
    return {
      organisationId: `pending_${input.clerkUserId}`,
      membershipId: `pending_${input.clerkUserId}`,
      slug,
      created: false,
    };
  }

  const { prisma } = await import("@dg/database");

  const existing = await prisma.membership.findFirst({
    where: { clerkUserId: input.clerkUserId },
    include: { organisation: true },
  });

  if (existing) {
    if (
      input.orgName?.trim() &&
      existing.organisation.name !== input.orgName.trim() &&
      existing.organisation.name.endsWith("'s Organisation")
    ) {
      await prisma.organisation.update({
        where: { id: existing.organisationId },
        data: { name: input.orgName.trim() },
      });
    }
    return {
      organisationId: existing.organisationId,
      membershipId: existing.id,
      slug: existing.organisation.slug,
      created: false,
    };
  }

  let uniqueSlug = slug;
  let suffix = 0;
  while (await prisma.organisation.findUnique({ where: { slug: uniqueSlug } })) {
    suffix += 1;
    uniqueSlug = `${slug}-${suffix}`;
  }

  const org = await prisma.organisation.create({
    data: {
      name: orgName,
      slug: uniqueSlug,
      clerkOrgId: input.clerkOrgId ?? null,
      locale: "en-AU",
      timezone: "Australia/Brisbane",
      currency: "AUD",
      status: "trial",
      memberships: {
        create: {
          clerkUserId: input.clerkUserId,
          role: "owner",
          status: "active",
          email: input.email,
          displayName: input.name,
        },
      },
      appInstallations: {
        create: {
          appId: "crm",
          version: "1.0.0",
          enabled: true,
        },
      },
    },
    include: { memberships: true },
  });

  const membership = org.memberships[0];

  const { platformEvents } = await import("../events");
  await platformEvents.publish({
    type: "organisation.created",
    organisationId: org.id,
    actorId: input.clerkUserId,
    payload: { slug: org.slug, name: org.name },
    occurredAt: new Date(),
  });

  if (input.referralCode) {
    try {
      const { attributeOrganisationReferral, ensureReferralCode } = await import(
        "../referrals"
      );
      await attributeOrganisationReferral({
        organisationId: org.id,
        referralCode: input.referralCode,
        inviteEmail: input.email,
      });
      // New orgs also get their own share code for Refer & Earn
      await ensureReferralCode(org.id);
    } catch (err) {
      console.warn("[provision] referral attribution failed", err);
    }
  } else {
    try {
      const { ensureReferralCode } = await import("../referrals");
      await ensureReferralCode(org.id);
    } catch {
      /* non-fatal */
    }
  }

  return {
    organisationId: org.id,
    membershipId: membership.id,
    slug: org.slug,
    created: true,
  };
}
