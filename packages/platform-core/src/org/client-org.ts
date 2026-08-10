/**
 * Staff-created client organisations (Growth Engine handoff, Command ops).
 * Unlike createOrganisationForUser, this does not assume the actor is the
 * commercial owner — staff get an admin seat so they can switch in and finish
 * onboarding. No Stripe subscription is invented here.
 */

import { getDefaultEnabledAppIds } from "../apps/org-apps";
import type { OrgTemplate } from "./memberships";
import type { ProvisionOrganisationResult } from "./provision";

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

export type ClientOrgProfileSeed = {
  businessName: string;
  websiteUrl?: string | null;
  industry?: string | null;
  location?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

export interface CreateClientOrganisationInput {
  /** Staff Clerk user who can switch into the new client org. */
  actorClerkUserId: string;
  actorEmail?: string | null;
  actorName?: string | null;
  orgName: string;
  template?: OrgTemplate;
  profile?: ClientOrgProfileSeed;
  /** Optional provenance for settings.growth / audit. */
  sourceProspectId?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function industryForTemplate(template: OrgTemplate): string | null {
  if (template === "real-estate") return "real_estate";
  if (template === "accommodation") return "hospitality";
  if (template === "creator") return "creator";
  return null;
}

function verticalForTemplate(template: OrgTemplate): string | undefined {
  if (template === "real-estate") return "real_estate";
  if (template === "accommodation") return "hospitality";
  if (template === "creator") return "creator";
  return undefined;
}

/** Infer org template from free-text industry (same heuristics as Growth proposals). */
export function inferOrgTemplateFromIndustry(
  industry: string | null | undefined,
): OrgTemplate {
  const value = (industry ?? "").toLowerCase();
  if (value.includes("real estate") || value.includes("agency")) {
    return "real-estate";
  }
  if (
    value.includes("accommodation") ||
    value.includes("hotel") ||
    value.includes("holiday") ||
    value.includes("hospitality") ||
    value.includes("short stay") ||
    value.includes("short-stay")
  ) {
    return "accommodation";
  }
  if (value.includes("creator") || value.includes("influencer")) {
    return "creator";
  }
  return "default";
}

/**
 * Create a client tenant org for staff handoff.
 * Does not seed demo WP presets (CVH/Roe) — operators connect the real site later.
 */
export async function createClientOrganisation(
  input: CreateClientOrganisationInput,
): Promise<ProvisionOrganisationResult & { installedAppIds: string[] }> {
  const orgName = input.orgName.trim();
  if (!orgName) {
    throw new Error("Organisation name is required");
  }
  if (!input.actorClerkUserId.trim()) {
    throw new Error("actorClerkUserId is required");
  }

  const template = input.template ?? "default";
  const slugBase = slugify(orgName) || "client";

  if (!process.env.DATABASE_URL) {
    return {
      organisationId: `pending_client_${Date.now()}`,
      membershipId: `pending_client_${Date.now()}`,
      slug: slugBase,
      created: false,
      installedAppIds: ORG_TEMPLATE_APPS[template] ?? ORG_TEMPLATE_APPS.default,
    };
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  let uniqueSlug = slugBase;
  let suffix = 0;
  while (await prisma.organisation.findUnique({ where: { slug: uniqueSlug } })) {
    suffix += 1;
    uniqueSlug = `${slugBase}-${suffix}`;
  }

  const enabledApps = ORG_TEMPLATE_APPS[template] ?? ORG_TEMPLATE_APPS.default;
  const industry =
    industryForTemplate(template) ??
    (input.profile?.industry?.trim() || null);
  const profile = input.profile;

  const org = await prisma.organisation.create({
    data: {
      name: orgName,
      slug: uniqueSlug,
      locale: "en-AU",
      timezone: "Australia/Brisbane",
      currency: "AUD",
      status: "trial",
      industry,
      settings: {
        apps: { enabled: enabledApps },
        ...(template === "real-estate"
          ? { featureFlags: { "re.beta": true } }
          : template === "accommodation"
            ? { featureFlags: { "acc.beta": true } }
            : {}),
        profile: {
          businessName: profile?.businessName?.trim() || orgName,
          websiteUrl: profile?.websiteUrl?.trim() || undefined,
          industryVertical: verticalForTemplate(template),
          location: profile?.location?.trim() || undefined,
          primaryContactName: profile?.contactName?.trim() || undefined,
          primaryContactEmail: profile?.contactEmail?.trim() || undefined,
          primaryContactPhone: profile?.contactPhone?.trim() || undefined,
        },
        ...(input.sourceProspectId
          ? {
              growth: {
                sourceProspectId: input.sourceProspectId,
                transitionedAt: new Date().toISOString(),
              },
            }
          : {}),
      } as unknown as InputJsonValue,
      memberships: {
        create: {
          clerkUserId: input.actorClerkUserId,
          role: "admin",
          status: "active",
          email: input.actorEmail?.trim() || null,
          displayName: input.actorName?.trim() || null,
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
    actorId: input.actorClerkUserId,
    payload: {
      slug: org.slug,
      name: org.name,
      template,
      source: "growth_client_transition",
      sourceProspectId: input.sourceProspectId,
    },
    occurredAt: new Date(),
  });

  return {
    organisationId: org.id,
    membershipId: membership.id,
    slug: org.slug,
    created: true,
    installedAppIds: enabledApps,
  };
}
