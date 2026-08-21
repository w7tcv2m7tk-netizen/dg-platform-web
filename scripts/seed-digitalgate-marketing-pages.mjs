#!/usr/bin/env node
/**
 * Seed DigitalGate marketing HTML into Gen 2 Website Studio (canonical SoT).
 * WordPress / Oxygen paste is retired for digitalgate.com.au apex marketing.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-digitalgate-marketing-pages.mjs
 *   node --env-file=.env.local scripts/seed-digitalgate-marketing-pages.mjs --publish
 *
 * Reads from sibling repo: ../dg-platform/marketing/pages/
 * Upserts + publishes pages on the DigitalGate org website (slug: digitalgate).
 */
import { config } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = join(
  __dirname,
  "../../dg-platform/marketing/pages",
);
const publish = process.argv.includes("--publish");
const MAX_HTML_CHUNK = 80_000;

const PAGES = [
  { file: "homepage.html", title: "Home", slug: "home", intent: "home", sortOrder: 0 },
  { file: "pricing-page.html", title: "Pricing", slug: "pricing", intent: "custom", sortOrder: 1 },
  { file: "founding-customers-page.html", title: "Founding Customer Programme", slug: "founding-customers", intent: "custom", sortOrder: 2 },
  { file: "founding-customer-terms.html", title: "Founding Customer Terms & Conditions", slug: "founding-customer-terms", intent: "custom", sortOrder: 3 },
  { file: "about-page.html", title: "About", slug: "about", intent: "about", sortOrder: 4 },
  { file: "contact-page.html", title: "Contact", slug: "contact", intent: "contact", sortOrder: 5 },
  { file: "strategy-session-page.html", title: "Platform Consultation", slug: "strategy-session", intent: "custom", sortOrder: 6 },
  { file: "insights-page.html", title: "Insights", slug: "insights", intent: "custom", sortOrder: 7 },
  { file: "digital-business-card.html", title: "Digital Business Card", slug: "card", intent: "custom", sortOrder: 8 },
  { file: "privacy-policy.html", title: "Privacy Policy", slug: "privacy-policy", intent: "custom", sortOrder: 9 },
  { file: "terms-page.html", title: "Terms & Conditions", slug: "terms-conditions", intent: "custom", sortOrder: 10 },
  { file: "legal-notice.html", title: "Legal Notice", slug: "legal-notice", intent: "custom", sortOrder: 11 },
  { file: "ai-visibility-framework.html", title: "AI Visibility Framework", slug: "ai-visibility-framework", intent: "custom", sortOrder: 12 },
  { file: "appraisal-magnet-system.html", title: "Appraisal Magnet System", slug: "appraisal-magnet-system", intent: "custom", sortOrder: 13 },
  { file: "listing-pipeline-framework-page.html", title: "Listing Pipeline Framework", slug: "listing-pipeline-framework", intent: "custom", sortOrder: 14 },
  { file: "vendor-velocity-system.html", title: "Vendor Velocity System", slug: "vendor-velocity-system", intent: "custom", sortOrder: 15 },
  { file: "business-brain-page.html", title: "Business Brain", slug: "business-brain", intent: "custom", sortOrder: 16 },
  {
    file: "from-dumb-businesses-to-smart-businesses.html",
    title: "From Dumb Businesses to Smart Businesses",
    slug: "from-dumb-businesses-to-smart-businesses",
    intent: "custom",
    sortOrder: 17,
  },
];

const ICON =
  "https://app.digitalgate.com.au/brand/icon-light.png";
const LOGO =
  "https://app.digitalgate.com.au/brand/logo-on-dark.png";

function prepareChromeHtml(html) {
  let out = String(html || "");
  out = out
    .replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, "")
    .replace(/<\/body>[\s\S]*$/i, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "");
  out = out
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*Gate-Icon[^"'>\s]*/gi,
      ICON,
    )
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*DigitalGate-Banner[^"'>\s]*/gi,
      LOGO,
    )
    .replace(
      /https?:\/\/digitalgate\.com\.au\/wp-content\/uploads\/[^"'>\s]*Banner-Light[^"'>\s]*/gi,
      LOGO,
    );
  out = out
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
  const styles = [];
  out = out.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    styles.push(
      String(css)
        // Keep document-level menu lock / header offset on real body
        .replace(
          /(^|[,}])\s*body(?!\.(?:menu-open|dg-has-fixed-header))\s*(?=[\s,{])/gi,
          "$1 .wb-chrome-root ",
        )
        .replace(/(^|[,}])\s*html\s*(?=[\s,{])/gi, "$1 .wb-chrome-root "),
    );
    return "";
  });
  const styleTag = `<style>
${styles.join("\n")}
.wb-chrome-root img{max-width:none;height:auto}
.wb-chrome-root .dg-full-logo,.wb-chrome-root img.dg-full-logo{height:28px!important;width:auto!important;max-width:11rem!important;object-fit:contain}
.wb-chrome-root .dg-gate-icon,.wb-chrome-root img.dg-gate-icon{width:32px!important;height:32px!important;object-fit:contain}
.wb-chrome-root .dg-logo-fallback{display:none}
</style>`;
  return `${styleTag}\n<div class="wb-chrome-root">\n${out.trim()}\n</div>`.trim();
}
const prisma = new PrismaClient();

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function extractMeta(html, attr) {
  const re = new RegExp(
    `<meta[^>]+name=["']${attr}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${attr}["']`,
    "i",
  );
  return html.match(re2)?.[1] ?? null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() || null;
}

function clipSeo(s, max) {
  const t = String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length <= max) return t || null;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

/**
 * Keep page CSS for Studio preview fidelity; strip scripts / event handlers.
 * Rewrite body/html selectors → .wb-html-island so dark backgrounds apply
 * inside the Gen 2 renderer (content is not a real document body).
 */
function prepareMarketingHtml(raw) {
  let styles = [...raw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");

  styles = styles
    .replace(/(^|[,}])\s*body\s*(?=[\s,{])/gi, "$1 .wb-html-island ")
    .replace(/(^|[,}])\s*html\s*(?=[\s,{])/gi, "$1 .wb-html-island ");

  const fontLinks = [
    ...raw.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi),
    ...raw.matchAll(/<link\b[^>]*href=["'][^"']*fonts\.googleapis[^"']*["'][^>]*>/gi),
    ...raw.matchAll(/<link\b[^>]*href=["'][^"']*fonts\.gstatic[^"']*["'][^>]*>/gi),
    ...raw.matchAll(/<link\b[^>]*href=["'][^"']*cdnjs\.cloudflare[^"']*["'][^>]*>/gi),
  ]
    .map((m) => m[0])
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    .join("\n");

  let body = raw;
  const bodyMatch = raw.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    body = bodyMatch[1];
  } else {
    // Strip head-ish tags when source is a fragment (meta/title/link/style)
    body = raw
      .replace(/<meta\b[^>]*>/gi, "")
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  }

  body = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .trim();

  const styleTag = styles.trim() ? `<style>\n${styles}\n</style>` : "";
  // Always --page without --light: DigitalGate marketing HTML is a navy shell;
  // cream light-island ink would bleach Founding / About / pricing / legal bands.
  return `${fontLinks}\n${styleTag}\n<div class="wb-html-island wb-html-island--page">\n${body}\n</div>`.trim();
}

function htmlToComponents(html) {
  // Keep as one block when possible so CSS + markup stay together
  const chunks =
    html.length <= MAX_HTML_CHUNK * 3
      ? [html]
      : (() => {
          const out = [];
          let remaining = html;
          while (remaining.length > 0) {
            out.push(remaining.slice(0, MAX_HTML_CHUNK));
            remaining = remaining.slice(MAX_HTML_CHUNK);
          }
          return out;
        })();

  return chunks.map((chunk, i) => ({
    id: cuidLike() + i,
    type: "html",
    props: {
      html: chunk,
      note:
        i === 0
          ? "Imported from dg-platform/marketing/pages (Gen 2 marketing SoT). Scripts stripped; body CSS remapped to .wb-html-island."
          : `Continued HTML chunk ${i + 1}`,
    },
  }));
}

async function resolveSite() {
  const org = await prisma.organisation.findFirst({
    where: {
      OR: [
        { slug: "digitalgate" },
        { name: { equals: "DigitalGate", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
  if (!org) throw new Error("DigitalGate organisation not found");

  const darkTheme = {
    primaryColor: "#3B82F6",
    accentColor: "#10B981",
    backgroundColor: "#0A0E17",
  };

  let site = await prisma.website.findFirst({
    where: { organisationId: org.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!site) {
    site = await prisma.website.create({
      data: {
        organisationId: org.id,
        name: "DigitalGate Website",
        slug: "digitalgate",
        status: publish ? "published" : "draft",
        publishedAt: publish ? new Date() : null,
        brief: "DigitalGate marketing site — Gen 2 Website Studio SoT",
        theme: darkTheme,
        seo: {
          title: "DigitalGate | Business Operating Platform",
          description:
            "AI-powered Business Operating Platform for Australian businesses.",
        },
        metadata: {
          generatorSource: "seed-digitalgate-marketing-pages",
          marketingSource: "dg-platform/marketing/pages",
        },
      },
    });
    console.log(`Created website ${site.slug} (${site.id})`);
  } else {
    site = await prisma.website.update({
      where: { id: site.id },
      data: {
        theme: darkTheme,
        metadata: {
          ...((site.metadata && typeof site.metadata === "object"
            ? site.metadata
            : {})),
          generatorSource: "seed-digitalgate-marketing-pages",
          marketingSource: "dg-platform/marketing/pages",
        },
      },
    });
  }

  return { org, site };
}

async function upsertPage(siteId, def, rawHtml) {
  const prepared = prepareMarketingHtml(rawHtml);
  const components = htmlToComponents(prepared);
  const seoTitle = extractTitle(rawHtml) || def.title;
  const seoDescription = extractMeta(rawHtml, "description");
  const status = publish ? "published" : "draft";

  const existing = await prisma.websitePage.findFirst({
    where: { websiteId: siteId, slug: def.slug },
  });

  const data = {
    title: def.title,
    intent: def.intent,
    status,
    sortOrder: def.sortOrder,
    seo: {
      title: clipSeo(seoTitle, 60),
      description: clipSeo(seoDescription, 155),
    },
    components,
  };

  if (existing) {
    const updated = await prisma.websitePage.update({
      where: { id: existing.id },
      data,
    });
    return { action: "updated", page: updated, bytes: prepared.length };
  }

  const created = await prisma.websitePage.create({
    data: {
      websiteId: siteId,
      slug: def.slug,
      ...data,
    },
  });
  return { action: "created", page: created, bytes: prepared.length };
}

async function main() {
  if (!existsSync(MARKETING_DIR)) {
    throw new Error(`Marketing pages directory not found: ${MARKETING_DIR}`);
  }

  const { org, site } = await resolveSite();
  console.log(`Org: ${org.name} (${org.slug})`);
  console.log(`Site: ${site.name} /sites/${site.slug}`);

  // Site chrome (header / footer) — Gen 2 SoT, not WordPress
  const headerPath = join(MARKETING_DIR, "header.html");
  const footerPath = join(MARKETING_DIR, "footer.html");
  const prevMeta =
    site.metadata && typeof site.metadata === "object" ? site.metadata : {};
  const prevChrome =
    prevMeta.chrome && typeof prevMeta.chrome === "object" ? prevMeta.chrome : {};
  const headerHtml = existsSync(headerPath)
    ? prepareChromeHtml(readFileSync(headerPath, "utf8"))
    : prevChrome.headerHtml ?? null;
  const footerHtml = existsSync(footerPath)
    ? prepareChromeHtml(readFileSync(footerPath, "utf8"))
    : prevChrome.footerHtml ?? null;
  await prisma.website.update({
    where: { id: site.id },
    data: {
      metadata: {
        ...prevMeta,
        chrome: {
          ...prevChrome,
          headerHtml,
          footerHtml,
          stylesheets: [
            "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
            "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
          ],
        },
      },
    },
  });
  console.log(
    `Chrome header=${headerHtml ? `${headerHtml.length}c` : "no"} footer=${footerHtml ? `${footerHtml.length}c` : "no"}`,
  );

  const results = [];
  for (const def of PAGES) {
    const path = join(MARKETING_DIR, def.file);
    if (!existsSync(path)) {
      console.warn(`Missing file: ${def.file}`);
      continue;
    }
    const raw = readFileSync(path, "utf8");
    const result = await upsertPage(site.id, def, raw);
    results.push({ slug: def.slug, ...result });
    console.log(
      `${result.action.padEnd(7)} /${def.slug}  (${result.bytes} chars HTML)`,
    );
  }

  // Soft-archive leftover starter pages that collide with marketing IA
  const leftovers = await prisma.websitePage.findMany({
    where: {
      websiteId: site.id,
      slug: { in: ["services"] },
    },
    select: { id: true, slug: true, title: true },
  });
  for (const left of leftovers) {
    if (left.slug === "services") {
      await prisma.websitePage.update({
        where: { id: left.id },
        data: { status: "draft", sortOrder: 99 },
      });
      console.log(`left    /${left.slug} (kept as draft leftover)`);
    }
  }

  if (publish && site.status !== "published") {
    await prisma.website.update({
      where: { id: site.id },
      data: { status: "published", publishedAt: new Date() },
    });
    console.log("Published website");
  }

  console.log(`\nStudio: /apps/websites/studio/${site.id}`);
  console.log(`Preview: /sites/${site.slug}?preview=1`);
  for (const r of results) {
    const path =
      r.slug === "home"
        ? `/sites/${site.slug}?preview=1`
        : `/sites/${site.slug}/${r.slug}?preview=1`;
    console.log(`  ${path}`);
  }
  console.log(
    `\nDone — ${results.length} pages ${publish ? "published" : "draft"}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
