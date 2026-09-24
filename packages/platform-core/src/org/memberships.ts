import { getDefaultEnabledAppIds } from "../apps/org-apps";
import { isLegacyDemoOrganisation } from "../demo/types";
import { isPlatformOperatorOrganisationId } from "../access/platform-authority";
import { ORG_BRAND_PRESETS } from "./brand-presets";
import { seedWordPressConnectorForTemplate } from "../connectors/wordpress/org-connector";
import type { ProvisionOrganisationResult } from "./provision";

const ACTIVE_BUSINESS_LIMIT_BY_TIER: Record<string, number | null> = {
  starter: 1,
  professional: 1,
  business: 5,
  enterprise: null,
};

export type OrgTemplate =
  | "default"
  | "real-estate"
  | "accommodation"
  | "creator"
  | "services";

export type UserOrganisationSummary = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  membershipId: string;
  role: string;
  createdAt: string;
};

const ORG_TEMPLATE_APPS: Record<OrgTemplate, string[]> = {
  default: getDefaultEnabledAppIds(),
  "real-estate": [
    "crm",
    "commerce",
    "documents",
    "communications",
    "websites",
    "real-estate",
    "reviews",
    "marketing",
    "automation",
    "ai-visibility",
    "seo",
  ],
  accommodation: [
    "crm",
    "commerce",
    "documents",
    "communications",
    "websites",
    "accommodation",
    "reviews",
    "marketing",
    "automation",
  ],
  creator: [
    "crm",
    "commerce",
    "documents",
    "communications",
    "websites",
    "creator",
    "reviews",
    "marketing",
    "automation",
  ],
  services: [
    "crm",
    "commerce",
    "documents",
    "communications",
    "websites",
    "services",
    "reviews",
    "marketing",
    "automation",
    "opportunities",
  ],
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function enabledAppsForTemplate(template: OrgTemplate): string[] {
  return ORG_TEMPLATE_APPS[template] ?? ORG_TEMPLATE_APPS.default;
}

function sortPlatformOperatorFirst<T extends { organisationId: string; createdAt: Date }>(memberships: T[]): T[] {
  return memberships.sort((a, b) => {
    const aIsOperator = isPlatformOperatorOrganisationId(a.organisationId) ? 1 : 0;
    const bIsOperator = isPlatformOperatorOrganisationId(b.organisationId) ? 1 : 0;
    return bIsOperator - aIsOperator || a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/** All organisations the Clerk user belongs to. */
export async function listUserOrganisations(
  clerkUserId: string,
): Promise<UserOrganisationSummary[]> {
  if (!process.env.DATABASE_URL) return [];

  const { prisma } = await import("@dg/database");

  let memberships = await prisma.membership.findMany({
    where: {
      clerkUserId,
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  const isPlatformOperator = memberships.some((membership) =>
    isPlatformOperatorOrganisationId(membership.organisationId),
  );

  // Platform operators always receive staff membership in the canonical demo tenant.
  // Legacy DigitalGate demo organisations remain excluded.
  if (isPlatformOperator) {
    const { grantDemoAccess } = await import("../demo/seed");
    await grantDemoAccess({ clerkUserId, access: "staff" });
    memberships = await prisma.membership.findMany({
      where: {
        clerkUserId,
        status: "active",
        organisation: { status: { not: "archived" } },
      },
      include: { organisation: true },
      orderBy: { createdAt: "asc" },
    });
  }

  return sortPlatformOperatorFirst(
    memberships.filter(
      (m) =>
        !isLegacyDemoOrganisation({
          name: m.organisation.name,
          slug: m.organisation.slug,
        }),
    ),
  ).map((m) => ({
    organisationId: m.organisationId,
    organisationName: m.organisation.name,
    organisationSlug: m.organisation.slug,
    membershipId: m.id,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  }));
}

/** Resolve membership for session — honours active org when valid. */
export async function resolveUserMembership(
  clerkUserId: string,
  activeOrganisationId?: string,
) {
  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");

  if (activeOrganisationId) {
    const active = await prisma.membership.findFirst({
      where: {
        clerkUserId,
        organisationId: activeOrganisationId,
        status: "active",
        organisation: { status: { not: "archived" } },
      },
      include: { organisation: true },
    });
    if (
      active &&
      !isLegacyDemoOrganisation({
        name: active.organisation.name,
        slug: active.organisation.slug,
      })
    ) {
      return active;
    }
  }

  const memberships = await prisma.membership.findMany({
    where: {
      clerkUserId,
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  const visibleMemberships = memberships.filter(
    (m) =>
      !isLegacyDemoOrganisation({
        name: m.organisation.name,
        slug: m.organisation.slug,
      }),
  );

  return sortPlatformOperatorFirst(visibleMemberships)[0] ?? null;
}

export interface CreateOrganisationInput {
  clerkUserId: string;
  email: string;
  name: string;
  orgName: string;
  template?: OrgTemplate;
}

/** Create an additional organisation for an existing user (multi-business). */
export async function createOrganisationForUser(
  input: CreateOrganisationInput,
): Promise<ProvisionOrganisationResult> {
  const orgName = input.orgName.trim();
  if (!orgName) {
    throw new Error("Organisation name is required");
  }

  const template = input.template ?? "default";
  const slug = slugify(orgName) || slugify(input.email.split("@")[0]);

  if (!process.env.DATABASE_URL) {
    return {
      organisationId: `pending_${input.clerkUserId}_${Date.now()}`,
      membershipId: `pending_${input.clerkUserId}_${Date.now()}`,
      slug,
      created: false,
    };
  }

  const { prisma } = await import("@dg/database");

  // Provisioning entitlement only: organisations remain isolated tenants.
  const ownedActiveOrganisations = await prisma.membership.findMany({
    where: {
      clerkUserId: input.clerkUserId,
      role: "owner",
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    select: { organisationId: true },
  });

  if (ownedActiveOrganisations.length > 0) {
    const subscriptions = await prisma.platformSubscription.findMany({
      where: { organisationId: { in: ownedActiveOrganisations.map((m) => m.organisationId) } },
      select: { planTier: true },
    });
    const tierRank: Record<string, number> = { starter: 0, professional: 1, business: 2, enterprise: 3 };
    const accountTier = subscriptions
      .map((s) => s.planTier)
      .filter((tier): tier is string => Boolean(tier && tier in tierRank))
      .sort((a, b) => tierRank[b] - tierRank[a])[0] ?? "starter";
    const limit = ACTIVE_BUSINESS_LIMIT_BY_TIER[accountTier] ?? 1;

    if (limit != null && ownedActiveOrganisations.length >= limit) {
      const planName = accountTier === "business" ? "Scale" : accountTier === "professional" ? "Growth" : "Starter";
      throw new Error(
        `plan_business_limit: ${planName} supports up to ${limit} active business${limit === 1 ? "" : "es"} under this account. Upgrade the Core Platform plan to add another business.`,
      );
    }
  }

  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  let uniqueSlug = slug;
  let suffix = 0;
  while (await prisma.organisation.findUnique({ where: { slug: uniqueSlug } })) {
    suffix += 1;
    uniqueSlug = `${slug}-${suffix}`;
  }

  const enabledApps = enabledAppsForTemplate(template);
  const wpConnector = seedWordPressConnectorForTemplate(template);
  const brandPreset =
    template === "real-estate"
      ? ORG_BRAND_PRESETS["roe-realty"].patch
      : template === "accommodation"
        ? ORG_BRAND_PRESETS.cvh.patch
        : template === "creator"
          ? ORG_BRAND_PRESETS.aetherra.patch
          : undefined;

  const org = await prisma.organisation.create({
    data: {
      name: orgName,
      slug: uniqueSlug,
      locale: "en-AU",
      timezone: "Australia/Brisbane",
      currency: "AUD",
      status: "trial",
      industry:
        template === "real-estate"
          ? "real_estate"
          : template === "accommodation"
            ? "hospitality"
            : template === "creator"
              ? "creator"
              : template === "services"
                ? "services"
                : null,
      settings: {
        apps: { enabled: enabledApps },
        // Template orgs enter the matching closed-beta program
        ...(template === "real-estate"
          ? { featureFlags: { "re.beta": true } }
          : template === "accommodation"
            ? { featureFlags: { "acc.beta": true } }
            : {}),
        ...(template === "services"
          ? {
              services: {
                templateKey: "general",
                appliedAt: new Date().toISOString(),
              },
            }
          : {}),
        profile: {
          businessName: orgName,
          industryVertical:
            template === "real-estate"
              ? "real_estate"
              : template === "accommodation"
                ? "hospitality"
                : template === "creator"
                  ? "creator"
                  : template === "services"
                    ? "services"
                    : undefined,
          ...(brandPreset ?? {}),
        },
        ...(wpConnector
          ? { connectors: { wordpress: wpConnector } }
          : {}),
      } as unknown as InputJsonValue,
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
        create: enabledApps.map((appId) => ({
          appId,
          version: "1.0.0",
          enabled: true,
        })),
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
    payload: { slug: org.slug, name: org.name, template },
    occurredAt: new Date(),
  });

  return {
    organisationId: org.id,
    membershipId: membership.id,
    slug: org.slug,
    created: true,
  };
}
