#!/usr/bin/env node
/**
 * Sync DigitalGate Apps hub + App pages into Gen 2 Website Studio (Neon).
 * Run: npm run sync:dg-apps  (from dg-platform-web)
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPO = join(ROOT, "..");
const MARKETING_APPS_IN_REPO = join(REPO, "marketing", "pages", "apps");
const MARKETING_APPS_SIBLING = join(REPO, "..", "dg-platform", "marketing", "pages", "apps");
const MARKETING_APPS = existsSync(join(MARKETING_APPS_IN_REPO, "catalog.mjs"))
  ? MARKETING_APPS_IN_REPO
  : MARKETING_APPS_SIBLING;
const HTML_ROOT = join(MARKETING_APPS, "html");

const SITE_SLUG = "digitalgate";
const ORG_ID = process.env.DG_APPS_ORG_ID || "cmsfkd6n50000ju046to0po60";
const WEBSITE_ID = process.env.DG_APPS_WEBSITE_ID || "cmskwz6zv0001l404cfi1wal4";

const FOUNDING = "/founding-customers";
const CONTACT = "/contact#platform-consultation";
const PRICING = "/pricing";

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readHtml(relPath) {
  const path = join(HTML_ROOT, relPath);
  if (!existsSync(path)) throw new Error(`Missing HTML: ${relPath}`);
  return readFileSync(path, "utf8");
}

function htmlComponent(html) {
  return [
    {
      id: `apps-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      type: "html",
      props: { html },
    },
  ];
}

function patchHomepageAppsSection(html) {
  let out = html;
  out = out.replace(
    /<p style="text-align:center;margin-top:2rem;"><a href="\/pricing#apps" class="btn-secondary">View Apps &amp; pricing →<\/a><\/p>/,
    `<p style="text-align:center;margin-top:2rem;"><a href="/apps/" class="btn-secondary">Explore the Apps hub →</a></p>`,
  );
  const chipReplacements = [
    [/<span class="app-chip">CRM<\/span>/g, `<a class="app-chip" href="/apps/core/crm/">CRM</a>`],
    [/<span class="app-chip">Contacts<\/span>/g, `<a class="app-chip" href="/apps/core/contacts/">Contacts</a>`],
    [/<span class="app-chip">Opportunities<\/span>/g, `<a class="app-chip" href="/apps/core/opportunities/">Opportunities</a>`],
    [/<span class="app-chip">Tasks<\/span>/g, `<a class="app-chip" href="/apps/core/tasks/">Tasks</a>`],
    [/<span class="app-chip">Calendar<\/span>/g, `<a class="app-chip" href="/apps/core/calendar/">Calendar</a>`],
    [/<span class="app-chip">Documents<\/span>/g, `<a class="app-chip" href="/apps/core/documents/">Documents</a>`],
    [/<span class="app-chip">Communications<\/span>/g, `<a class="app-chip" href="/apps/core/communications/">Communications</a>`],
    [
      /<span class="app-chip soon">Commerce — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/core/commerce/">Commerce — Early Access</a>`,
    ],
    [
      /<span class="app-chip">Website connection &amp; management<\/span>/g,
      `<a class="app-chip" href="/apps/infrastructure/website/">Website connection &amp; management</a>`,
    ],
    [
      /<span class="app-chip">Website Builder — Growth\+<\/span>/g,
      `<a class="app-chip" href="/apps/infrastructure/website-builder/">Website Builder — Growth+</a>`,
    ],
    [
      /<span class="app-chip soon">Domains — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/domains/">Domains — Early Access</a>`,
    ],
    [
      /<span class="app-chip soon">DNS — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/dns/">DNS — Early Access</a>`,
    ],
    [
      /<span class="app-chip soon">Hosting — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/hosting/">Hosting — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Email — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/email/">Email — Early Access</a>`,
    ],
    [
      /<span class="app-chip soon">SSL — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/ssl/">SSL — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Backups — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/backups/">Backups — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Cloudflare — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/infrastructure/cloudflare/">Cloudflare — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip">Real Estate — Founding Customers<\/span>/g,
      `<a class="app-chip" href="/apps/industry/real-estate/">Real Estate — Founding Customers</a>`,
    ],
    [
      /<span class="app-chip">Accommodation — Early Access<\/span>/g,
      `<a class="app-chip" href="/apps/industry/accommodation/">Accommodation — Early Access</a>`,
    ],
    [
      /<span class="app-chip soon">Property Management — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/property-management/">Property Management — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Commercial Property — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/commercial-property/">Commercial Property — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Property Development — Later<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/property-development/">Property Development — Later</a>`,
    ],
    [
      /<span class="app-chip soon">Services — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/services/">Services — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Finance — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/finance/">Finance — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Automotive — Coming Soon<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/automotive/">Automotive — Coming Soon</a>`,
    ],
    [
      /<span class="app-chip soon">Creator — Coming \/ Founding<\/span>/g,
      `<a class="app-chip soon" href="/apps/industry/creator/">Creator — Coming / Founding</a>`,
    ],
    [
      /<span class="app-chip">AI Visibility<\/span>/g,
      `<a class="app-chip" href="/apps/growth/ai-visibility/">AI Visibility</a>`,
    ],
    [/<span class="app-chip">SEO<\/span>/g, `<a class="app-chip" href="/apps/growth/seo/">SEO</a>`],
    [
      /<span class="app-chip">Automation<\/span>/g,
      `<a class="app-chip" href="/apps/growth/automation/">Automation</a>`,
    ],
    [
      /<span class="app-chip">Analytics<\/span>/g,
      `<a class="app-chip" href="/apps/growth/analytics/">Analytics</a>`,
    ],
    [/<span class="app-chip">Social<\/span>/g, `<a class="app-chip" href="/apps/growth/social/">Social</a>`],
    [
      /<span class="app-chip soon">Reputation — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/growth/reputation/">Reputation — Early Access</a>`,
    ],
    [
      /<span class="app-chip soon">AI Communications — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/growth/ai-communications/">AI Communications — Early Access</a>`,
    ],
    [
      /<span class="app-chip soon">Prospecting \/ Opportunity Engine — Early Access<\/span>/g,
      `<a class="app-chip soon" href="/apps/growth/prospecting/">Prospecting &amp; Opportunity Engine — Early Access</a>`,
    ],
  ];
  if (!out.includes('href="/apps/core/crm/"')) {
    for (const [re, rep] of chipReplacements) out = out.replace(re, rep);
  }
  if (!out.includes("a.app-chip:hover")) {
    out = out.replace(
      /\.app-chip\.soon \{ opacity: 0\.7;/,
      `a.app-chip:hover { border-color: #3B82F6; color: #BFDBFE; }\n  .app-chip.soon { opacity: 0.7;`,
    );
  }
  return out;
}

function patchPricingAppsSection(html) {
  let out = html;
  if (!out.includes("Explore the Apps hub")) {
    out = out.replace(
      /<p>An operating platform with Apps — not an App marketplace\. Add only what you need\.<\/p>/,
      `<p>An operating platform with Apps — not an App marketplace. Add only what you need. <a href="/apps/" style="color:#93C5FD;font-weight:600;">Explore the Apps hub →</a></p>`,
    );
  }
  const nameLink = (name, href) =>
    out.includes(`href="${href}"`)
      ? out
      : out.replace(
          new RegExp(`<div class="app-name">${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/div>`, "g"),
          `<div class="app-name"><a href="${href}">${name}</a></div>`,
        );
  const links = [
    ["CRM", "/apps/core/crm/"],
    ["Contacts", "/apps/core/contacts/"],
    ["Opportunities", "/apps/core/opportunities/"],
    ["Tasks", "/apps/core/tasks/"],
    ["Calendar", "/apps/core/calendar/"],
    ["Documents", "/apps/core/documents/"],
    ["Communications", "/apps/core/communications/"],
    ["Commerce", "/apps/core/commerce/"],
    ["Website connection &amp; management", "/apps/infrastructure/website/"],
    ["Website Builder", "/apps/infrastructure/website-builder/"],
    ["Domains", "/apps/infrastructure/domains/"],
    ["DNS", "/apps/infrastructure/dns/"],
    ["Hosting", "/apps/infrastructure/hosting/"],
    ["Email", "/apps/infrastructure/email/"],
    ["SSL", "/apps/infrastructure/ssl/"],
    ["Backups", "/apps/infrastructure/backups/"],
    ["Cloudflare", "/apps/infrastructure/cloudflare/"],
    ["Real Estate", "/apps/industry/real-estate/"],
    ["Accommodation", "/apps/industry/accommodation/"],
    ["Property Management", "/apps/industry/property-management/"],
    ["Commercial Property", "/apps/industry/commercial-property/"],
    ["Property Development", "/apps/industry/property-development/"],
    ["Services", "/apps/industry/services/"],
    ["Finance", "/apps/industry/finance/"],
    ["Automotive", "/apps/industry/automotive/"],
    ["Creator", "/apps/industry/creator/"],
    ["Prospecting &amp; Opportunity Engine", "/apps/growth/prospecting/"],
    ["AI Visibility", "/apps/growth/ai-visibility/"],
    ["SEO", "/apps/growth/seo/"],
    ["Automation", "/apps/growth/automation/"],
    ["Analytics", "/apps/growth/analytics/"],
    ["Social", "/apps/growth/social/"],
    ["Reputation", "/apps/growth/reputation/"],
    ["AI Communications", "/apps/growth/ai-communications/"],
  ];
  for (const [name, href] of links) out = nameLink(name, href);
  if (!out.includes(".dg-app-card .app-name a")) {
    out = out.replace(
      /\.dg-app-card \.btn-app:hover \{ border-color: #3B82F6;/,
      `.dg-app-card .app-name a { color: inherit; text-decoration: none; }\n    .dg-app-card .app-name a:hover { color: #93C5FD; }\n    .dg-app-card .btn-app:hover { border-color: #3B82F6;`,
    );
  }
  return out;
}

function patchFooterHtml(html) {
  const appsCol = `      <!-- Apps — Core → Infrastructure → Industry → Growth -->
      <div class="dg-footer-col">
        <h4>Apps</h4>
        <ul class="dg-footer-links">
          <li><a href="/apps/">All Apps</a></li>
          <li><a href="/apps/core/"><strong style="color:#64748B;font-weight:600;">Core</strong></a></li>
          <li><a href="/apps/core/crm/">CRM</a></li>
          <li><a href="/apps/core/opportunities/">Opportunities</a></li>
          <li><a href="/apps/infrastructure/"><strong style="color:#64748B;font-weight:600;">Infrastructure</strong></a></li>
          <li><a href="/apps/infrastructure/website/">Website · Domains · Email</a></li>
          <li><a href="/apps/industry/"><strong style="color:#64748B;font-weight:600;">Industry</strong></a></li>
          <li><a href="/apps/industry/real-estate/">Real Estate</a></li>
          <li><a href="/apps/industry/accommodation/">Accommodation</a></li>
          <li><a href="/apps/growth/"><strong style="color:#64748B;font-weight:600;">Growth</strong></a></li>
          <li><a href="/apps/growth/prospecting/">Prospecting &amp; Opportunity Engine</a></li>
          <li><a href="/apps/growth/ai-visibility/">AI Visibility</a></li>
          <li><a href="/apps/growth/seo/">SEO</a></li>
          <li><a href="/apps/growth/automation/">Automation</a></li>
          <li><a href="https://audit.digitalgate.com.au">Business Audit</a></li>
          <li><a href="/pricing#apps">Apps &amp; pricing</a></li>
        </ul>
      </div>`;

  const industriesCol = `      <!-- Industries — property ecosystem grouped first -->
      <div class="dg-footer-col">
        <h4>Industries</h4>
        <ul class="dg-footer-links">
          <li><a href="/apps/industry/real-estate/">Real Estate</a></li>
          <li><a href="/apps/industry/accommodation/">Accommodation</a></li>
          <li><a href="/apps/industry/property-management/">Property Management</a></li>
          <li><a href="/apps/industry/commercial-property/">Commercial Property</a></li>
          <li><a href="/apps/industry/property-development/">Property Development</a></li>
          <li><a href="/apps/industry/services/">Services &amp; Trades</a></li>
          <li><a href="/apps/industry/finance/">Finance</a></li>
          <li><a href="/apps/industry/automotive/">Automotive</a></li>
          <li><a href="/apps/industry/creator/">Creator</a></li>
        </ul>
      </div>`;

  let out = html.replace(
    /      <!-- Apps — Core → Infrastructure → Industry → Growth -->[\s\S]*?      <!-- Industries — property ecosystem grouped first -->/,
    `${appsCol}\n\n${industriesCol}`,
  );

  if (out === html) {
    out = html.replace(
      /      <!-- Industries — property ecosystem grouped first -->[\s\S]*?      <!-- Company -->/,
      `${industriesCol}\n\n      <!-- Company -->`,
    );
  }

  return out;
}

function patchHeaderNavLinks(navLinks) {
  const apps = { href: "/apps/", label: "Apps" };
  const pricingIdx = navLinks.findIndex((l) => l.label === "Pricing" || l.href === "/pricing");
  const out = navLinks.filter((l) => l.label !== "Apps");
  if (pricingIdx >= 0) out.splice(pricingIdx, 0, apps);
  else out.unshift(apps);
  return out;
}

function seoFromCatalog(app, layerName) {
  const title = `${app.name} | DigitalGate ${layerName} App`;
  const description = (app.subhead || app.headline || app.what || "").slice(0, 160);
  return {
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    keywords: app.keywords || [],
    showHeader: true,
    showFooter: true,
  };
}

async function main() {
  execSync("node build.mjs", { cwd: MARKETING_APPS, stdio: "inherit" });

  const catalogUrl = pathToFileURL(join(MARKETING_APPS, "catalog.mjs")).href;
  const { APPS, LAYERS } = await import(catalogUrl);

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
        data: {
          title,
          status: "published",
          sortOrder,
          seo,
          components,
        },
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

  let sort = 100;
  await upsertPage({
    slug: "apps",
    title: "Apps",
    html: readHtml("apps.html"),
    seo: {
      title: "DigitalGate Apps | Core, Infrastructure, Industry, Growth",
      description:
        "DigitalGate Apps sit on the platform: Core, Infrastructure, Industry and Growth. Not a tool catalogue — an operating system you extend.",
      ogTitle: "DigitalGate Apps",
      ogDescription:
        "Core, Infrastructure, Industry and Growth Apps on one intelligent operating platform.",
      keywords: [
        "DigitalGate Apps",
        "business operating platform",
        "CRM",
        "real estate software",
        "AI visibility",
      ],
      showHeader: true,
      showFooter: true,
    },
    sortOrder: sort++,
  });

  for (const layer of LAYERS) {
    await upsertPage({
      slug: `apps/${layer.id}`,
      title: `${layer.name} Apps`,
      html: readHtml(`${layer.id}/index.html`),
      seo: {
        title: `${layer.name} Apps | DigitalGate`,
        description: layer.intro.slice(0, 160),
        ogTitle: `${layer.name} Apps | DigitalGate`,
        ogDescription: layer.intro.slice(0, 160),
        keywords: ["DigitalGate Apps", layer.name, layer.verb, "Australia"],
        showHeader: true,
        showFooter: true,
      },
      sortOrder: sort++,
    });

    for (const app of APPS.filter((a) => a.layer === layer.id)) {
      const publicSlug = `apps/${layer.id}/${app.slug}`;
      await upsertPage({
        slug: publicSlug,
        title: app.name,
        html: readHtml(`${layer.id}/${app.slug}.html`),
        seo: seoFromCatalog(app, layer.name),
        sortOrder: sort++,
      });
    }
  }

  const home = pageBySlug.get("home");
  if (home) {
    const comps = Array.isArray(home.components) ? [...home.components] : [];
    const htmlIdx = comps.findIndex((c) => c.type === "html");
    if (htmlIdx >= 0 && typeof comps[htmlIdx].props?.html === "string") {
      comps[htmlIdx] = {
        ...comps[htmlIdx],
        props: { html: patchHomepageAppsSection(comps[htmlIdx].props.html) },
      };
      await prisma.websitePage.update({
        where: { id: home.id },
        data: { components: comps },
      });
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
        props: { html: patchPricingAppsSection(comps[htmlIdx].props.html) },
      };
      await prisma.websitePage.update({
        where: { id: pricing.id },
        data: { components: comps },
      });
      updated++;
    }
  }

  const metadata = (site.metadata && typeof site.metadata === "object" ? site.metadata : {}) || {};
  const chrome = (metadata.chrome && typeof metadata.chrome === "object" ? metadata.chrome : {}) || {};
  const navLinks = patchHeaderNavLinks(Array.isArray(chrome.navLinks) ? chrome.navLinks : []);
  let footerHtml = typeof chrome.footerHtml === "string" ? chrome.footerHtml : "";
  if (footerHtml) footerHtml = patchFooterHtml(footerHtml);

  await prisma.website.update({
    where: { id: site.id },
    data: {
      metadata: {
        ...metadata,
        chrome: {
          ...chrome,
          navLinks,
          footerHtml,
        },
      },
    },
  });

  const totalApps = APPS.length + LAYERS.length + 1;
  console.log(
    JSON.stringify(
      {
        ok: true,
        websiteId: site.id,
        appsPages: totalApps,
        created,
        updated,
        navLinks,
        studio: `https://app.digitalgate.com.au/apps/websites/studio/${site.id}`,
        previewHub: "https://digitalgate.com.au/apps/",
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
