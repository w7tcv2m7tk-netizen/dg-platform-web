#!/usr/bin/env node
/**
 * Sync migrated Insight articles into Gen 2 Website Studio (Neon).
 * Run: npm run sync:dg-insights  (from dg-platform-web)
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const MARKETING_IN_REPO = join(REPO, "marketing", "pages", "insights");
const MARKETING_SIBLING = join(REPO, "..", "dg-platform", "marketing", "pages", "insights");
const MARKETING = existsSync(join(MARKETING_IN_REPO, "articles.mjs"))
  ? MARKETING_IN_REPO
  : MARKETING_SIBLING;
const HTML_ROOT = join(MARKETING, "html");

const SITE_SLUG = "digitalgate";

function readHtml(slug) {
  const path = join(HTML_ROOT, `${slug}.html`);
  if (!existsSync(path)) throw new Error(`Missing HTML: ${slug}.html`);
  return readFileSync(path, "utf8");
}

function htmlComponent(html) {
  return [
    {
      id: `insight-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      type: "html",
      props: { html },
    },
  ];
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
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;
}

function clipSeo(s, max) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t || t.length <= max) return t || null;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function patchInsightsIndexLinks(html) {
  let out = html;
  const replacements = [
    ["https://digitalgate.com.au/how-chatgpt-chooses-which-businesses-to-recommend", "/how-chatgpt-chooses-which-businesses-to-recommend/"],
    ["https://digitalgate.com.au/how-gemini-recommends-local-businesses", "/how-gemini-recommends-local-businesses/"],
    ["https://digitalgate.com.au/will-ai-replace-google-search", "/will-ai-replace-google-search/"],
    ["https://digitalgate.com.au/ai-search-vs-traditional-seo", "/ai-search-vs-traditional-seo/"],
    ["https://digitalgate.com.au/entity-seo-for-real-estate-agencies", "/entity-seo-for-real-estate-agencies/"],
    ["https://digitalgate.com.au/chatgpt-vs-google-for-real-estate-marketing", "/chatgpt-vs-google-for-real-estate-marketing/"],
    ["https://digitalgate.com.au/ai-visibility-for-real-estate-agencies", "/ai-visibility-for-real-estate-agencies/"],
    ["https://digitalgate.com.au/why-ai-search-changes-lead-generation-for-real-estate-agencies", "/why-ai-search-changes-lead-generation-for-real-estate-agencies/"],
    ["https://digitalgate.com.au/local-seo-real-estate-vendor-leads", "/local-seo-real-estate-vendor-leads/"],
    ["https://digitalgate.com.au/local-seo-in-the-age-of-ai-search", "/local-seo-in-the-age-of-ai-search/"],
  ];
  for (const [from, to] of replacements) {
    out = out.split(from).join(to);
    out = out.split(`${from}/`).join(to);
  }
  return out;
}

async function main() {
  execSync("node build.mjs", { cwd: MARKETING, stdio: "inherit" });

  const articlesUrl = pathToFileURL(join(MARKETING, "articles.mjs")).href;
  const { MIGRATED_ARTICLES } = await import(articlesUrl);

  const prisma = new PrismaClient();
  const site = await prisma.website.findFirst({
    where: { slug: SITE_SLUG },
    include: { pages: true },
  });
  if (!site) throw new Error(`Website ${SITE_SLUG} not found`);

  const pageBySlug = new Map(site.pages.map((p) => [p.slug, p]));
  let created = 0;
  let updated = 0;
  let sort = 200;

  async function upsertPage({ slug, title, html, seo }) {
    const components = htmlComponent(html);
    const existing = pageBySlug.get(slug);
    if (existing) {
      await prisma.websitePage.update({
        where: { id: existing.id },
        data: { title, status: "published", sortOrder: sort++, seo, components },
      });
      updated++;
      return;
    }
    const page = await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        title,
        slug,
        intent: "custom",
        status: "published",
        sortOrder: sort++,
        seo,
        components,
      },
    });
    pageBySlug.set(slug, page);
    created++;
  }

  for (const A of MIGRATED_ARTICLES) {
    const html = readHtml(A.slug);
    const seoTitle = extractTitle(html) || A.seoTitle;
    await upsertPage({
      slug: A.slug,
      title: A.h1,
      html,
      seo: {
        title: clipSeo(seoTitle, 60),
        description: clipSeo(A.metaDescription, 155),
        ogTitle: clipSeo(seoTitle, 60),
        ogDescription: clipSeo(A.metaDescription, 155),
        canonical: `https://digitalgate.com.au/${A.slug}/`,
        keywords: A.primaryKeyword ? [A.primaryKeyword] : [],
        showHeader: true,
        showFooter: true,
      },
    });
  }

  const insights = pageBySlug.get("insights");
  if (insights) {
    const comps = Array.isArray(insights.components) ? [...insights.components] : [];
    const htmlIdx = comps.findIndex((c) => c.type === "html");
    if (htmlIdx >= 0 && typeof comps[htmlIdx].props?.html === "string") {
      comps[htmlIdx] = {
        ...comps[htmlIdx],
        props: { html: patchInsightsIndexLinks(comps[htmlIdx].props.html) },
      };
      await prisma.websitePage.update({ where: { id: insights.id }, data: { components: comps } });
      updated++;
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        websiteId: site.id,
        insightArticles: MIGRATED_ARTICLES.length,
        created,
        updated,
        preview: "https://digitalgate.com.au/ai-search-vs-traditional-seo/",
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
