#!/usr/bin/env node
/**
 * Sync business-profile logos onto website themes + brand chrome nav links.
 * Usage: node scripts/sync-website-brand-chrome.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { stripCvhFooterExploreColumn } from "./lib/strip-cvh-footer-explore.mjs";

config({ path: ".env.local" });
const prisma = new PrismaClient();

const SITE_SLUGS = [
  "digitalgate",
  "roe-realty",
  "currumbin-valley-hideaway",
  "aetheriel-com-au",
];

const PRIMARY_NAV = {
  digitalgate: [
    { label: "Pricing", href: "/pricing" },
    { label: "Founding", href: "/founding-customers" },
    { label: "Insights", href: "/insights" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  "roe-realty": [
    { label: "Sell", href: "/sell" },
    { label: "Buy", href: "/buy" },
    { label: "Property", href: "/property" },
    { label: "Insights", href: "/insights" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  "currumbin-valley-hideaway": [
    { label: "Stay", href: "/stay" },
    { label: "Gallery", href: "/gallery" },
    { label: "Experiences", href: "/experiences" },
    { label: "Insights", href: "/insights" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  "aetheriel-com-au": [
    { label: "Music", href: "/music" },
    { label: "Mixes", href: "/mixes" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Book", href: "/book-aetherra" },
  ],
};

const HEADER_CTAS = {
  "currumbin-valley-hideaway": {
    label: "Book now",
    href: "/stay",
    backgroundColor: "#B9A48A",
  },
  "roe-realty": {
    label: "Get Property Report",
    href: "/property-report",
  },
  digitalgate: {
    label: "Get My Free Business Audit →",
    href: "/business-audit",
    backgroundColor: "#3B82F6",
  },
};

async function main() {
  for (const siteSlug of SITE_SLUGS) {
    const site = await prisma.website.findUnique({
      where: { slug: siteSlug },
      include: {
        organisation: { select: { id: true, name: true, settings: true } },
        pages: {
          select: { slug: true, title: true, intent: true },
          orderBy: { sortOrder: "asc" },
          take: 12,
        },
      },
    });
    if (!site) {
      console.log(`! missing site ${siteSlug}`);
      continue;
    }

    const profile = site.organisation.settings?.profile ?? {};
    const logoUrl = typeof profile.logoUrl === "string" ? profile.logoUrl : null;
    const iconUrl = typeof profile.iconUrl === "string" ? profile.iconUrl : null;
    if (!logoUrl && !iconUrl) {
      console.log(`! ${site.organisation.name}: no profile logo/icon`);
      continue;
    }

    const prevTheme =
      site.theme && typeof site.theme === "object" ? site.theme : {};
    const prevMeta =
      site.metadata && typeof site.metadata === "object" ? site.metadata : {};
    const prevChrome =
      prevMeta.chrome && typeof prevMeta.chrome === "object"
        ? prevMeta.chrome
        : {};

    const navLinks =
      PRIMARY_NAV[siteSlug] ||
      site.pages
        .filter((p) => !["privacy-policy", "terms-conditions", "legal-notice"].includes(p.slug))
        .slice(0, 7)
        .map((p) => ({
          label: p.title,
          href: p.slug === "home" || p.intent === "home" ? "/" : `/${p.slug}`,
        }));

    const rawFooter =
      typeof prevChrome.footerHtml === "string" ? prevChrome.footerHtml : null;
    const footerHtml =
      siteSlug === "currumbin-valley-hideaway" && rawFooter
        ? stripCvhFooterExploreColumn(rawFooter)
        : rawFooter;

    await prisma.website.update({
      where: { id: site.id },
      data: {
        theme: {
          ...prevTheme,
          logoUrl: logoUrl || iconUrl,
          iconUrl: iconUrl || logoUrl,
        },
        metadata: {
          ...prevMeta,
          chrome: {
            ...prevChrome,
            // Brand header from theme.logoUrl; keep any stored WP footer
            headerHtml: null,
            footerHtml,
            overlayHeader:
              siteSlug === "roe-realty" ||
              siteSlug === "currumbin-valley-hideaway",
            headerLayout:
              siteSlug === "currumbin-valley-hideaway" ? "stacked" : "bar",
            headerCta: HEADER_CTAS[siteSlug] ?? prevChrome.headerCta ?? null,
            businessName: site.organisation.name,
            navLinks,
            stylesheets: Array.isArray(prevChrome.stylesheets)
              ? prevChrome.stylesheets
              : [],
          },
        },
      },
    });

    console.log(
      `✓ ${site.organisation.name}: logo synced, ${navLinks.length} nav links`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
