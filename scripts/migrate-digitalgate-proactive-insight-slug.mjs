#!/usr/bin/env node
/**
 * Canonicalise the proactive DigitalGate Insight page slug in native Website Studio.
 *
 * Safe/idempotent behaviour:
 * - no-op when the canonical page already exists and the legacy page does not
 * - migrate the legacy page in place when the canonical page is absent
 * - refuse to mutate when both legacy and canonical pages exist
 *
 * Run against the intended DATABASE_URL only after executable deployment verification.
 */
import { PrismaClient } from "@prisma/client";

const SITE_SLUG = "digitalgate";
const LEGACY_SLUG = "software-that-tells-you-what-needs-doing";
const CANONICAL_SLUG = "business-software-should-tell-you-what-needs-doing";
const CANONICAL_URL = `https://digitalgate.com.au/${CANONICAL_SLUG}/`;
const CANONICAL_TITLE = "The Best Business Software Should Tell You What Needs Doing";

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.website.findUnique({ where: { slug: SITE_SLUG } });
  if (!site) throw new Error(`Website ${SITE_SLUG} not found`);

  const [legacy, canonical] = await Promise.all([
    prisma.websitePage.findFirst({
      where: { websiteId: site.id, slug: LEGACY_SLUG },
    }),
    prisma.websitePage.findFirst({
      where: { websiteId: site.id, slug: CANONICAL_SLUG },
    }),
  ]);

  if (canonical && !legacy) {
    console.log(JSON.stringify({
      ok: true,
      status: "already-canonical",
      pageId: canonical.id,
      slug: canonical.slug,
    }, null, 2));
    return;
  }

  if (canonical && legacy) {
    throw new Error(
      `Refusing migration: both ${LEGACY_SLUG} and ${CANONICAL_SLUG} exist for ${SITE_SLUG}`,
    );
  }

  if (!legacy) {
    throw new Error(
      `Refusing migration: neither legacy nor canonical proactive Insight page exists for ${SITE_SLUG}`,
    );
  }

  const seo = legacy.seo && typeof legacy.seo === "object" && !Array.isArray(legacy.seo)
    ? { ...legacy.seo }
    : {};

  const updated = await prisma.websitePage.update({
    where: { id: legacy.id },
    data: {
      slug: CANONICAL_SLUG,
      title: CANONICAL_TITLE,
      seo: {
        ...seo,
        canonical: CANONICAL_URL,
        title: "Business Software Should Tell You What Needs Doing | DigitalGate",
        ogTitle: "Business Software Should Tell You What Needs Doing | DigitalGate",
      },
    },
  });

  console.log(JSON.stringify({
    ok: true,
    status: "migrated",
    pageId: updated.id,
    from: LEGACY_SLUG,
    to: updated.slug,
    canonical: CANONICAL_URL,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
