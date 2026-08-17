#!/usr/bin/env node
/**
 * Rewrite site-wide CTAs / links to dedicated product funnel subdomains.
 *
 * Updates:
 * - Website.metadata.chrome.headerCta
 * - WebsitePage.components HTML / href fields
 * - Known relative paths: /business-audit, /property-report
 * - Absolute paths on brand hosts pointing at those pages
 *
 * Usage:
 *   node --env-file=.env.local scripts/rewrite-funnel-cta-links.mjs
 *   node --env-file=.env.local scripts/rewrite-funnel-cta-links.mjs --dry-run
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

const AUDIT = "https://audit.digitalgate.com.au";
const REPORT = "https://report.roerealty.com.au";
const CIRCLE = "https://circle.currumbinvalleyhideaway.com.au";

const REPLACEMENTS = [
  // Absolute brand paths
  [/https?:\/\/(www\.)?digitalgate\.com\.au\/business-audit\/?/gi, AUDIT],
  [/https?:\/\/(www\.)?digitalgate\.com\.au\/free-agency-audit\/?/gi, AUDIT],
  [/https?:\/\/(www\.)?roerealty\.com\.au\/property-report\/?/gi, REPORT],
  // Relative href attributes
  [/(\bhref=["'])\/business-audit\/?(?=["'#?\s])/gi, `$1${AUDIT}`],
  [/(\bhref=["'])\/free-agency-audit\/?(?=["'#?\s])/gi, `$1${AUDIT}`],
  [/(\bhref=["'])\/property-report\/?(?=["'#?\s])/gi, `$1${REPORT}`],
  // JSON string values
  [/"\/business-audit\/?"/g, `"${AUDIT}"`],
  [/"\/free-agency-audit\/?"/g, `"${AUDIT}"`],
  [/"\/property-report\/?"/g, `"${REPORT}"`],
];

function rewriteString(input) {
  if (typeof input !== "string" || !input) return { value: input, changed: false };
  let value = input;
  let changed = false;
  for (const [pattern, replacement] of REPLACEMENTS) {
    const next = value.replace(pattern, replacement);
    if (next !== value) {
      value = next;
      changed = true;
    }
  }
  // Also catch unquoted bare paths in some CTA configs
  if (
    value === "/business-audit" ||
    value === "/business-audit/" ||
    value === "/free-agency-audit" ||
    value === "/free-agency-audit/"
  ) {
    return { value: AUDIT, changed: true };
  }
  if (value === "/property-report" || value === "/property-report/") {
    return { value: REPORT, changed: true };
  }
  return { value, changed };
}

function rewriteDeep(node) {
  if (node == null) return { value: node, changed: false };
  if (typeof node === "string") return rewriteString(node);
  if (Array.isArray(node)) {
    let changed = false;
    const value = node.map((item) => {
      const r = rewriteDeep(item);
      if (r.changed) changed = true;
      return r.value;
    });
    return { value, changed };
  }
  if (typeof node === "object") {
    let changed = false;
    const value = {};
    for (const [k, v] of Object.entries(node)) {
      const r = rewriteDeep(v);
      value[k] = r.value;
      if (r.changed) changed = true;
    }
    // Explicit chrome CTA fix
    if (
      value.headerCta &&
      typeof value.headerCta === "object" &&
      typeof value.headerCta.href === "string"
    ) {
      const href = value.headerCta.href;
      if (
          /business-audit|free-agency-audit/i.test(href) &&
          !href.includes("audit.digitalgate")
        ) {
        value.headerCta = { ...value.headerCta, href: AUDIT };
        changed = true;
      }
      if (/property-report/i.test(href) && !href.includes("report.roerealty")) {
        value.headerCta = { ...value.headerCta, href: REPORT };
        changed = true;
      }
    }
    return { value, changed };
  }
  return { value: node, changed: false };
}

async function main() {
  const sites = await prisma.website.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      metadata: true,
      pages: { select: { id: true, slug: true, components: true } },
    },
  });

  let sitesUpdated = 0;
  let pagesUpdated = 0;

  for (const site of sites) {
    const meta = (site.metadata && typeof site.metadata === "object"
      ? site.metadata
      : {}) ;
    const metaResult = rewriteDeep(meta);
    if (metaResult.changed) {
      console.log(
        `${dryRun ? "[dry] " : ""}chrome/meta ${site.slug}: funnel links updated`,
      );
      if (!dryRun) {
        await prisma.website.update({
          where: { id: site.id },
          data: { metadata: metaResult.value },
        });
      }
      sitesUpdated += 1;
    }

    // Force known brand CTAs even if path didn't match rewrite
    const chrome =
      metaResult.value?.chrome && typeof metaResult.value.chrome === "object"
        ? { ...metaResult.value.chrome }
        : meta?.chrome && typeof meta.chrome === "object"
          ? { ...meta.chrome }
          : null;
    if (chrome) {
      let force = false;
      if (site.slug === "digitalgate" || /digitalgate/i.test(site.name || "")) {
        if (
          !chrome.headerCta ||
          chrome.headerCta.href !== AUDIT ||
          !/Business Audit/i.test(chrome.headerCta.label || "")
        ) {
          chrome.headerCta = {
            ...(chrome.headerCta || {}),
            label: "Get My Free Business Audit →",
            href: AUDIT,
            backgroundColor: chrome.headerCta?.backgroundColor || "#3B82F6",
          };
          force = true;
        }
      }
      if (site.slug === "roe-realty" || /roe/i.test(site.name || "")) {
        if (
          !chrome.headerCta ||
          chrome.headerCta.href !== REPORT ||
          !/Property Report/i.test(chrome.headerCta.label || "")
        ) {
          chrome.headerCta = {
            ...(chrome.headerCta || {}),
            label: "Get Property Report",
            href: REPORT,
          };
          force = true;
        }
      }
      if (site.slug === "currumbin-valley-hideaway") {
        if (
          !chrome.headerCta ||
          chrome.headerCta.href !== CIRCLE ||
          !/Join the Circle/i.test(chrome.headerCta.label || "")
        ) {
          chrome.headerCta = {
            ...(chrome.headerCta || {}),
            label: "Join the Circle",
            href: CIRCLE,
            backgroundColor: chrome.headerCta?.backgroundColor || "#B9A48A",
          };
          force = true;
        }
      }
      if (force) {
        console.log(
          `${dryRun ? "[dry] " : ""}force CTA ${site.slug} → ${chrome.headerCta.href}`,
        );
        if (!dryRun) {
          await prisma.website.update({
            where: { id: site.id },
            data: {
              metadata: {
                ...((metaResult.changed ? metaResult.value : meta) || {}),
                chrome,
              },
            },
          });
        }
        if (!metaResult.changed) sitesUpdated += 1;
      }
    }

    for (const page of site.pages) {
      const components = page.components;
      const result = rewriteDeep(components);
      if (!result.changed) continue;
      console.log(
        `${dryRun ? "[dry] " : ""}page ${site.slug}/${page.slug}: rewritten`,
      );
      if (!dryRun) {
        await prisma.websitePage.update({
          where: { id: page.id },
          data: { components: result.value },
        });
      }
      pagesUpdated += 1;
    }
  }

  console.log(
    `\nDone. sites=${sitesUpdated} pages=${pagesUpdated}${dryRun ? " (dry-run)" : ""}`,
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
