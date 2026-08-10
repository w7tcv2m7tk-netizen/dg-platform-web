import { getDefaultEnabledAppIds } from "../apps/org-apps";
import { ORG_BRAND_PRESETS } from "./brand-presets";
import { seedWordPressConnectorForTemplate } from "../connectors/wordpress/org-connector";
import type { ProvisionOrganisationResult } from "./provision";

export type OrgTemplate = "default" | "real-estate" | "accommodation" | "creator";

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
    "websites",
    "accommodation",
    "reviews",
    "marketing",
    "automation",
  ],
  creator: [
    "crm",
    "commerce",
    "websites",
    "creator",
    "reviews",
    "marketing",
    "automation",
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

/** All organisations the Clerk user belongs to. */
export async function listUserOrganisations(
  clerkUserId: string,
): Promise<UserOrganisationSummary[]> {
  if (!process.env.DATABASE_URL) return [];

  const { prisma } = await import("@dg/database");

  const memberships = await prisma.membership.findMany({
    where: {
      clerkUserId,
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map((m) => ({
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
    if (active) return active;
  }

  return prisma.membership.findFirst({
    where: {
      clerkUserId,
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });
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
              : null,
      settings: {
        apps: { enabled: enabledApps },
        // Template orgs enter the matching closed-beta program
        ...(template === "real-estate"
          ? { featureFlags: { "re.beta": true } }
          : template === "accommodation"
            ? { featureFlags: { "acc.beta": true } }
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
