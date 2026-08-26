#!/usr/bin/env node
/**
 * Sync DigitalGate Growth SEO landing pages (/growth, /seo, …) into Gen 2 Website Studio.
 * Run: npm run sync:dg-growth  (from dg-platform-web)
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const MARKETING_IN_REPO = join(REPO, "marketing", "pages", "growth-landings");
const MARKETING_SIBLING = join(REPO, "..", "dg-platform", "marketing", "pages", "growth-landings");
const MARKETING = existsSync(join(MARKETING_IN_REPO, "catalog.mjs"))
  ? MARKETING_IN_REPO
  : MARKETING_SIBLING;
const HTML_ROOT = join(MARKETING, "html");

const SITE_SLUG = "digitalgate";

function readHtml(relPath) {
  const path = join(HTML_ROOT, relPath);
  if (!existsSync(path)) throw new Error(`Missing HTML: ${relPath}`);
  return readFileSync(path, "utf8");
}

function htmlComponent(html) {
  return [
    {
      id: `growth-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      type: "html",
      props: { html },
    },
  ];
}

function extractMeta(html, attr) {
  const re = new RegExp(
    `<meta[^>]+name=["']${attr}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${attr}["']`,
    "i",
  );
  return html.match(re2)?.[1] ?? null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() || null;
}

function extractCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  if (m) return m[1];
  const m2 = html.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
  return m2?.[1] ?? null;
}

function extractKeywords(html) {
  const raw = extractMeta(html, "keywords");
  if (!raw) return [];
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

function clipSeo(s, max) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t || t.length <= max) return t || null;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).trim()}…`;
}

function seoFromHtml(html, fallbackTitle) {
  const title = extractTitle(html) || fallbackTitle;
  const description = extractMeta(html, "description");
  const canonical = extractCanonical(html);
  return {
    title: clipSeo(title, 60),
    description: clipSeo(description, 155),
    ogTitle: clipSeo(title, 60),
    ogDescription: clipSeo(description, 155),
    canonical,
    keywords: extractKeywords(html),
    showHeader: true,
    showFooter: true,
  };
}

function patchHeaderNavLinks(navLinks) {
  const growth = { href: "/growth/", label: "Growth" };
  const appsIdx = navLinks.findIndex((l) => l.label === "Apps" || l.href === "/apps/");
  const out = navLinks.filter((l) => l.label !== "Growth");
  if (appsIdx >= 0) out.splice(appsIdx + 1, 0, growth);
  else out.unshift(growth);
  return out;
}

function patchHomepageGrowthChips(html) {
  let out = html;
  const chipReplacements = [
    [/<a class="app-chip" href="\/apps\/growth\/ai-visibility\/">AI Visibility<\/a>/g, `<a class="app-chip" href="/ai-visibility/">AI Visibility</a>`],
    [/<a class="app-chip" href="\/apps\/growth\/seo\/">SEO<\/a>/g, `<a class="app-chip" href="/seo/">SEO</a>`],
    [/<a class="app-chip" href="\/apps\/growth\/automation\/">Automation<\/a>/g, `<a class="app-chip" href="/automation/">Automation</a>`],
    [/<a class="app-chip" href="\/apps\/growth\/analytics\/">Analytics<\/a>/g, `<a class="app-chip" href="/analytics/">Analytics</a>`],
    [/<a class="app-chip" href="\/apps\/growth\/social\/">Social<\/a>/g, `<a class="app-chip" href="/social/">Social</a>`],
    [
      /<a class="app-chip soon" href="\/apps\/growth\/reputation\/">Reputation — Early Access<\/a>/g,
      `<a class="app-chip soon" href="/reputation/">Reputation — Early Access</a>`,
    ],
    [
      /<a class="app-chip soon" href="\/apps\/growth\/ai-communications\/">AI Communications — Early Access<\/a>/g,
      `<a class="app-chip soon" href="/ai-communications/">AI Communications — Early Access</a>`,
    ],
    [
      /<a class="app-chip" href="\/apps\/growth\/prospecting\/">Prospecting &amp; Opportunity Engine<\/a>/g,
      `<a class="app-chip" href="/prospecting/">Prospecting &amp; Opportunity Engine</a>`,
    ],
  ];
  for (const [re, rep] of chipReplacements) out = out.replace(re, rep);
  return out;
}

function patchPricingGrowthLinks(html) {
  let out = html;
  const links = [
    ["Prospecting &amp; Opportunity Engine", "/prospecting/"],
    ["AI Visibility", "/ai-visibility/"],
    ["SEO", "/seo/"],
    ["Automation", "/automation/"],
    ["Analytics", "/analytics/"],
    ["Social", "/social/"],
    ["Reputation", "/reputation/"],
    ["AI Communications", "/ai-communications/"],
  ];
  for (const [name, href] of links) {
    if (out.includes(`href="${href}"`)) continue;
    out = out.replace(
      new RegExp(
        `(<div class="app-name">(?:<a[^>]*>)?)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:<\\/a>)?<\\/div>`,
        "g",
      ),
      `<div class="app-name"><a href="${href}">${name}</a></div>`,
    );
    out = out.replace(
      new RegExp(`href="/apps/growth/[^"]*/"[^>]*>${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"),
      `href="${href}">${name}`,
    );
  }
  return out;
}

async function main() {
  execSync("node build.mjs", { cwd: MARKETING, stdio: "inherit" });

  const catalogUrl = pathToFileURL(join(MARKETING, "catalog.mjs")).href;
  const { GROWTH_HUB, GROWTH_LANDINGS } = await import(catalogUrl);

  const prisma = new PrismaClient();
  const site = await prisma.website.findFirst({
    where: { slug: SITE_SLUG },
    include: { pages: true },
  });
  if (!site) throw new Error(`Website ${SITE_SLUG} not found`);

  const pageBySlug = new Map(site.pages.map((p) => [p.slug, p]));
  let created = 0;
  let updated = 0;

  async function upsertPage({ slug, title, html, seo, sortOrder }) {
    const components = htmlComponent(html);
    const existing = pageBySlug.get(slug);
    if (existing) {
      await prisma.websitePage.update({
        where: { id: existing.id },
        data: { title, status: "published", sortOrder, seo, components },
      });
      updated++;
      return existing.id;
    }
    const page = await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        title,
        slug,
        intent: "custom",
        status: "published",
        sortOrder,
        seo,
        components,
      },
    });
    pageBySlug.set(slug, page);
    created++;
    return page.id;
  }

  let sort = 50;
  await upsertPage({
    slug: "growth",
    title: "Growth",
    html: readHtml("growth.html"),
    seo: seoFromHtml(readHtml("growth.html"), GROWTH_HUB.seoTitle),
    sortOrder: sort++,
  });

  for (const L of GROWTH_LANDINGS) {
    const html = readHtml(`${L.slug}.html`);
    await upsertPage({
      slug: L.slug,
      title: L.appName,
      html,
      seo: seoFromHtml(html, L.seoTitle),
      sortOrder: sort++,
    });
  }

  const home = pageBySlug.get("home");
  if (home) {
    const comps = Array.isArray(home.components) ? [...home.components] : [];
    const htmlIdx = comps.findIndex((c) => c.type === "html");
    if (htmlIdx >= 0 && typeof comps[htmlIdx].props?.html === "string") {
      comps[htmlIdx] = {
        ...comps[htmlIdx],
        props: { html: patchHomepageGrowthChips(comps[htmlIdx].props.html) },
      };
      await prisma.websitePage.update({ where: { id: home.id }, data: { components: comps } });
      updated++;
    }
  }

  const pricing = pageBySlug.get("pricing");
  if (pricing) {
    const comps = Array.isArray(pricing.components) ? [...pricing.components] : [];
    const htmlIdx = comps.findIndex((c) => c.type === "html");
    if (htmlIdx >= 0 && typeof comps[htmlIdx].props?.html === "string") {
      comps[htmlIdx] = {
        ...comps[htmlIdx],
        props: { html: patchPricingGrowthLinks(comps[htmlIdx].props.html) },
      };
      await prisma.websitePage.update({ where: { id: pricing.id }, data: { components: comps } });
      updated++;
    }
  }

  const metadata = (site.metadata && typeof site.metadata === "object" ? site.metadata : {}) || {};
  const chrome = (metadata.chrome && typeof metadata.chrome === "object" ? metadata.chrome : {}) || {};
  const navLinks = patchHeaderNavLinks(Array.isArray(chrome.navLinks) ? chrome.navLinks : []);

  await prisma.website.update({
    where: { id: site.id },
    data: {
      metadata: {
        ...metadata,
        chrome: { ...chrome, navLinks },
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        websiteId: site.id,
        growthPages: 1 + GROWTH_LANDINGS.length,
        created,
        updated,
        navLinks,
        previewHub: "https://digitalgate.com.au/growth/",
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
