#!/usr/bin/env node
/**
 * Apply public-site layout/design polish from Aug 2026 review.
 *
 * - DigitalGate: prefer seeding from marketing/pages/homepage.html
 * - Roe Realty: keep header + first body Property Report CTA; drop extras
 * - CVH: demote second H1 → H2
 * - Aëtherra (aetherra.com.au → website slug aetheriel-com-au): ensure one H1
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-public-design-polish.mjs
 *   node --env-file=.env.local scripts/apply-public-design-polish.mjs --dry-run
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function polishRoe(html) {
  const notes = [];
  let seen = 0;
  const next = html.replace(
    /<a([^>]*href=["'][^"']*report\.roerealty\.com\.au[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi,
    (full, _attrs, label) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      if (!/property report/i.test(text)) return full;
      seen += 1;
      // Keep hero + mid-page magnet + closing section pills (.cta-button).
      if (seen <= 2) return full;
      if (/class=["'][^"']*cta-button/.test(full)) return full;
      notes.push(`removed body report CTA #${seen}`);
      return "";
    },
  );
  const cleaned = next
    .replace(/<div class="[^"]*cta[^"]*"\s*>\s*<\/div>/gi, "")
    .replace(/<p[^>]*>\s*<\/p>/g, "");
  const before = (html.match(/Get My Property Report/gi) || []).length;
  const after = (cleaned.match(/Get My Property Report/gi) || []).length;
  notes.push(`body report CTAs ${before} → ${after}`);
  return { html: cleaned, notes };
}

function polishCvh(html) {
  const notes = [];
  let i = 0;
  const next = html.replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, (full, attrs, inner) => {
    i += 1;
    if (i === 1) return full;
    notes.push(`demoted H1 #${i} → H2 (${inner.replace(/<[^>]+>/g, "").trim()})`);
    return `<h2${attrs || ""}>${inner}</h2>`;
  });
  return { html: next, notes };
}

function polishAetherra(html) {
  const notes = [];
  let next = html;

  const h1Count = (next.match(/<h1(\s|>)/gi) || []).length;
  if (h1Count === 0) {
    // Promote first major headline (usually "Heaven Meets Earth") to H1
    const promoted = next.replace(
      /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/i,
      (full, attrs, inner) => {
        notes.push(
          `promoted first H2 → H1 (${inner.replace(/<[^>]+>/g, "").trim()})`,
        );
        return `<h1${attrs || ""}>${inner}</h1>`;
      },
    );
    if (promoted !== next) next = promoted;
  } else if (h1Count > 1) {
    let i = 0;
    next = next.replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, (full, attrs, inner) => {
      i += 1;
      if (i === 1) return full;
      notes.push(`demoted H1 #${i} → H2`);
      return `<h2${attrs || ""}>${inner}</h2>`;
    });
  }

  if (/signals professionalism/i.test(next)) {
    next = next.replace(/<p[^>]*>[^<]*signals professionalism[^<]*<\/p>/gi, "");
    notes.push("removed developer meta copy");
  }

  // Soft hierarchy: "Join The Journey" should not compete as a second page title treatment
  if (!notes.length) notes.push("hierarchy already ok");
  return { html: next, notes };
}

async function updateHome(slug, polishFn, label) {
  const site = await prisma.website.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!site) {
    console.log(`! skip ${slug} — site not found`);
    return false;
  }

  const page = await prisma.websitePage.findFirst({
    where: {
      websiteId: site.id,
      OR: [{ slug: "home" }, { intent: "home" }],
    },
  });
  if (!page) {
    console.log(`! skip ${site.slug} — no home page`);
    return false;
  }

  const comps = Array.isArray(page.components)
    ? structuredClone(page.components)
    : [];
  let changed = false;
  const allNotes = [];

  const nextComps = comps.map((c) => {
    if (c?.type !== "html" || typeof c.props?.html !== "string") return c;
    const { html, notes } = polishFn(c.props.html);
    if (html !== c.props.html) {
      changed = true;
      allNotes.push(...notes);
      return { ...c, props: { ...c.props, html } };
    }
    return c;
  });

  if (!changed) {
    console.log(`· ${label || site.slug}: no HTML changes`);
    return false;
  }

  console.log(
    `${dryRun ? "[dry] " : ""}✓ ${label || site.slug}: ${allNotes.join("; ")}`,
  );
  if (!dryRun) {
    await prisma.websitePage.update({
      where: { id: page.id },
      data: { components: nextComps },
    });
  }
  return true;
}

async function main() {
  console.log(
    dryRun
      ? "Dry run — no Neon writes"
      : "Applying public design polish to Neon…",
  );
  console.log(
    "Note: aetherra.com.au + aetheriel.com.au both map to website slug aetheriel-com-au",
  );

  await updateHome("roe-realty", polishRoe, "roe-realty (roerealty.com.au)");
  await updateHome(
    "currumbin-valley-hideaway",
    polishCvh,
    "currumbin-valley-hideaway",
  );
  await updateHome(
    "aetheriel-com-au",
    polishAetherra,
    "aetherra.com.au (slug aetheriel-com-au)",
  );

  console.log(
    "\nDigitalGate: seed separately with:\n  node --env-file=.env.local scripts/seed-digitalgate-marketing-pages.mjs --publish",
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
