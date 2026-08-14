#!/usr/bin/env node
/**
 * Fix imported site chrome display:
 * - Strip embedded page headers (duplicate/giant logos)
 * - Restore live WP footers for RR/CVH/Aëtherra
 * - Transparent overlay headers for RR/CVH
 * - Insights pages = post_grid only
 *
 * Usage: node scripts/fix-website-chrome-display.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

const BRANDS = [
  {
    slug: "roe-realty",
    wpRoot: "https://roerealty.com.au/",
    overlay: true,
  },
  {
    slug: "currumbin-valley-hideaway",
    wpRoot: "https://currumbinvalleyhideaway.com.au/",
    overlay: true,
  },
  { slug: "digitalgate", wpRoot: null, overlay: false },
  {
    slug: "aetheriel-com-au",
    wpRoot: "https://aetherra.com.au/",
    overlay: false,
  },
];

function stripEmbeddedHeaders(html) {
  return String(html || "").replace(
    /<header\b[^>]*class=["'][^"']*(?:rr-header|cvh-header|site-header|oxy-header)[^"']*["'][^>]*>[\s\S]*?<\/header>/gi,
    "",
  );
}

function hardenIslandCss(html) {
  return String(html || "").replace(
    /\.wb-html-island--page img\{max-width:100%;height:auto;border-radius:0\.35rem\}/g,
    `.wb-html-island--page img{max-width:100%;height:auto;border-radius:0.35rem}.wb-html-island--page img.rr-logo,.wb-html-island--page .rr-logo,.wb-html-island--page .logo-wrapper img,.wb-html-island--page header img{max-height:56px!important;width:auto!important;max-width:min(240px,55vw)!important;height:auto!important;object-fit:contain!important}.wb-html-island--page .nav-cta,.wb-html-island--page .hero-cta,.wb-html-island--page .cta-button{display:inline-flex!important;align-items:center;width:auto!important;white-space:nowrap}`,
  );
}

async function extractFooter(wpRoot) {
  const res = await fetch(wpRoot, {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(30000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${wpRoot} ${res.status}`);
  const html = await res.text();
  const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i)?.[0] || null;
  const stylesheets = [
    ...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi),
  ]
    .map((m) => {
      const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
      if (!href) return null;
      try {
        return new URL(href, wpRoot).href;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, 12);
  const inlineStyles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .filter((css) => /footer|rr-icon|footer-grid|cvh-container|footer-section/i.test(css))
    .slice(0, 8)
    .join("\n");
  return { footer, stylesheets, inlineStyles };
}

function wrapFooter(chunk, inlineStyles, logoUrl) {
  if (!chunk) return null;
  let cleaned = chunk
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
  if (logoUrl) {
    cleaned = cleaned.replace(
      /(<a\b[^>]*class=["'][^"']*footer-logo[^"']*["'][^>]*>\s*<img\b[^>]*src=["'])([^"']+)(["'])/gi,
      `$1${logoUrl}$3`,
    );
    cleaned = cleaned.replace(
      /(<img\b[^>]*class=["'][^"']*(?:rr-icon|footer-logo|custom-logo|site-logo)[^"']*["'][^>]*src=["'])([^"']+)(["'])/gi,
      `$1${logoUrl}$3`,
    );
  }
  const style = `<style>${inlineStyles || ""}
.wb-site-chrome-footer img.rr-icon,
.wb-site-chrome-footer .footer-logo img,
.wb-site-chrome-footer img {
  max-height: 48px !important;
  width: auto !important;
  max-width: 220px !important;
  height: auto !important;
  object-fit: contain !important;
}
</style>`;
  return `${style}\n<div class="wb-chrome-root">${cleaned}</div>`;
}

async function main() {
  for (const brand of BRANDS) {
    const site = await prisma.website.findUnique({
      where: { slug: brand.slug },
      include: {
        organisation: { select: { name: true, settings: true } },
        pages: { select: { id: true, slug: true, components: true } },
      },
    });
    if (!site) {
      console.log(`! missing ${brand.slug}`);
      continue;
    }

    const profile = site.organisation.settings?.profile ?? {};
    const logoUrl =
      (typeof profile.logoUrl === "string" && profile.logoUrl) ||
      (typeof profile.iconUrl === "string" && profile.iconUrl) ||
      site.theme?.logoUrl ||
      null;
    const prevMeta =
      site.metadata && typeof site.metadata === "object" ? site.metadata : {};
    const prevChrome =
      prevMeta.chrome && typeof prevMeta.chrome === "object"
        ? prevMeta.chrome
        : {};

    let footerHtml = brand.wpRoot ? null : prevChrome.footerHtml || null;
    let stylesheets = Array.isArray(prevChrome.stylesheets)
      ? prevChrome.stylesheets
      : [];

    if (brand.wpRoot) {
      try {
        const live = await extractFooter(brand.wpRoot);
        footerHtml = wrapFooter(live.footer, live.inlineStyles, logoUrl);
        if (live.stylesheets?.length) stylesheets = live.stylesheets;
        console.log(
          `  ${brand.slug}: footer ${footerHtml ? footerHtml.length : 0}c`,
        );
      } catch (err) {
        console.log(`  ${brand.slug}: footer extract failed — ${err.message}`);
      }
    }

    await prisma.website.update({
      where: { id: site.id },
      data: {
        metadata: {
          ...prevMeta,
          chrome: {
            ...prevChrome,
            headerHtml: null,
            footerHtml,
            overlayHeader: brand.overlay,
            businessName: site.organisation.name,
            stylesheets,
            navLinks: prevChrome.navLinks || [],
          },
        },
      },
    });

    let pagesUpdated = 0;
    for (const page of site.pages) {
      const comps = Array.isArray(page.components) ? page.components : [];
      let changed = false;
      let next = comps.map((c) => {
        if (c?.type !== "html" || typeof c.props?.html !== "string") return c;
        const before = c.props.html;
        const html = hardenIslandCss(stripEmbeddedHeaders(before));
        if (html !== before) {
          changed = true;
          return { ...c, props: { ...c.props, html } };
        }
        return c;
      });

      if (page.slug === "insights") {
        const grid = next.filter((c) => c?.type === "post_grid");
        if (grid.length && grid.length !== next.length) {
          next = grid;
          changed = true;
        }
      }

      if (changed) {
        await prisma.websitePage.update({
          where: { id: page.id },
          data: { components: next },
        });
        pagesUpdated += 1;
      }
    }

    console.log(
      `✓ ${brand.slug}: overlay=${brand.overlay} pagesUpdated=${pagesUpdated}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
