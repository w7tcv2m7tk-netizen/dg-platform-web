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
    href: "https://report.roerealty.com.au",
  },
  digitalgate: {
    label: "Get My Free Business Audit →",
    href: "https://audit.digitalgate.com.au",
    backgroundColor: "#3B82F6",
  },
};

const AETHERRA_LOGO_FALLBACK =
  "https://dhcfjdm3qhtlfaul.public.blob.vercel-storage.com/org-assets/cmsi9968q0000l104t8x1rabm/7a0dd8791fadcb42-mZ6bZoLlAGLMEHRIXKcmLjlgH6ar6u.png";

/** WP-style centered Aëtherra header (logo over nav + socials). */
function buildAetherraHeaderHtml(logoUrl) {
  const logo = logoUrl || AETHERRA_LOGO_FALLBACK;
  return `<div class="wb-chrome-root wb-aetherra-header">
  <header class="header">
    <a href="/" class="logo" aria-label="Aëtherra">
      <img src="${logo}" alt="Aëtherra" />
    </a>
    <div class="header-bottom">
      <ul class="nav-links">
        <li><a href="/music">Music</a></li>
        <li><a href="/mixes">Mixes</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
      <div class="nav-divider" aria-hidden="true"></div>
      <div class="social-icons">
        <a href="https://soundcloud.com/aetherraau" target="_blank" rel="noopener noreferrer" aria-label="SoundCloud"><i class="fab fa-soundcloud"></i></a>
        <a href="https://www.instagram.com/aetherraau/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
        <a href="https://www.youtube.com/channel/UCHhUAZysFNfOkdUMzsr6JOA" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
      </div>
    </div>
  </header>
</div>`;
}

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
    let logoUrl = typeof profile.logoUrl === "string" ? profile.logoUrl : null;
    let iconUrl = typeof profile.iconUrl === "string" ? profile.iconUrl : null;

    // Gen 2 hosted brand marks when org profile still lacks logos (common after WP cutover)
    if (siteSlug === "digitalgate" && !logoUrl && !iconUrl) {
      logoUrl = "https://app.digitalgate.com.au/brand/logo-on-dark.png";
      iconUrl = "https://app.digitalgate.com.au/brand/icon-light.png";
    }
    if (siteSlug === "roe-realty" && !logoUrl && !iconUrl) {
      logoUrl = "https://app.digitalgate.com.au/brand/roe-logo.png";
      iconUrl = "https://app.digitalgate.com.au/brand/roe-icon.png";
    }
    if (siteSlug === "aetheriel-com-au" && !logoUrl && !iconUrl) {
      logoUrl = AETHERRA_LOGO_FALLBACK;
      iconUrl = AETHERRA_LOGO_FALLBACK;
    }

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

    const resolvedLogo = logoUrl || iconUrl;
    const aetherraHeader =
      siteSlug === "aetheriel-com-au"
        ? buildAetherraHeaderHtml(resolvedLogo)
        : null;
    const stylesheets = Array.isArray(prevChrome.stylesheets)
      ? [...prevChrome.stylesheets]
      : [];
    if (
      siteSlug === "aetheriel-com-au" &&
      !stylesheets.some((s) => /font-awesome/i.test(String(s)))
    ) {
      stylesheets.push(
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
      );
    }

    await prisma.website.update({
      where: { id: site.id },
      data: {
        theme: {
          ...prevTheme,
          logoUrl: resolvedLogo,
          iconUrl: iconUrl || logoUrl,
        },
        metadata: {
          ...prevMeta,
          chrome: {
            ...prevChrome,
            // Aëtherra keeps WP-style centered HTML header; other brands use theme chrome
            headerHtml: aetherraHeader,
            footerHtml,
            overlayHeader:
              siteSlug === "roe-realty" ||
              siteSlug === "currumbin-valley-hideaway",
            headerLayout:
              siteSlug === "currumbin-valley-hideaway" ? "stacked" : "bar",
            headerCta: HEADER_CTAS[siteSlug] ?? prevChrome.headerCta ?? null,
            businessName: site.organisation.name,
            navLinks,
            stylesheets,
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
