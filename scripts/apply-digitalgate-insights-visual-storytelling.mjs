#!/usr/bin/env node
/**
 * Apply the approved DigitalGate visual storytelling system to the four
 * foundational/proactive Insight pages already stored in native Website Studio.
 *
 * Run only after the corresponding content sync is complete.
 */
import { PrismaClient } from "@prisma/client";
import { enhanceEditorialInsight, enhanceFoundationalInsight } from "../marketing/pages/insights/visual-storytelling.mjs";

const SITE_SLUG = "digitalgate";
const TARGETS = [
  "from-dumb-businesses-to-smart-businesses",
  "intelligent-business-more-than-a-brain",
  "from-signal-to-action",
  "software-that-tells-you-what-needs-doing",
];

const prisma = new PrismaClient();

function transform(slug, html) {
  if (slug === "from-dumb-businesses-to-smart-businesses" || slug === "intelligent-business-more-than-a-brain") {
    return enhanceFoundationalInsight(html, slug);
  }
  const id = slug === "from-signal-to-action" ? "foundational-3" : "proactive-business-software";
  return enhanceEditorialInsight(html, { id });
}

async function main() {
  const site = await prisma.website.findFirst({ where: { slug: SITE_SLUG }, include: { pages: true } });
  if (!site) throw new Error(`Website ${SITE_SLUG} not found`);

  const results = [];
  for (const slug of TARGETS) {
    const page = site.pages.find((candidate) => candidate.slug === slug);
    if (!page) {
      results.push({ slug, status: "missing" });
      continue;
    }
    const components = Array.isArray(page.components) ? [...page.components] : [];
    const htmlIndex = components.findIndex((component) => component?.type === "html" && typeof component?.props?.html === "string");
    if (htmlIndex < 0) {
      results.push({ slug, status: "no-html-component" });
      continue;
    }
    const before = components[htmlIndex].props.html;
    const after = transform(slug, before);
    if (after === before) {
      results.push({ slug, status: "unchanged" });
      continue;
    }
    components[htmlIndex] = { ...components[htmlIndex], props: { ...components[htmlIndex].props, html: after } };
    await prisma.websitePage.update({ where: { id: page.id }, data: { components } });
    results.push({ slug, status: "updated" });
  }

  console.log(JSON.stringify({ ok: true, websiteId: site.id, results, previews: TARGETS.map((slug) => `https://digitalgate.com.au/${slug}/`) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});