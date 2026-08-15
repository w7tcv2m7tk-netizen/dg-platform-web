/**
 * Strip wb-html-island--light from DigitalGate navy marketing pages
 * (contact / about / founding / legal) stored in Neon.
 * Live production still serves an older CSS build where cream-island ink
 * (#2f2f2f) wins; removing --light lets the dark-page rules apply immediately.
 *
 * Usage: node --import tsx scripts/strip-dg-navy-light-island.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const NAVY_SLUGS = new Set([
  "contact",
  "about",
  "founding-customers",
  "terms-conditions",
  "privacy-policy",
  "privacy",
  "terms",
]);

const NAVY_MARKERS = /\b(?:dg-fc|dg-about|dg-contact|dg-legal)\b/;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const site = await prisma.website.findUnique({ where: { slug: "digitalgate" } });
  if (!site) {
    console.error("Website slug=digitalgate not found");
    await prisma.$disconnect();
    process.exit(1);
  }

  const pages = await prisma.websitePage.findMany({
    where: { websiteId: site.id },
    select: { id: true, slug: true, title: true, components: true },
  });

  let updated = 0;
  for (const page of pages) {
    const components = Array.isArray(page.components) ? page.components : [];
    let changed = false;
    const next = components.map((c) => {
      if (!c || typeof c !== "object" || c.type !== "html") return c;
      const html = typeof c.props?.html === "string" ? c.props.html : "";
      if (!html) return c;
      const isNavy =
        NAVY_SLUGS.has(page.slug) || NAVY_MARKERS.test(html);
      if (!isNavy) return c;
      if (!/\bwb-html-island--light\b/.test(html)) return c;
      const cleaned = html
        .replace(/\bwb-html-island--light\b/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/class="\s+/g, 'class="')
        .replace(/\s+"/g, '"');
      changed = true;
      return { ...c, props: { ...c.props, html: cleaned } };
    });

    if (!changed) continue;

    await prisma.websitePage.update({
      where: { id: page.id },
      data: { components: next },
    });
    updated += 1;
    console.log("Stripped --light from", page.slug, `(${page.title})`);
  }

  console.log(`Done. Updated ${updated} page(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
