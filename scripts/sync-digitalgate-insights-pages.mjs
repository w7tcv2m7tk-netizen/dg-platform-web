#!/usr/bin/env node
/**
 * Sync DigitalGate Insight articles into Gen 2 Website Studio (Neon).
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
const PROACTIVE_INSIGHT_SLUG = "software-that-tells-you-what-needs-doing";

function readHtml(slug) {
  const path = join(HTML_ROOT, `${slug}.html`);
  if (!existsSync(path)) throw new Error(`Missing HTML: ${slug}.html`);
  return readFileSync(path, "utf8");
}

function htmlComponent(html) {
  return [{
    id: `insight-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    type: "html",
    props: { html },
  }];
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

function patchMigratedInsightLinks(html) {
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
    out = out.split(`${from}/`).join(to);
    out = out.split(from).join(to);
  }
  return out;
}

function patchInsightsIndex(html) {
  let out = patchMigratedInsightLinks(html);
  out = out.replace(
    `<div class="series-card soon">\n          <span class="series-num">03 · Coming soon</span>\n          <h3>From Signal to Action</h3>\n          <p>How the DigitalGate AI loop actually works — Connect, Understand, Advise, Act and Learn in depth.</p>\n          <span class="series-more">In build</span>\n        </div>`,
    `<a class="series-card featured" href="/from-signal-to-action/">\n          <span class="series-num">03 · Intelligence Loop</span>\n          <h3>From Signal to Action</h3>\n          <p>How the DigitalGate intelligence loop works — Connect, Understand, Advise, Act and Learn in depth.</p>\n          <span class="series-more">Read Part 3 →</span>\n        </a>`,
  );
  out = out.replace(
    `<div class="insight-card" id="automation-ai" style="border-style:dashed;">\n          <span class="insight-kicker">Automation &amp; AI</span>\n          <h3>Practical automation in everyday operations</h3>\n          <p>This cluster is next: workflows, communications and the manual work that disconnected systems create.</p>\n        </div>`,
    `<a class="insight-card" id="automation-ai" href="/${PROACTIVE_INSIGHT_SLUG}/">\n          <span class="insight-kicker">Automation &amp; AI</span>\n          <h3>The Best Business Software Should Tell You What Needs Doing</h3>\n          <p>Why intelligent software should notice what matters, recommend the next action and help execute it — instead of waiting for prompts.</p>\n          <span class="insight-more">Read article →</span>\n        </a>`,
  );
  return out;
}

function patchFoundationalPart3Links(html) {
  let out = html;
  out = out.replace(
    /<span class="soon">\s*<span class="num">Part 3<\/span>\s*<span class="title">From Signal to Action<\/span>\s*<\/span>/g,
    `<a href="/from-signal-to-action/"><span class="num">Part 3</span><span class="title">From Signal to Action</span></a>`,
  );
  out = out.replace(
    /Part 3 — <em>From Signal to Action<\/em> — will go deeper on Connect → Understand → Advise → Act → Learn: how the DigitalGate AI loop actually works in practice\./g,
    `Part 3 — <a href="/from-signal-to-action/"><em>From Signal to Action</em></a> — goes deeper on Connect → Understand → Advise → Act → Learn: how the DigitalGate intelligence loop works in practice.`,
  );
  return out;
}

async function main() {
  execSync("node build.mjs", { cwd: MARKETING, stdio: "inherit" });

  const articlesUrl = pathToFileURL(join(MARKETING, "articles.mjs")).href;
  const editorialUrl = pathToFileURL(join(MARKETING, "editorial-series.mjs")).href;
  const { MIGRATED_ARTICLES } = await import(articlesUrl);
  const { EDITORIAL_INSIGHTS, renderEditorialInsight } = await import(editorialUrl);

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
      const page = await prisma.websitePage.update({
        where: { id: existing.id },
        data: { title, status: "published", sortOrder: sort++, seo, components },
      });
      pageBySlug.set(slug, page);
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

  for (const article of MIGRATED_ARTICLES) {
    const html = readHtml(article.slug);
    const seoTitle = extractTitle(html) || article.seoTitle;
    await upsertPage({
      slug: article.slug,
      title: article.h1,
      html,
      seo: {
        title: clipSeo(seoTitle, 60),
        description: clipSeo(article.metaDescription, 155),
        ogTitle: clipSeo(seoTitle, 60),
        ogDescription: clipSeo(article.metaDescription, 155),
        canonical: `https://digitalgate.com.au/${article.slug}/`,
        keywords: article.primaryKeyword ? [article.primaryKeyword] : [],
        showHeader: true,
        showFooter: true,
      },
    });
  }

  for (const article of EDITORIAL_INSIGHTS) {
    const canonicalSlug = article.id === "proactive-business-software"
      ? PROACTIVE_INSIGHT_SLUG
      : article.slug;
    const canonicalArticle = canonicalSlug === article.slug
      ? article
      : { ...article, slug: canonicalSlug };
    const html = renderEditorialInsight(canonicalArticle);
    await upsertPage({
      slug: canonicalSlug,
      title: article.title,
      html,
      seo: {
        title: clipSeo(article.seoTitle, 60),
        description: clipSeo(article.metaDescription, 155),
        ogTitle: clipSeo(article.seoTitle, 60),
        ogDescription: clipSeo(article.metaDescription, 155),
        canonical: `https://digitalgate.com.au/${canonicalSlug}/`,
        authorName: "Ben Roe",
        schemaType: "article",
        showHeader: true,
        showFooter: true,
      },
    });
  }

  const index = pageBySlug.get("insights");
  if (index) {
    const comps = Array.isArray(index.components) ? [...index.components] : [];
    const htmlIdx = comps.findIndex((c) => c.type === "html");
    if (htmlIdx >= 0 && typeof comps[htmlIdx].props?.html === "string") {
      comps[htmlIdx] = {
        ...comps[htmlIdx],
        props: { html: patchInsightsIndex(comps[htmlIdx].props.html) },
      };
      await prisma.websitePage.update({ where: { id: index.id }, data: { components: comps } });
      updated++;
    }
  }

  for (const slug of ["from-dumb-businesses-to-smart-businesses", "intelligent-business-more-than-a-brain"]) {
    const page = pageBySlug.get(slug);
    if (!page) continue;
    const comps = Array.isArray(page.components) ? [...page.components] : [];
    const htmlIdx = comps.findIndex((c) => c.type === "html");
    if (htmlIdx < 0 || typeof comps[htmlIdx].props?.html !== "string") continue;
    const patched = patchFoundationalPart3Links(comps[htmlIdx].props.html);
    if (patched === comps[htmlIdx].props.html) continue;
    comps[htmlIdx] = { ...comps[htmlIdx], props: { html: patched } };
    await prisma.websitePage.update({ where: { id: page.id }, data: { components: comps } });
    updated++;
  }

  console.log(JSON.stringify({
    ok: true,
    websiteId: site.id,
    migratedArticles: MIGRATED_ARTICLES.length,
    editorialInsights: EDITORIAL_INSIGHTS.length,
    created,
    updated,
    previews: [
      "https://digitalgate.com.au/from-signal-to-action/",
      `https://digitalgate.com.au/${PROACTIVE_INSIGHT_SLUG}/`,
    ],
  }, null, 2));

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});