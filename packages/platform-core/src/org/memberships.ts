import { getDefaultEnabledAppIds } from "../apps/org-apps";
import { isPlatformOperatorOrganisationId } from "../access/platform-authority";
import { ORG_BRAND_PRESETS } from "./brand-presets";
import { seedWordPressConnectorForTemplate } from "../connectors/wordpress/org-connector";
import type { ProvisionOrganisationResult } from "./provision";

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

  const memberships = await prisma.membership.findMany({
    where: {
      clerkUserId,
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  return sortPlatformOperatorFirst(memberships).map((m) => ({
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

  const memberships = await prisma.membership.findMany({
    where: {
      clerkUserId,
      status: "active",
      organisation: { status: { not: "archived" } },
    },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  return sortPlatformOperatorFirst(memberships)[0] ?? null;
}

export interface CreateOrganisationInput {
  clerkUserId: string;
  email: string;
  name: string;
  orgName: string;
  template?: OrgTemplate;
}

export type FirstOrganisationMembership = {
  id: string;
  organisationId: string;
  role: string;
  organisation: { slug: string };
};

/** Makes repeat submits idempotent without granting a new membership. */
export function decideFirstOrganisation(
  memberships: FirstOrganisationMembership[],
):
  | { kind: "create" }
  | { kind: "retry"; result: ProvisionOrganisationResult }
  | { kind: "conflict" } {
  if (memberships.length === 0) return { kind: "create" };
  if (memberships.length === 1 && memberships[0].role === "owner") {
    const membership = memberships[0];
    return {
      kind: "retry",
      result: {
        organisationId: membership.organisationId,
        membershipId: membership.id,
        slug: membership.organisation.slug,
        created: false,
      },
    };
  }
  return { kind: "conflict" };
}

/** Create an additional organisation for an existing user (multi-business). */
export async function createOrganisationForUser(
  input: CreateOrganisationInput,
): Promise<ProvisionOrganisationResult> {
  return createOrganisation(input);
}

/**
 * Explicit first-organisation bootstrap for a verified human Clerk identity.
 * Membership creation is part of the organisation insert transaction. A
 * per-user advisory lock makes concurrent submits and network retries safe.
 */
export async function createFirstOrganisationForUser(
  input: CreateOrganisationInput,
): Promise<ProvisionOrganisationResult> {
  const orgName = input.orgName.trim();
  if (!orgName) throw new Error("Organisation name is required");
  if (!process.env.DATABASE_URL) throw new Error("Platform database is not configured");

  const { prisma } = await import("@dg/database");
  const { created, result } = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`dg-first-org:${input.clerkUserId}`}))`;

    const memberships = await tx.membership.findMany({
      where: {
        clerkUserId: input.clerkUserId,
        status: "active",
        organisation: { status: { not: "archived" } },
      },
      include: { organisation: true },
      orderBy: { createdAt: "asc" },
    });

    const disposition = decideFirstOrganisation(memberships);
    if (disposition.kind === "retry") {
      return { created: false, result: disposition.result };
    }
    if (disposition.kind === "conflict") {
      throw new Error("An existing organisation membership requires normal sign-in");
    }

    const result = await createOrganisationRecord(tx, input);
    return { created: true, result };
  });

  if (created) await publishOrganisationCreated(input, result);
  return result;
}

async function createOrganisation(
  input: CreateOrganisationInput,
): Promise<ProvisionOrganisationResult> {
  const orgName = input.orgName.trim();
  if (!orgName) {
    throw new Error("Organisation name is required");
  }

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
  const result = await createOrganisationRecord(prisma, input, slug);
  await publishOrganisationCreated(input, result);
  return result;
}

async function createOrganisationRecord(
  db: import("@dg/database").Prisma.TransactionClient | typeof import("@dg/database").prisma,
  input: CreateOrganisationInput,
  requestedSlug?: string,
): Promise<ProvisionOrganisationResult> {
  const orgName = input.orgName.trim();
  const template = input.template ?? "default";
  const slug = requestedSlug ?? (slugify(orgName) || slugify(input.email.split("@")[0]));
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  let uniqueSlug = slug;
  let suffix = 0;
  while (await db.organisation.findUnique({ where: { slug: uniqueSlug } })) {
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

  const org = await db.organisation.create({
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

  return {
    organisationId: org.id,
    membershipId: membership.id,
    slug: org.slug,
    created: true,
  };
}

async function publishOrganisationCreated(
  input: CreateOrganisationInput,
  result: ProvisionOrganisationResult,
) {
  if (!result.created) return;
  const { platformEvents } = await import("../events");
  await platformEvents.publish({
    type: "organisation.created",
    organisationId: result.organisationId,
    actorId: input.clerkUserId,
    payload: { slug: result.slug, name: input.orgName.trim(), template: input.template ?? "default" },
    occurredAt: new Date(),
  });
}
