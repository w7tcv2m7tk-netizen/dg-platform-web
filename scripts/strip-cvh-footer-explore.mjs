#!/usr/bin/env node
/**
 * Strip CVH footer Explore column from Neon chrome.footerHtml and ensure stacked header.
 * Usage: node scripts/strip-cvh-footer-explore.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { stripCvhFooterExploreColumn } from "./lib/strip-cvh-footer-explore.mjs";

config({ path: ".env.local" });
const prisma = new PrismaClient();
const SITE_SLUG = "currumbin-valley-hideaway";

async function main() {
  const site = await prisma.website.findUnique({
    where: { slug: SITE_SLUG },
    include: { organisation: { select: { name: true } } },
  });
  if (!site) {
    console.error(`! missing site ${SITE_SLUG}`);
    process.exitCode = 1;
    return;
  }

  const prevMeta =
    site.metadata && typeof site.metadata === "object" ? site.metadata : {};
  const prevChrome =
    prevMeta.chrome && typeof prevMeta.chrome === "object"
      ? prevMeta.chrome
      : {};
  const before =
    typeof prevChrome.footerHtml === "string" ? prevChrome.footerHtml : "";
  const after = stripCvhFooterExploreColumn(before);

  const changed =
    before !== after ||
    prevChrome.headerLayout !== "stacked" ||
    prevChrome.overlayHeader !== true;

  if (!changed) {
    console.log(`✓ ${site.organisation.name}: Explore already absent, stacked header set`);
    return;
  }

  await prisma.website.update({
    where: { id: site.id },
    data: {
      metadata: {
        ...prevMeta,
        chrome: {
          ...prevChrome,
          footerHtml: after || null,
          headerLayout: "stacked",
          overlayHeader: true,
          headerCta: prevChrome.headerCta ?? {
            label: "Join the Circle",
            href: "https://circle.currumbinvalleyhideaway.com.au",
            backgroundColor: "#B9A48A",
          },
        },
      },
    },
  });

  const removedExplore = /<h4[^>]*>\s*Explore\s*<\/h4>/i.test(before) &&
    !/<h4[^>]*>\s*Explore\s*<\/h4>/i.test(after);
  console.log(
    `✓ ${site.organisation.name}: footer ${before.length}c → ${after.length}c` +
      (removedExplore ? " (Explore column removed)" : "") +
      "; headerLayout=stacked",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
