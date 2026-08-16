#!/usr/bin/env node
/**
 * Reset product funnel sites to chromeless capture shells.
 * Clears legacy marketing HTML so only PropertyReportCapture /
 * BusinessAuditCapture render full-screen on the subdomain.
 *
 *   node --env-file=.env.local scripts/reset-product-funnel-pages.mjs
 *   node --env-file=.env.local scripts/reset-product-funnel-pages.mjs --dry-run
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const FUNNELS = [
  {
    slug: "digitalgate-audit",
    pageSlug: "home",
    title: "Free Digital Business Audit™",
    seo: {
      title: "Free DigitalGate Business Audit™ | DigitalGate",
      description:
        "Free DigitalGate Business Audit™ — website health, search, AI visibility, reputation and conversion readiness.",
      ogTitle: "See how your business performs across the digital world",
      ogDescription:
        "Get an instant snapshot of your website, search presence, AI visibility and digital foundations.",
      showHeader: false,
      showFooter: false,
    },
  },
  {
    slug: "roe-realty-report",
    pageSlug: "home",
    title: "Free Instant Property Report",
    seo: {
      title: "Free Property Report | Roe Realty",
      description:
        "Get your free Roe Realty Property Report™ — value range, buyer demand and comparable sales.",
      ogTitle: "Find Out What Buyers Would Pay for Your Property Right Now",
      ogDescription:
        "Receive a value range, recent comparable sales, and buyer demand insights in minutes.",
      showHeader: false,
      showFooter: false,
    },
  },
];

async function main() {
  for (const funnel of FUNNELS) {
    const site = await prisma.website.findUnique({
      where: { slug: funnel.slug },
      select: { id: true, slug: true, seo: true, metadata: true },
    });
    if (!site) {
      console.log(`! missing site ${funnel.slug}`);
      continue;
    }

    const pages = await prisma.websitePage.findMany({
      where: { websiteId: site.id },
      orderBy: { sortOrder: "asc" },
    });

    console.log(
      `${dryRun ? "[dry] " : ""}✓ ${funnel.slug}: ${pages.length} page(s) → chromeless /home`,
    );

    if (dryRun) continue;

    // Keep a single home page with empty components.
    const home =
      pages.find((p) => p.slug === "home" || p.intent === "home") || pages[0];

    if (home) {
      await prisma.websitePage.update({
        where: { id: home.id },
        data: {
          title: funnel.title,
          slug: "home",
          intent: "home",
          status: "published",
          sortOrder: 0,
          seo: funnel.seo,
          components: [],
        },
      });
    } else {
      await prisma.websitePage.create({
        data: {
          websiteId: site.id,
          title: funnel.title,
          slug: "home",
          intent: "home",
          status: "published",
          sortOrder: 0,
          seo: funnel.seo,
          components: [],
        },
      });
    }

    // Archive any leftover stub pages (business-audit / property-report HTML).
    for (const page of pages) {
      if (page.id === home?.id) continue;
      if (
        page.slug === "business-audit" ||
        page.slug === "property-report" ||
        page.slug === "home"
      ) {
        if (page.slug !== "home") {
          await prisma.websitePage.delete({ where: { id: page.id } });
          console.log(`  deleted leftover /${page.slug}`);
        }
      }
    }

    await prisma.website.update({
      where: { id: site.id },
      data: {
        seo: {
          ...(site.seo && typeof site.seo === "object" ? site.seo : {}),
          ...funnel.seo,
        },
        metadata: {
          ...(site.metadata && typeof site.metadata === "object"
            ? site.metadata
            : {}),
          kind: "funnel",
        },
      },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
