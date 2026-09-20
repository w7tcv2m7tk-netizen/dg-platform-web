#!/usr/bin/env node
/**
 * Pricing-only Website Studio sync.
 *
 * Writes marketing/pages/pricing-page.html onto the live DigitalGate
 * `pricing` page. Does not rebuild Apps pages, homepage chips, or chrome.
 *
 * Refuses any Neon host that is not the production allowlist endpoint.
 * Never prints DATABASE_URL or credentials.
 *
 * Run: npm run sync:dg-pricing
 * Dry: npm run sync:dg-pricing -- --dry-run
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

import { classifyNeonHost } from "./env-pairing.mjs";
import { patchPricingAppsSection } from "./patch-pricing-apps-section.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const PRICING_IN_REPO = join(REPO, "marketing", "pages", "pricing-page.html");
const SITE_SLUG = "digitalgate";
const WEBSITE_ID = process.env.DG_APPS_WEBSITE_ID || "cmskwz6zv0001l404cfi1wal4";

/** @typedef {import("./env-pairing.mjs").NeonHostClass} NeonHostClass */

/**
 * Production-only gate for this CMS write. Clerk is not required: this is a
 * Website Studio HTML replacement, not an app boot.
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function assertProductionNeonPairing(env = process.env) {
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const declared = env.DG_NEON_ENV?.trim().toLowerCase() ?? "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL missing — production pricing sync blocked");
  }
  if (declared !== "production") {
    throw new Error(
      `DG_NEON_ENV must be production for the live pricing sync (got ${declared || "missing"})`,
    );
  }
  const host = classifyNeonHost(databaseUrl, env);
  if (host.class !== "production") {
    throw new Error(
      `Neon host class is ${host.class}, not production — pricing sync blocked`,
    );
  }
  return host;
}

/**
 * Locked commercial architecture. Used as a pre-write guard so the sync
 * cannot silently ship a different package.
 *
 * @param {string} html
 */
export function assertCanonicalPricingArchitecture(html) {
  const errors = [];
  const required = [
    ["Growth Suite $399", /Growth Suite \$399/],
    ["Industry $149", /\$149\/month each/],
    ["bundle $499 add-on", /Growth Suite \+ Industry \$499/],
    ["$748 example", /\$748\/month/],
    ["AI Communications standalone section", /id="ai-communications"/],
    ["AI Communications Coming Soon", /id="ai-communications"[\s\S]{0,800}Coming Soon/],
    ["AI Communications not a Growth App", /Standalone capability — not a Growth App/],
    ["native FAQ details", /<details class="faq-item">/],
  ];
  for (const [label, re] of required) {
    if (!re.test(html)) errors.push(`missing ${label}`);
  }

  if (html.includes('data-dg-stripe="addon-voice-ai"')) {
    errors.push("AI Communications still has a Stripe Add App control");
  }

  const growthSection = html.match(/<section[^>]*id="growth"[\s\S]*?<\/section>/)?.[0] ?? "";
  const growthGrid = growthSection.match(
    /<details class="individual-growth">[\s\S]*?<\/details>/,
  )?.[0] ?? "";
  const aiSection = html.match(/<section[^>]*id="ai-communications"[\s\S]*?<\/section>/)?.[0] ?? "";
  const growthIdx = html.indexOf('id="growth"');
  const aiIdx = html.indexOf('id="ai-communications"');
  const industryIdx = html.indexOf('id="industry"');

  if (!growthSection || !growthGrid) {
    errors.push("Growth section or individual Growth Apps grid is missing");
  } else if (/AI Communications/.test(growthSection)) {
    errors.push("AI Communications still appears in the Growth section or grid");
  }
  if (!aiSection) {
    errors.push("AI & Communications section is missing");
  } else {
    if (!/Coming Soon/.test(aiSection)) {
      errors.push("AI Communications section is not Coming Soon");
    }
    if (/Add App/.test(aiSection) || /data-dg-stripe/.test(aiSection)) {
      errors.push("AI Communications section still has an Add App / checkout action");
    }
    if (/Early Access/.test(aiSection)) {
      errors.push("AI Communications standalone section is labelled Early Access");
    }
  }
  if (!(growthIdx > -1 && aiIdx > growthIdx && industryIdx > aiIdx)) {
    errors.push("AI & Communications section must sit after Growth and before Industry");
  }
  if (errors.length) {
    throw new Error(`Canonical pricing architecture check failed: ${errors.join("; ")}`);
  }
}

export function loadCanonicalPricingHtml() {
  if (!existsSync(PRICING_IN_REPO)) {
    throw new Error(`Missing canonical pricing HTML: ${PRICING_IN_REPO}`);
  }
  const raw = readFileSync(PRICING_IN_REPO, "utf8");
  const next = patchPricingAppsSection(raw);
  assertCanonicalPricingArchitecture(next);
  return next;
}

export function sha256Short(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 12);
}

/**
 * Replace only the first HTML island on the pricing page.
 *
 * @param {unknown} components
 * @param {string} html
 */
export function replacePricingHtmlIsland(components, html) {
  if (!Array.isArray(components)) {
    throw new Error("pricing page has no components array");
  }
  const next = components.map((c) => ({ ...c }));
  const htmlIdx = next.findIndex((c) => c?.type === "html" && typeof c?.props?.html === "string");
  if (htmlIdx < 0) {
    throw new Error("pricing page has no html island to replace");
  }
  next[htmlIdx] = {
    ...next[htmlIdx],
    props: { ...next[htmlIdx].props, html },
  };
  return { components: next, htmlIdx };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const host = assertProductionNeonPairing();
  const html = loadCanonicalPricingHtml();

  const prisma = new PrismaClient();
  try {
    const site = await prisma.website.findFirst({
      where: { id: WEBSITE_ID, slug: SITE_SLUG },
      include: {
        pages: {
          where: { slug: "pricing" },
          select: { id: true, slug: true, title: true, components: true },
        },
      },
    });
    if (!site) {
      throw new Error(`Website ${WEBSITE_ID} / ${SITE_SLUG} not found on this Neon`);
    }
    const pricing = site.pages[0];
    if (!pricing) {
      throw new Error("pricing page not found — refusing to create a new page");
    }
    const { components, htmlIdx } = replacePricingHtmlIsland(pricing.components, html);
    const summary = {
      ok: true,
      dryRun,
      websiteId: site.id,
      pageId: pricing.id,
      htmlIdx,
      htmlBytes: html.length,
      htmlSha12: sha256Short(html),
      neonClass: host.class,
      neonEndpointId: host.endpointId,
      wrote: false,
    };
    if (dryRun) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    await prisma.websitePage.update({
      where: { id: pricing.id },
      data: { components },
    });
    summary.wrote = true;
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
