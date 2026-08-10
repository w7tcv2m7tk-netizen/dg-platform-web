#!/usr/bin/env node
/**
 * Convert archived placeholder org → Wantd (or create Wantd).
 * Usage: node scripts/ensure-wantd-org.mjs
 *
 * Uses Prisma directly so it works without a Next.js build.
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const WANTD_ORG_SLUG = "wantd";
const WANTD_ORG_NAME = "Wantd";
const WANTD_WEBSITE = "https://wantdproperty.com.au";
const WANTD_ENABLED_APPS = [
  "crm",
  "commerce",
  "websites",
  "infrastructure",
  "opportunities",
  "automation",
  "marketing",
  "reviews",
];

const prisma = new PrismaClient();

async function resolveId() {
  const envId = process.env.DG_WANTD_ORGANISATION_ID?.trim();
  if (envId) return envId;

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

  const archivedSlug = await prisma.organisation.findUnique({
    where: { slug: "s-organisation" },
    select: { id: true },
  });
  if (archivedSlug) return archivedSlug.id;

  const archived = await prisma.organisation.findFirst({
    where: {
      OR: [
        { status: "archived" },
        { name: { contains: "Archived", mode: "insensitive" } },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return archived?.id ?? null;
}

async function main() {
  const existingId = await resolveId();
  const brandColours = "#8E3028, #C49A5A, #171513";
  const tagline = "Tell the marketplace what you WANT.";

  if (!existingId) {
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
          apps: { enabled: WANTD_ENABLED_APPS },
          profile: {
            businessName: WANTD_ORG_NAME,
            websiteUrl: WANTD_WEBSITE,
            brandColours,
            industryVertical: "marketplace",
            verticalLabel: "Wantd Property",
            tagline,
            updatedAt: new Date().toISOString(),
          },
        },
        appInstallations: {
          create: WANTD_ENABLED_APPS.map((appId) => ({
            appId,
            version: "1.0.0",
            enabled: true,
          })),
        },
      },
    });
    console.log(JSON.stringify({ created: true, organisationId: created.id, slug: created.slug }, null, 2));
    return;
  }

  const org = await prisma.organisation.findUnique({ where: { id: existingId } });
  if (!org) throw new Error(`Organisation ${existingId} not found`);

  const previous = { name: org.name, slug: org.slug, status: org.status };
  const settings = (org.settings && typeof org.settings === "object" ? org.settings : {}) || {};
  const profile = settings.profile && typeof settings.profile === "object" ? settings.profile : {};
  const apps = settings.apps && typeof settings.apps === "object" ? settings.apps : {};
  const enabled = [...new Set([...(apps.enabled || []), ...WANTD_ENABLED_APPS])];

  let nextSlug = org.slug;
  if (org.slug !== WANTD_ORG_SLUG) {
    const taken = await prisma.organisation.findUnique({
      where: { slug: WANTD_ORG_SLUG },
      select: { id: true },
    });
    if (!taken || taken.id === org.id) nextSlug = WANTD_ORG_SLUG;
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
        apps: { ...apps, enabled },
        profile: {
          ...profile,
          businessName: WANTD_ORG_NAME,
          websiteUrl: WANTD_WEBSITE,
          brandColours,
          industryVertical: "marketplace",
          verticalLabel: "Wantd Property",
          tagline,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });

  for (const appId of WANTD_ENABLED_APPS) {
    await prisma.appInstallation.upsert({
      where: {
        organisationId_appId: { organisationId: updated.id, appId },
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

  // Ensure DigitalGate owners can see Wantd in OrgSwitcher
  const digitalgate = await prisma.organisation.findUnique({
    where: { slug: "digitalgate" },
    select: {
      memberships: {
        where: { status: "active", role: { in: ["owner", "admin"] } },
        select: { clerkUserId: true, email: true, displayName: true },
      },
    },
  });
  let ownersSynced = 0;
  for (const member of digitalgate?.memberships ?? []) {
    const existing = await prisma.membership.findFirst({
      where: { organisationId: updated.id, clerkUserId: member.clerkUserId },
    });
    if (existing) {
      if (existing.status !== "active") {
        await prisma.membership.update({
          where: { id: existing.id },
          data: { status: "active", role: "owner" },
        });
        ownersSynced += 1;
      }
      continue;
    }
    await prisma.membership.create({
      data: {
        organisationId: updated.id,
        clerkUserId: member.clerkUserId,
        role: "owner",
        status: "active",
        email: member.email ?? undefined,
        displayName: member.displayName ?? undefined,
      },
    });
    ownersSynced += 1;
  }

  console.log(
    JSON.stringify(
      {
        created: false,
        reactivated: previous.status === "archived" || /archiv/i.test(previous.name),
        organisationId: updated.id,
        slug: updated.slug,
        name: updated.name,
        previous,
        ownersSynced,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
