import { serializeBrandColours } from "../org/brand-theme";
import {
  WANTD_COLOURS,
  WANTD_TAGLINE,
} from "./brand";
import {
  WANTD_ORG_NAME,
  WANTD_ORG_SLUG,
  WANTD_VERTICAL,
  WANTD_WEBSITE,
} from "./types";

/** Apps enabled for Wantd MVP — shared DigitalGate Core, no dedicated marketplace stack. */
export const WANTD_ENABLED_APPS = [
  "crm",
  "commerce",
  "websites",
  "infrastructure",
  "opportunities",
  "automation",
  "marketing",
  "reviews",
] as const;

/**
 * Org Business Profile brand — primary = Western Red CTA, accent = Brass Gold,
 * background = Wantd Black (letterhead / dark surfaces).
 */
export const WANTD_BRAND_PATCH = {
  brandColours: serializeBrandColours(
    WANTD_COLOURS.westernRed,
    WANTD_COLOURS.brassGold,
    WANTD_COLOURS.black,
  ),
  websiteUrl: WANTD_WEBSITE,
  businessName: WANTD_ORG_NAME,
  industryVertical: "marketplace",
  tagline: WANTD_TAGLINE,
};

const ARCHIVED_SLUG_CANDIDATES = ["s-organisation"];

/**
 * Resolve the Wantd organisation id (env override → slug → known archived convert target).
 */
export async function resolveWantdOrganisationId(): Promise<string | null> {
  const envId = process.env.DG_WANTD_ORGANISATION_ID?.trim();
  if (envId) return envId;

  if (!process.env.DATABASE_URL) return null;

  const { prisma } = await import("@dg/database");

  const bySlug = await prisma.organisation.findUnique({
    where: { slug: WANTD_ORG_SLUG },
    select: { id: true },
  });
  if (bySlug) return bySlug.id;

  const byName = await prisma.organisation.findFirst({
    where: { name: { equals: WANTD_ORG_NAME, mode: "insensitive" } },
    select: { id: true },
  });
  if (byName) return byName.id;

  for (const slug of ARCHIVED_SLUG_CANDIDATES) {
    const archived = await prisma.organisation.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (archived) return archived.id;
  }

  const archivedName = await prisma.organisation.findFirst({
    where: {
      OR: [
        { status: "archived" },
        { name: { contains: "Archived", mode: "insensitive" } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  return archivedName?.id ?? null;
}

export type EnsureWantdOrganisationResult = {
  organisationId: string;
  slug: string;
  name: string;
  created: boolean;
  reactivated: boolean;
  previousName?: string;
  previousSlug?: string;
  /** Clerk users granted (or confirmed) owner on Wantd from DigitalGate */
  ownersSynced?: number;
};

/**
 * Copy active DigitalGate owners onto Wantd so the OrgSwitcher shows Wantd
 * for the same account that runs the other businesses.
 */
export async function syncDigitalGateOwnersOntoWantd(
  wantdOrganisationId: string,
): Promise<number> {
  const { prisma } = await import("@dg/database");

  const digitalgate = await prisma.organisation.findUnique({
    where: { slug: "digitalgate" },
    select: {
      memberships: {
        where: { status: "active", role: { in: ["owner", "admin"] } },
        select: {
          clerkUserId: true,
          email: true,
          displayName: true,
          role: true,
        },
      },
    },
  });

  let synced = 0;
  for (const member of digitalgate?.memberships ?? []) {
    const existing = await prisma.membership.findFirst({
      where: {
        organisationId: wantdOrganisationId,
        clerkUserId: member.clerkUserId,
      },
    });
    if (existing) {
      // Respect intentional removals — do not auto-reactivate.
      if (existing.status === "removed") {
        continue;
      }
      if (existing.status !== "active") {
        await prisma.membership.update({
          where: { id: existing.id },
          data: { status: "active", role: "owner" },
        });
        synced += 1;
      }
      continue;
    }
    await prisma.membership.create({
      data: {
        organisationId: wantdOrganisationId,
        clerkUserId: member.clerkUserId,
        role: "owner",
        status: "active",
        email: member.email ?? undefined,
        displayName: member.displayName ?? undefined,
      },
    });
    synced += 1;
  }
  return synced;
}

/**
 * Convert the archived placeholder org into Wantd (or create Wantd if missing).
 * Syncs DigitalGate owners onto Wantd so OrgSwitcher lists it for Ben.
 */
export async function ensureWantdOrganisation(options?: {
  forceBrand?: boolean;
}): Promise<EnsureWantdOrganisationResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to provision Wantd");
  }

  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const existingId = await resolveWantdOrganisationId();
  let org = existingId
    ? await prisma.organisation.findUnique({ where: { id: existingId } })
    : null;

  if (!org) {
    const created = await prisma.organisation.create({
      data: {
        name: WANTD_ORG_NAME,
        slug: WANTD_ORG_SLUG,
        locale: "en-AU",
        timezone: "Australia/Brisbane",
        currency: "AUD",
        status: "active",
        industry: "marketplace",
        settings: {
          apps: { enabled: [...WANTD_ENABLED_APPS] },
          // First-party marketplace — not a SaaS tenant on platform Stripe.
          billing: { platformExempt: true },
          profile: {
            ...WANTD_BRAND_PATCH,
            verticalLabel: WANTD_VERTICAL,
            updatedAt: new Date().toISOString(),
          },
        } as unknown as InputJsonValue,
        appInstallations: {
          create: WANTD_ENABLED_APPS.map((appId) => ({
            appId,
            version: "1.0.0",
            enabled: true,
          })),
        },
      },
    });

    const ownersSynced = await syncDigitalGateOwnersOntoWantd(created.id);

    return {
      organisationId: created.id,
      slug: created.slug,
      name: created.name,
      created: true,
      reactivated: false,
      ownersSynced,
    };
  }

  const previousName = org.name;
  const previousSlug = org.slug;
  const reactivated = org.status === "archived" || /archiv/i.test(org.name);

  const settings = (org.settings as Record<string, unknown> | null) ?? {};
  const profile = (settings.profile as Record<string, unknown> | undefined) ?? {};
  const apps = (settings.apps as { enabled?: string[] } | undefined) ?? {};

  const nextProfile = {
    ...profile,
    ...WANTD_BRAND_PATCH,
    businessName: WANTD_ORG_NAME,
    websiteUrl: WANTD_WEBSITE,
    verticalLabel: WANTD_VERTICAL,
    industryVertical: "marketplace",
    updatedAt: new Date().toISOString(),
  };

  const enabled = new Set([
    ...(apps.enabled ?? []),
    ...WANTD_ENABLED_APPS,
  ]);

  // Ensure slug is wantd if free or already ours
  let nextSlug = org.slug;
  if (org.slug !== WANTD_ORG_SLUG) {
    const taken = await prisma.organisation.findUnique({
      where: { slug: WANTD_ORG_SLUG },
      select: { id: true },
    });
    if (!taken || taken.id === org.id) {
      nextSlug = WANTD_ORG_SLUG;
    }
  }

  const updated = await prisma.organisation.update({
    where: { id: org.id },
    data: {
      name: WANTD_ORG_NAME,
      slug: nextSlug,
      status: "active",
      industry: "marketplace",
      settings: {
        ...settings,
        apps: { ...apps, enabled: [...enabled] },
        billing: {
          ...((settings.billing as object | undefined) ?? {}),
          platformExempt: true,
        },
        profile: nextProfile,
      } as unknown as InputJsonValue,
    },
  });

  // Ensure app installations exist for MVP apps
  for (const appId of WANTD_ENABLED_APPS) {
    await prisma.appInstallation.upsert({
      where: {
        organisationId_appId: {
          organisationId: updated.id,
          appId,
        },
      },
      create: {
        organisationId: updated.id,
        appId,
        version: "1.0.0",
        enabled: true,
      },
      update: { enabled: true },
    });
  }

  const ownersSynced = await syncDigitalGateOwnersOntoWantd(updated.id);

  return {
    organisationId: updated.id,
    slug: updated.slug,
    name: updated.name,
    created: false,
    reactivated,
    previousName: previousName !== updated.name ? previousName : undefined,
    previousSlug: previousSlug !== updated.slug ? previousSlug : undefined,
    ownersSynced,
  };
}
