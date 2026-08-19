/**
 * Publish the initial Wantd marketing site (slug: wantd) and attach wantd.co.nz.
 *
 * Usage:
 *   npx tsx scripts/seed-wantd-website.ts
 */
import { config } from "dotenv";
import { PrismaClient, type Prisma } from "@prisma/client";

import {
  buildMarketplaceSiteModel,
  wantdWebsiteTheme,
} from "../packages/platform-core/src/websites/templates-marketplace";

config({ path: ".env.local" });

const prisma = new PrismaClient();

const SITE_SLUG = "wantd";
const HOSTS = [
  "wantd.co.nz",
  "www.wantd.co.nz",
  "wantdproperty.com.au",
  "www.wantdproperty.com.au",
];

async function main() {
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { slug: "wantd" },
        { name: { equals: "Wantd", mode: "insensitive" } },
      ],
    },
  });
  if (!org) {
    throw new Error("Wantd organisation not found. Run scripts/ensure-wantd-org.mjs first.");
  }

  const settings =
    org.settings && typeof org.settings === "object"
      ? (org.settings as Record<string, unknown>)
      : {};
  const profile =
    settings.profile && typeof settings.profile === "object"
      ? (settings.profile as Record<string, unknown>)
      : {};

  const theme = wantdWebsiteTheme({
    logoUrl: typeof profile.logoUrl === "string" ? profile.logoUrl : undefined,
    iconUrl: typeof profile.iconUrl === "string" ? profile.iconUrl : undefined,
  });

  const model = buildMarketplaceSiteModel({
    name: "Wantd",
    tagline:
      typeof profile.tagline === "string"
        ? profile.tagline
        : "Tell the marketplace what you WANT.",
    about: typeof profile.about === "string" ? profile.about : undefined,
    phone:
      typeof profile.businessPhone === "string"
        ? profile.businessPhone
        : typeof profile.contactPhone === "string"
          ? profile.contactPhone
          : undefined,
    email:
      typeof profile.businessEmail === "string"
        ? profile.businessEmail
        : typeof profile.contactEmail === "string"
          ? profile.contactEmail
          : "hello@wantdproperty.com.au",
    theme,
  });

  let site = await prisma.website.findFirst({
    where: { organisationId: org.id, slug: SITE_SLUG },
  });
  if (!site) {
    site = await prisma.website.findFirst({
      where: {
        organisationId: org.id,
        name: { contains: "Wantd", mode: "insensitive" },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  const publishedAt = new Date();
  const metadata = {
    generatorSource: "template",
    template: "marketplace",
    industryHooks: {
      realEstate: false,
      accommodation: false,
      marketplace: true,
    },
    seededAt: publishedAt.toISOString(),
  };

  if (!site) {
    const taken = await prisma.website.findUnique({
      where: { slug: SITE_SLUG },
      select: { id: true, organisationId: true },
    });
    if (taken && taken.organisationId !== org.id) {
      throw new Error(
        `Website slug "${SITE_SLUG}" is already used by another organisation.`,
      );
    }
    site = await prisma.website.create({
      data: {
        organisationId: org.id,
        name: model.name ?? "Wantd Website",
        slug: SITE_SLUG,
        status: "published",
        publishedAt,
        brief:
          "Initial Wantd marketplace site — demand-first, fun and easy. Property Wants live.",
        theme: theme as Prisma.InputJsonValue,
        seo: model.seo as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } else {
    await prisma.website.update({
      where: { id: site.id },
      data: {
        name: model.name ?? "Wantd Website",
        slug: SITE_SLUG,
        status: "published",
        publishedAt: site.publishedAt ?? publishedAt,
        brief:
          "Initial Wantd marketplace site — demand-first, fun and easy. Property Wants live.",
        theme: theme as Prisma.InputJsonValue,
        seo: model.seo as Prisma.InputJsonValue,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
    site = await prisma.website.findUniqueOrThrow({ where: { id: site.id } });
  }

  await prisma.websitePage.deleteMany({ where: { websiteId: site.id } });
  await prisma.websitePage.createMany({
    data: model.pages.map((page, index) => ({
      websiteId: site.id,
      title: page.title,
      slug: page.slug,
      intent: page.intent ?? "custom",
      status: "published",
      sortOrder: index,
      seo: (page.seo ?? undefined) as Prisma.InputJsonValue | undefined,
      components: page.components as unknown as Prisma.InputJsonValue,
    })),
  });

  for (const name of HOSTS) {
    await prisma.infrastructureDomain.upsert({
      where: {
        organisationId_name: { organisationId: org.id, name },
      },
      create: {
        organisationId: org.id,
        name,
        status: "connected",
        source: "connected",
        websiteId: site.id,
        managed: false,
        sslState: "active",
      },
      update: {
        websiteId: site.id,
        status: "connected",
        sslState: "active",
      },
    });
  }

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      settings: {
        ...settings,
        profile: {
          ...profile,
          websiteUrl: "https://wantd.co.nz",
          industryVertical: "marketplace",
          tagline:
            typeof profile.tagline === "string"
              ? profile.tagline
              : "Tell the marketplace what you WANT.",
          updatedAt: new Date().toISOString(),
        },
      } as Prisma.InputJsonValue,
    },
  });

  const pages = await prisma.websitePage.findMany({
    where: { websiteId: site.id },
    select: { slug: true, title: true, status: true },
    orderBy: { sortOrder: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        organisationId: org.id,
        websiteId: site.id,
        slug: site.slug,
        status: "published",
        hosts: HOSTS,
        preview: `/sites/${SITE_SLUG}?preview=1`,
        live: "https://wantd.co.nz",
        pages,
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
