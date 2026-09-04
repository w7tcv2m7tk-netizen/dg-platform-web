#!/usr/bin/env node
/**
 * Sync DigitalGate foundational Connected Business Insights into native Gen 2 Website Studio.
 * Source of truth: marketing/pages/*.html
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const PAGES = join(REPO, "marketing", "pages");
const SITE_SLUG = "digitalgate";

const ARTICLES = [
  {
    slug: "from-signal-to-action",
    title: "From Signal to Action",
    file: "from-signal-to-action.html",
    seo: {
      title: "From Signal to Action | DigitalGate Insights",
      description: "How the DigitalGate intelligence loop turns connected business signals into context, advice, action and learning — with humans in control of consequential decisions.",
      canonical: "https://digitalgate.com.au/from-signal-to-action/",
    },
  },
  {
    slug: "software-that-tells-you-what-needs-doing",
    title: "The software that tells you what needs doing",
    file: "software-that-tells-you-what-needs-doing.html",
    seo: {
      title: "The Software That Tells You What Needs Doing | DigitalGate Insights",
      description: "The next generation of business software should not wait for instructions. It should notice what matters, recommend the next move and help the business act.",
      canonical: "https://digitalgate.com.au/software-that-tells-you-what-needs-doing/",
    },
  },
];

const OLD_SERIES_CARD = `<div class="series-card soon">
          <span class="series-num">03 · Coming soon</span>
          <h3>From Signal to Action</h3>
          <p>How the DigitalGate AI loop actually works — Connect, Understand, Advise, Act and Learn in depth.</p>
          <span class="series-more">In build</span>
        </div>`;

const NEW_SERIES_CARDS = `<a class="series-card featured" href="/from-signal-to-action/">
          <span class="series-num">03 · Intelligence Loop</span>
          <h3>From Signal to Action</h3>
          <p>How connected business signals become understanding, advice, governed action and learning through the DigitalGate intelligence loop.</p>
          <span class="series-more">Read Part 3 →</span>
        </a>
        <a class="series-card featured" href="/software-that-tells-you-what-needs-doing/">
          <span class="series-num">04 · Proactive Business Software</span>
          <h3>The software that tells you what needs doing</h3>
          <p>Why the next generation of business software should notice what matters, recommend the next move and help the business act.</p>
          <span class="series-more">Read Part 4 →</span>
        </a>`;

function htmlComponent(html) {
  return [{ id: `insight-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, type: "html", props: { html } }];
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const site = await prisma.website.findFirst({ where: { slug: SITE_SLUG }, include: { pages: true } });
    if (!site) throw new Error(`Website ${SITE_SLUG} not found`);

    const pageBySlug = new Map(site.pages.map((page) => [page.slug, page]));
    let sortOrder = Math.max(200, ...site.pages.map((page) => page.sortOrder || 0)) + 1;

    for (const article of ARTICLES) {
      const html = readFileSync(join(PAGES, article.file), "utf8");
      const data = {
        title: article.title,
        intent: "custom",
        status: "published",
        sortOrder: pageBySlug.get(article.slug)?.sortOrder ?? sortOrder++,
        seo: {
          ...article.seo,
          ogTitle: article.seo.title,
          ogDescription: article.seo.description,
          showHeader: true,
          showFooter: true,
        },
        components: htmlComponent(html),
      };

      const existing = pageBySlug.get(article.slug);
      if (existing) {
        await prisma.websitePage.update({ where: { id: existing.id }, data });
      } else {
        const created = await prisma.websitePage.create({ data: { websiteId: site.id, slug: article.slug, ...data } });
        pageBySlug.set(article.slug, created);
      }
    }

    const insights = pageBySlug.get("insights");
    if (!insights) throw new Error("Insights index page not found");
    const components = Array.isArray(insights.components) ? structuredClone(insights.components) : [];
    const htmlIndex = components.findIndex((component) => component?.type === "html" && typeof component?.props?.html === "string");
    if (htmlIndex < 0) throw new Error("Insights index HTML component not found");

    const currentHtml = components[htmlIndex].props.html;
    let nextHtml = currentHtml;
    if (currentHtml.includes(OLD_SERIES_CARD)) {
      nextHtml = currentHtml.replace(OLD_SERIES_CARD, NEW_SERIES_CARDS);
    } else if (!currentHtml.includes('/from-signal-to-action/')) {
      throw new Error("Expected Part 3 placeholder not found; refusing to patch an unknown index structure");
    }

    if (nextHtml !== currentHtml) {
      components[htmlIndex] = { ...components[htmlIndex], props: { ...components[htmlIndex].props, html: nextHtml } };
      await prisma.websitePage.update({ where: { id: insights.id }, data: { components } });
    }

    console.log(JSON.stringify({ ok: true, websiteId: site.id, articles: ARTICLES.map((a) => a.slug), indexUpdated: nextHtml !== currentHtml }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
