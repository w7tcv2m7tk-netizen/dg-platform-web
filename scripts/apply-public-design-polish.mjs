#!/usr/bin/env node
/**
 * Apply public-site layout/design polish from Aug 2026 review.
 *
 * - DigitalGate: tighter hero, no emoji pillars, single closing CTA band
 * - Roe Realty: reduce repeated Property Report CTAs (keep header + hero + one mid)
 * - CVH: demote second H1 → H2; keep one booking hierarchy
 * - Aëtherra: brand/hierarchy polish when site present
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-public-design-polish.mjs
 *   node --env-file=.env.local scripts/apply-public-design-polish.mjs --dry-run
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const __dirname = dirname(fileURLToPath(import.meta.url));

function polishDigitalGate(html) {
  let next = html;
  let notes = [];

  // Hero: one supporting sentence (drop redundant lede line if present)
  if (/hero-lede/.test(next)) {
    next = next.replace(
      /<p class="hero-lede[^"]*"[^>]*>[\s\S]*?<\/p>\s*/i,
      "",
    );
    notes.push("removed hero lede duplicate");
  }

  // Pillar emojis → compact labels (no emoji clutter)
  const emojiMap = [
    ["🔗", "01"],
    ["🗂️", "02"],
    ["🧠", "03"],
    ["⚡", "04"],
    ["📈", "05"],
  ];
  for (const [emoji, label] of emojiMap) {
    if (next.includes(emoji)) {
      next = next.split(emoji).join(label);
      notes.push(`pillar ${emoji} → ${label}`);
    }
  }

  // Founding section: keep Founding + Discovery only (drop third Explore)
  next = next.replace(
    /(<section class="alt" id="founding">[\s\S]*?<div class="hero-ctas"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    (full, open, ctas, close) => {
      const primary = ctas.match(
        /<a[^>]*founding-customers[^>]*>[\s\S]*?<\/a>/i,
      )?.[0];
      const discovery = ctas.match(
        /<a[^>]*(?:strategy-session|discover)[^>]*>[\s\S]*?<\/a>/i,
      )?.[0];
      if (!primary) return full;
      notes.push("founding CTAs → 2");
      return `${open}\n      ${primary}\n      ${discovery || ""}\n    ${close}`;
    },
  );

  // Final CTA section: collapse to Founding + Audit magnet (acquisition) — drop Explore duplicate
  next = next.replace(
    /(<section class="cta-section">[\s\S]*?<div class="hero-ctas"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/i,
    (full, open, ctas, close) => {
      const primary = ctas.match(
        /<a[^>]*founding-customers[^>]*>[\s\S]*?<\/a>/i,
      )?.[0];
      const audit =
        `<a href="https://audit.digitalgate.com.au" class="btn-secondary">Get My Free Business Audit →</a>`;
      if (!primary) return full;
      notes.push("closing CTA → Founding + Audit");
      return `${open}\n      ${primary}\n      ${audit}\n    ${close}`;
    },
  );

  // Soften duplicated “Become a Founding Customer” mid-page if > 2 remain in body CTAs
  // (header chrome is separate)

  return { html: next, notes };
}

function polishRoe(html) {
  let next = html;
  const notes = [];

  // Count Property Report CTAs in body
  const before = (next.match(/Get My Property Report|Get Property Report/gi) || [])
    .length;

  // Remove mid/bottom repeated full-width report buttons after the first body occurrence
  // Keep first hero CTA; convert later identical button blocks to text links or remove extras.
  let seenHeroOrFirst = 0;
  next = next.replace(
    /<a([^>]*href=["'][^"']*report\.roerealty\.com\.au[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi,
    (full, attrs, label) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      if (!/property report/i.test(text)) return full;
      seenHeroOrFirst += 1;
      // Keep first two (typically header is chrome; body hero + one mid)
      if (seenHeroOrFirst <= 2) return full;
      notes.push(`removed extra report CTA: ${text}`);
      return "";
    },
  );

  // Clean empty CTA wrappers left behind
  next = next.replace(/<div class="[^"]*cta[^"]*">\s*<\/div>/gi, "");
  next = next.replace(/<p[^>]*>\s*<\/p>/g, "");

  const after = (next.match(/Get My Property Report|Get Property Report/gi) || [])
    .length;
  notes.push(`report CTA count ${before} → ${after}`);
  return { html: next, notes };
}

function polishCvh(html) {
  let next = html;
  const notes = [];

  // Second H1 "A Place To Slow Down" → H2 (one H1 only)
  const h1s = [...next.matchAll(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length > 1) {
    // Keep first; demote rest
    let i = 0;
    next = next.replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, (full, attrs, inner) => {
      i += 1;
      if (i === 1) return full;
      notes.push(`demoted H1 #${i} → H2`);
      const a = attrs || "";
      return `<h2${a}>${inner}</h2>`;
    });
  }

  // Ensure Hideaway Circle appears once near end if missing
  if (!/hideaway-circle/i.test(next)) {
    const circleBlock = `
<section class="cvh-circle-cta" style="padding:3rem 1.5rem;text-align:center;background:#2C4137;color:#F5F2EF;">
  <h2 style="margin:0 0 0.75rem;font-size:1.5rem;">Join Hideaway Circle</h2>
  <p style="margin:0 0 1.25rem;opacity:0.9;max-width:32rem;margin-left:auto;margin-right:auto;">Members save 10% on direct stays. Soft invites, no spam.</p>
  <a href="/hideaway-circle" style="display:inline-flex;padding:0.75rem 1.25rem;border-radius:999px;background:#B9A48A;color:#1C2B2A;font-weight:600;text-decoration:none;">Join Hideaway Circle →</a>
</section>`;
    if (/<\/div>\s*$/i.test(next.trim()) || /<\/section>\s*$/i.test(next.trim())) {
      next = next.replace(/(<\/section>)(\s*)$/i, `$1${circleBlock}$2`);
      notes.push("added Hideaway Circle CTA band");
    } else {
      next += circleBlock;
      notes.push("appended Hideaway Circle CTA band");
    }
  }

  return { html: next, notes };
}

function polishAetherra(html) {
  let next = html;
  const notes = [];
  const h1s = [...next.matchAll(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi)];
  if (h1s.length > 1) {
    let i = 0;
    next = next.replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, (full, attrs, inner) => {
      i += 1;
      if (i === 1) return full;
      notes.push(`demoted H1 #${i} → H2`);
      return `<h2${attrs || ""}>${inner}</h2>`;
    });
  }
  // Soft-remove meta “signals professionalism” developer copy if present
  if (/signals professionalism/i.test(next)) {
    next = next.replace(
      /<p[^>]*>[^<]*signals professionalism[^<]*<\/p>/gi,
      "",
    );
    notes.push("removed developer meta copy");
  }
  return { html: next, notes };
}

const POLISHERS = {
  digitalgate: polishDigitalGate,
  "roe-realty": polishRoe,
  "currumbin-valley-hideaway": polishCvh,
  aetherra: polishAetherra,
  aetheriel: polishAetherra,
};

async function updateHome(slug, polishFn) {
  const site = await prisma.website.findFirst({
    where: {
      OR: [{ slug }, { slug: { contains: slug.split("-")[0] } }],
    },
    select: { id: true, slug: true, name: true },
  });
  if (!site) {
    console.log(`! skip ${slug} — site not found`);
    return;
  }
  const page = await prisma.websitePage.findFirst({
    where: {
      websiteId: site.id,
      OR: [{ slug: "home" }, { intent: "home" }],
    },
  });
  if (!page) {
    console.log(`! skip ${site.slug} — no home page`);
    return;
  }

  const comps = Array.isArray(page.components) ? structuredClone(page.components) : [];
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
    console.log(`· ${site.slug}: no HTML changes`);
    return;
  }

  console.log(
    `${dryRun ? "[dry] " : ""}✓ ${site.slug}: ${allNotes.join("; ") || "updated"}`,
  );
  if (!dryRun) {
    await prisma.websitePage.update({
      where: { id: page.id },
      data: { components: nextComps },
    });
  }
}

async function syncDigitalGateSource() {
  const src = join(__dirname, "../../dg-platform/marketing/pages/homepage.html");
  if (!existsSync(src)) return;
  const raw = readFileSync(src, "utf8");
  const { html, notes } = polishDigitalGate(raw);
  if (html === raw) {
    console.log("· marketing homepage.html already polished");
    return;
  }
  console.log(
    `${dryRun ? "[dry] " : ""}✓ marketing/pages/homepage.html: ${notes.join("; ")}`,
  );
  if (!dryRun) writeFileSync(src, html);
}

async function main() {
  await syncDigitalGateSource();

  for (const [slug, fn] of Object.entries(POLISHERS)) {
    // Prefer exact slug match for known brands
    const site = await prisma.website.findUnique({
      where: { slug },
      select: { slug: true },
    });
    if (!site && (slug === "aetherra" || slug === "aetheriel")) {
      const soft = await prisma.website.findFirst({
        where: {
          OR: [
            { slug: { contains: "aether" } },
            { name: { contains: "Aether", mode: "insensitive" } },
          ],
        },
        select: { slug: true },
      });
      if (soft) await updateHome(soft.slug, fn);
      else console.log(`! skip ${slug}`);
      continue;
    }
    if (!site) {
      console.log(`! skip ${slug}`);
      continue;
    }
    await updateHome(slug, fn);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
