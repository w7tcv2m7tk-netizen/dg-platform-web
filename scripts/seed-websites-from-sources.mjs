#!/usr/bin/env node
/**
 * Seed / import websites into Gen 2 Studio for DigitalGate brands.
 *
 * Usage:
 *   node scripts/seed-websites-from-sources.mjs
 *   node scripts/seed-websites-from-sources.mjs --only=digitalgate
 *   node scripts/seed-websites-from-sources.mjs --only=roe,cvh,aetherra
 *
 * DigitalGate → local Oxygen HTML in ../dg-platform/marketing/pages/
 * Roe / CVH / Aëtherra → public WP REST pages (content → html blocks)
 */
import { config } from "dotenv";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = join(__dirname, "../../dg-platform/marketing/pages");
const prisma = new PrismaClient();

const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(
      onlyArg
        .slice("--only=".length)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;

function want(key) {
  return !only || only.has(key);
}

function cuidLike() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(input) {
  return String(input || "page")
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "page";
}

function stripTags(html) {
  return String(html || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || null;
}

function prepareMarketingHtml(raw) {
  let styles = [...raw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");

  styles = styles
    .replace(/(^|[,}])\s*body\s*(?=[\s,{])/gi, "$1 .wb-html-island ")
    .replace(/(^|[,}])\s*html\s*(?=[\s,{])/gi, "$1 .wb-html-island ");

  const fontLinks = [
    ...raw.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi),
    ...raw.matchAll(/<link\b[^>]*href=["'][^"']*fonts\.googleapis[^"']*["'][^>]*>/gi),
    ...raw.matchAll(/<link\b[^>]*href=["'][^"']*fonts\.gstatic[^"']*["'][^>]*>/gi),
    ...raw.matchAll(/<link\b[^>]*href=["'][^"']*cdnjs\.cloudflare[^"']*["'][^>]*>/gi),
  ]
    .map((m) => m[0])
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    .join("\n");

  let body = raw;
  const bodyMatch = raw.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    body = bodyMatch[1];
  } else {
    body = raw
      .replace(/<meta\b[^>]*>/gi, "")
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<link\b[^>]*>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  }

  body = body
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .trim();

  const styleTag = styles.trim() ? `<style>\n${styles}\n</style>` : "";
  return `${fontLinks}\n${styleTag}\n<div class="wb-html-island wb-html-island--page">\n${body}\n</div>`.trim();
}

/** Header/footer chrome — keep local CSS, demote fixed → sticky, no giant-logo traps. */
function prepareChromeHtml(raw) {
  let styles = [...raw.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");

  styles = styles
    .replace(/position\s*:\s*fixed/gi, "position:sticky")
    .replace(/(^|[,}])\s*body\s*(?=[\s,{])/gi, "$1 .wb-chrome-root ")
    .replace(/(^|[,}])\s*html\s*(?=[\s,{])/gi, "$1 .wb-chrome-root ");

  let body = raw
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .trim();

  // Prefer the actual chrome node when present
  const preferred =
    body.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] ||
    extractElementByClass(body, "dg-header") ||
    extractElementByClass(body, "dg-footer") ||
    body;

  const styleTag = styles.trim()
    ? `<style>\n${styles}\n.wb-chrome-root img{max-width:none;height:auto}\n.wb-chrome-root .dg-full-logo{height:28px!important;width:auto!important;max-width:11rem!important}\n.wb-chrome-root .dg-gate-icon{width:32px!important;height:32px!important}\n</style>`
    : `<style>.wb-chrome-root img{max-width:none;height:auto}.wb-chrome-root .dg-full-logo{height:28px!important;width:auto!important;max-width:11rem!important}.wb-chrome-root .dg-gate-icon{width:32px!important;height:32px!important}</style>`;

  return `${styleTag}\n<div class="wb-chrome-root">\n${preferred}\n</div>`.trim();
}

function extractElementByClass(html, className) {
  const re = new RegExp(
    `<([a-zA-Z0-9]+)([^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*)>`,
    "i",
  );
  const m = re.exec(html);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const start = m.index;
  let i = start + m[0].length;
  let depth = 1;
  const open = new RegExp(`<${tag}\\b`, "gi");
  const close = new RegExp(`</${tag}\\s*>`, "gi");
  while (i < html.length && depth > 0) {
    open.lastIndex = i;
    close.lastIndex = i;
    const nextOpen = open.exec(html);
    const nextClose = close.exec(html);
    if (!nextClose) break;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      i = nextOpen.index + nextOpen[0].length;
    } else {
      depth -= 1;
      i = nextClose.index + nextClose[0].length;
      if (depth === 0) {
        const chunk = html.slice(start, i);
        if (chunk.length > 120000) return null;
        return chunk;
      }
    }
  }
  return null;
}

function collectStylesheetHrefs(html, baseUrl) {
  const hrefs = [];
  for (const m of html.matchAll(
    /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi,
  )) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      hrefs.push(new URL(href, baseUrl).toString());
    } catch {
      /* skip */
    }
  }
  // Oxygen generated CSS
  for (const m of html.matchAll(
    /href=["']([^"']*\/oxygen\/css\/[^"']+)["']/gi,
  )) {
    try {
      hrefs.push(new URL(m[1], baseUrl).toString());
    } catch {
      /* skip */
    }
  }
  return [...new Set(hrefs)].slice(0, 24);
}

function htmlComponent(html, note) {
  return {
    id: cuidLike(),
    type: "html",
    props: { html, note },
  };
}

function postGridComponent(posts, headline = "Latest insights") {
  return {
    id: cuidLike(),
    type: "post_grid",
    props: {
      headline,
      columns: 2,
      posts,
    },
  };
}

function navComponent(links) {
  return {
    id: cuidLike(),
    type: "nav",
    props: { links },
  };
}

function footerComponent(businessName) {
  return {
    id: cuidLike(),
    type: "footer",
    props: { businessName, phone: null, email: null },
  };
}

/** Canonical DigitalGate marketing pages (Oxygen paste sources). */
const DG_PAGES = [
  { file: "homepage.html", title: "Home", slug: "home", intent: "home", sortOrder: 0 },
  { file: "pricing-page.html", title: "Pricing", slug: "pricing", intent: "custom", sortOrder: 1 },
  { file: "about-page.html", title: "About", slug: "about", intent: "about", sortOrder: 2 },
  { file: "contact-page.html", title: "Contact", slug: "contact", intent: "contact", sortOrder: 3 },
  { file: "founding-customers-page.html", title: "Founding Customer Programme", slug: "founding-customers", intent: "custom", sortOrder: 4 },
  { file: "founding-customer-terms.html", title: "Founding Customer Terms & Conditions", slug: "founding-customer-terms", intent: "custom", sortOrder: 5 },
  { file: "discovery-form.html", title: "AI Platform Discovery", slug: "discover", intent: "custom", sortOrder: 6 },
  { file: "strategy-session-page.html", title: "Platform Consultation", slug: "strategy-session", intent: "custom", sortOrder: 7 },
  { file: "onboarding-form.html", title: "Client Onboarding", slug: "onboarding", intent: "custom", sortOrder: 8 },
  { file: "insights-page.html", title: "Insights", slug: "insights", intent: "custom", sortOrder: 9 },
  { file: "digital-business-card.html", title: "Digital Business Card", slug: "card", intent: "custom", sortOrder: 10 },
  { file: "privacy-policy.html", title: "Privacy Policy", slug: "privacy-policy", intent: "custom", sortOrder: 11 },
  { file: "terms-page.html", title: "Terms & Conditions", slug: "terms-conditions", intent: "custom", sortOrder: 12 },
  { file: "legal-notice.html", title: "Legal Notice", slug: "legal-notice", intent: "custom", sortOrder: 13 },
  { file: "ai-visibility-framework.html", title: "AI Visibility Framework", slug: "ai-visibility-framework", intent: "custom", sortOrder: 14 },
  { file: "appraisal-magnet-system.html", title: "Appraisal Magnet System", slug: "appraisal-magnet-system", intent: "custom", sortOrder: 15 },
  { file: "listing-pipeline-framework-page.html", title: "Listing Pipeline Framework", slug: "listing-pipeline-framework", intent: "custom", sortOrder: 16 },
  { file: "vendor-velocity-system.html", title: "Vendor Velocity System", slug: "vendor-velocity-system", intent: "custom", sortOrder: 17 },
  { file: "beta-program-page.html", title: "Beta Programme", slug: "beta", intent: "custom", sortOrder: 18 },
];

const BRANDS = {
  digitalgate: {
    key: "digitalgate",
    orgMatch: (o) => o.slug === "digitalgate" || /^digitalgate$/i.test(o.name),
    siteName: "DigitalGate Website",
    siteSlug: "digitalgate",
    theme: {
      primaryColor: "#3B82F6",
      accentColor: "#10B981",
      backgroundColor: "#0A0E17",
    },
    source: "marketing",
  },
  roe: {
    key: "roe",
    orgMatch: (o) => o.slug === "roe-realty" || /roe realty/i.test(o.name),
    siteName: "Roe Realty Website",
    siteSlug: "roe-realty",
    theme: {
      primaryColor: "#C9A46C",
      accentColor: "#C9A46C",
      backgroundColor: "#1C2B2A",
    },
    wpRoot: "https://roerealty.com.au",
    source: "wordpress",
  },
  cvh: {
    key: "cvh",
    orgMatch: (o) =>
      o.slug.includes("currumbin") || /currumbin|hideaway/i.test(o.name),
    siteName: "Currumbin Valley Hideaway Website",
    siteSlug: "currumbin-valley-hideaway",
    theme: {
      primaryColor: "#B9A48A",
      accentColor: "#B9A48A",
      backgroundColor: "#2C4137",
    },
    wpRoot: "https://currumbinvalleyhideaway.com.au",
    source: "wordpress",
  },
  aetherra: {
    key: "aetherra",
    orgMatch: (o) =>
      o.slug.includes("therra") || /aëtherra|aetherra/i.test(o.name),
    siteName: "Aëtherra Website",
    siteSlug: "aetherra",
    theme: {
      primaryColor: "#B88952",
      accentColor: "#C9B38C",
      backgroundColor: "#171513",
    },
    wpRoot: "https://aetherra.com.au",
    source: "wordpress",
  },
};

async function ensureWebsite(org, brand, chrome = null) {
  let site = await prisma.website.findFirst({
    where: { organisationId: org.id },
    orderBy: { updatedAt: "desc" },
  });

  const fullOrg = await prisma.organisation.findUnique({
    where: { id: org.id },
    select: { settings: true, name: true },
  });
  const profile = fullOrg?.settings?.profile ?? {};
  const logoUrl =
    typeof profile.logoUrl === "string" ? profile.logoUrl : null;
  const iconUrl =
    typeof profile.iconUrl === "string" ? profile.iconUrl : null;

  const theme = {
    ...brand.theme,
    ...(logoUrl || iconUrl
      ? { logoUrl: logoUrl || iconUrl, iconUrl: iconUrl || logoUrl }
      : {}),
  };

  const metaBase = {
    generatorSource: "seed-websites-from-sources",
    brandKey: brand.key,
    lastSeedAt: new Date().toISOString(),
  };
  if (chrome) {
    metaBase.chrome = {
      ...chrome,
      businessName: fullOrg?.name || org.name,
      headerHtml: null,
      footerHtml: null,
    };
  }

  if (!site) {
    let slug = brand.siteSlug;
    const clash = await prisma.website.findUnique({ where: { slug } });
    if (clash && clash.organisationId !== org.id) {
      slug = `${brand.siteSlug}-${Date.now().toString(36)}`;
    }
    site = await prisma.website.create({
      data: {
        organisationId: org.id,
        name: brand.siteName,
        slug,
        status: "draft",
        brief: `Imported ${new Date().toISOString().slice(0, 10)}`,
        theme,
        seo: {
          title: brand.siteName,
          description: `${org.name} — powered by DigitalGate`,
        },
        metadata: metaBase,
      },
    });
    console.log(`  + created site /sites/${site.slug}`);
  } else {
    const prev =
      site.metadata && typeof site.metadata === "object" ? site.metadata : {};
    const prevChrome =
      prev.chrome && typeof prev.chrome === "object" ? prev.chrome : {};
    site = await prisma.website.update({
      where: { id: site.id },
      data: {
        theme,
        name: site.name || brand.siteName,
        metadata: {
          ...prev,
          ...metaBase,
          chrome: {
            ...prevChrome,
            ...(chrome || {}),
            businessName: fullOrg?.name || org.name,
            headerHtml: null,
            footerHtml: null,
          },
        },
      },
    });
    console.log(`  · using site /sites/${site.slug} (${site.id})`);
  }
  return site;
}

async function upsertPage(siteId, def, components, seo) {
  const existing = await prisma.websitePage.findFirst({
    where: { websiteId: siteId, slug: def.slug },
  });
  const data = {
    title: def.title,
    intent: def.intent || "custom",
    status: "draft",
    sortOrder: def.sortOrder ?? 0,
    seo: seo || { title: def.title },
    components,
  };
  if (existing) {
    await prisma.websitePage.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.websitePage.create({
    data: { websiteId: siteId, slug: def.slug, ...data },
  });
  return "created";
}

async function seedDigitalGate(org) {
  const brand = BRANDS.digitalgate;
  if (!existsSync(MARKETING_DIR)) {
    throw new Error(`Marketing dir missing: ${MARKETING_DIR}`);
  }

  const headerPath = join(MARKETING_DIR, "header.html");
  const footerPath = join(MARKETING_DIR, "footer.html");
  const chrome = {
    headerHtml: existsSync(headerPath)
      ? prepareChromeHtml(readFileSync(headerPath, "utf8"))
      : null,
    footerHtml: existsSync(footerPath)
      ? prepareChromeHtml(readFileSync(footerPath, "utf8"))
      : null,
    stylesheets: [
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
    ],
  };
  console.log(
    `  chrome header=${chrome.headerHtml ? `${chrome.headerHtml.length}c` : "no"} footer=${chrome.footerHtml ? `${chrome.footerHtml.length}c` : "no"}`,
  );

  const site = await ensureWebsite(org, brand, chrome);

  let n = 0;
  const postCards = [];
  const usedSlugs = new Set();

  for (const def of DG_PAGES) {
    // Insights built after posts are fetched
    if (def.slug === "insights") continue;
    const path = join(MARKETING_DIR, def.file);
    if (!existsSync(path)) {
      console.log(`  ! missing ${def.file}`);
      continue;
    }
    const raw = readFileSync(path, "utf8");
    const prepared = prepareMarketingHtml(raw);
    const components = [
      htmlComponent(
        prepared,
        "Imported from dg-platform/marketing/pages (Oxygen paste source).",
      ),
    ];
    const seo = {
      title: extractTitle(raw) || def.title,
      description: extractMeta(raw, "description"),
    };
    const action = await upsertPage(site.id, def, components, seo);
    usedSlugs.add(def.slug);
    console.log(`  ${action.padEnd(7)} /${def.slug}`);
    n += 1;
  }

  // Blog posts from live WP
  const posts = await fetchWpPosts("https://digitalgate.com.au");
  console.log(`  fetched ${posts.length} posts`);
  let sortBase = 100;
  for (const post of posts) {
    const title = stripTags(post.title?.rendered || post.slug || "Post");
    const slug = uniqueSlug(post.slug || title, usedSlugs);
    const excerpt = stripTags(post.excerpt?.rendered || "").slice(0, 180);
    const image = await featuredImageForPost(post, "https://digitalgate.com.au");
    const prepared = prepareWpHtml(
      post.content?.rendered || "",
      brand.theme.backgroundColor,
    );
    const action = await upsertPage(
      site.id,
      {
        title,
        slug,
        intent: "custom",
        sortOrder: sortBase++,
      },
      [
        htmlComponent(prepared, "Imported DigitalGate blog post via WP REST"),
      ],
      {
        title,
        description: excerpt,
        ogImage: image || undefined,
      },
    );
    postCards.push({
      title,
      href: `/sites/${site.slug}/${slug}?preview=1`,
      excerpt,
      image: image || "",
      date: (post.date || "").slice(0, 10),
    });
    console.log(`  ${action.padEnd(7)} /${slug} (post)`);
    n += 1;
  }

  // Insights archive: marketing chrome + two-column post cards
  const insightsPath = join(MARKETING_DIR, "insights-page.html");
  if (existsSync(insightsPath)) {
    const insightsChrome = prepareMarketingHtml(
      readFileSync(insightsPath, "utf8"),
    );
    const action = await upsertPage(
      site.id,
      {
        title: "Insights",
        slug: "insights",
        intent: "custom",
        sortOrder: 9,
      },
      [
        htmlComponent(insightsChrome, "Insights archive chrome"),
        postGridComponent(postCards, "Latest articles"),
      ],
      {
        title: "Insights | DigitalGate",
        description:
          "Practical strategies on AI, search, automation and connected business.",
      },
    );
    usedSlugs.add("insights");
    console.log(`  ${action.padEnd(7)} /insights (grid ${postCards.length})`);
    n += 1;
  }

  const keep = new Set([...usedSlugs]);
  const extras = await prisma.websitePage.findMany({
    where: { websiteId: site.id, slug: { notIn: [...keep] } },
    select: { id: true, slug: true, title: true },
  });
  for (const extra of extras) {
    if (
      extra.slug === "services" ||
      extra.slug.endsWith("-copy") ||
      /copy/i.test(extra.title)
    ) {
      await prisma.websitePage.delete({ where: { id: extra.id } });
      console.log(`  deleted /${extra.slug}`);
    }
  }

  console.log(`  → Studio /apps/websites/studio/${site.id}`);
  console.log(`  → Preview /sites/${site.slug}?preview=1`);
  return n;
}

async function fetchWpPages(wpRoot) {
  // Light index first (avoids payload 500s on some WP hosts), then fetch each page.
  const indexUrl = `${wpRoot}/wp-json/wp/v2/pages?per_page=100&page=1&status=publish&_fields=id,slug,title,menu_order,link&orderby=id&order=asc`;
  const indexRes = await fetch(indexUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  if (!indexRes.ok) {
    throw new Error(`WP REST ${indexRes.status} for ${wpRoot}`);
  }
  let index = await indexRes.json();
  if (!Array.isArray(index)) index = [];

  // Paginate index if needed
  let page = 2;
  while (index.length >= 100 && page <= 5) {
    const moreRes = await fetch(
      `${wpRoot}/wp-json/wp/v2/pages?per_page=100&page=${page}&status=publish&_fields=id,slug,title,menu_order,link&orderby=id&order=asc`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(45000),
      },
    );
    if (!moreRes.ok) break;
    const more = await moreRes.json();
    if (!Array.isArray(more) || more.length === 0) break;
    index.push(...more);
    if (more.length < 100) break;
    page += 1;
  }

  const detailed = [];
  for (const item of index) {
    const url = `${wpRoot}/wp-json/wp/v2/pages/${item.id}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.log(`  ! skip ${item.slug || item.id} (${res.status})`);
      continue;
    }
    detailed.push(await res.json());
  }

  detailed.sort(
    (a, b) => (a.menu_order ?? 0) - (b.menu_order ?? 0) || a.id - b.id,
  );
  return detailed;
}

function featuredFromWp(item) {
  const media = item?._embedded?.["wp:featuredmedia"]?.[0];
  if (media?.source_url) return media.source_url;
  // Yoast / other plugins sometimes expose og image in meta — skip if absent
  return null;
}

function intentForSlug(slug, isFront) {
  if (isFront || slug === "home") return "home";
  if (slug.includes("about")) return "about";
  if (slug.includes("contact")) return "contact";
  if (slug.includes("service")) return "services";
  if (slug.includes("stay") || slug.includes("book") || slug.includes("accommod"))
    return "stay";
  if (slug.includes("listing") || slug.includes("property")) return "listings";
  return "custom";
}

function uniqueSlug(base, used) {
  let slug = slugify(base);
  if (slug === "home" && used.has("home")) slug = "home-page";
  let candidate = slug;
  let i = 2;
  while (used.has(candidate)) {
    candidate = `${slug}-${i}`;
    i += 1;
  }
  used.add(candidate);
  return candidate;
}

function prepareWpHtml(contentHtml, bg) {
  const cleaned = String(contentHtml || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .trim();
  const style = `<style>
.wb-html-island--page{min-height:60vh;width:100%;max-width:none;background:${bg};color:#f8fafc;padding:0;margin:0;font-family:system-ui,sans-serif;line-height:1.65}
.wb-html-island--page a{color:#93c5fd}
.wb-html-island--page img{max-width:100%;height:auto;border-radius:0.35rem}
.wb-html-island--page h1,.wb-html-island--page h2,.wb-html-island--page h3{color:#f8fafc;line-height:1.25}
.wb-html-island--page p,.wb-html-island--page li{color:#e2e8f0}
.wb-html-island--page .container,.wb-html-island--page .ct-section-inner-wrap{max-width:min(1400px,100%)!important;width:100%;margin-left:auto;margin-right:auto;padding-left:clamp(1rem,3vw,2rem);padding-right:clamp(1rem,3vw,2rem);box-sizing:border-box}
</style>`;
  return `${style}\n<div class="wb-html-island wb-html-island--page">${cleaned || "<p>No content imported.</p>"}</div>`;
}

async function featuredImageForPost(post, wpRoot) {
  const mediaId = post.featured_media;
  if (!mediaId) return null;
  try {
    const res = await fetch(`${wpRoot}/wp-json/wp/v2/media/${mediaId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (
      json?.media_details?.sizes?.large?.source_url ||
      json?.media_details?.sizes?.medium_large?.source_url ||
      json?.source_url ||
      null
    );
  } catch {
    return null;
  }
}

async function fetchWpPosts(wpRoot) {
  const indexUrl = `${wpRoot}/wp-json/wp/v2/posts?per_page=100&page=1&status=publish&_fields=id,slug,title,featured_media&orderby=date&order=desc`;
  const indexRes = await fetch(indexUrl, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  if (!indexRes.ok) {
    console.log(`  ! posts index ${indexRes.status}`);
    return [];
  }
  let index = await indexRes.json();
  if (!Array.isArray(index)) index = [];

  const detailed = [];
  for (const item of index) {
    const res = await fetch(`${wpRoot}/wp-json/wp/v2/posts/${item.id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      console.log(`  ! skip post ${item.slug || item.id} (${res.status})`);
      continue;
    }
    detailed.push(await res.json());
  }
  return detailed;
}

/**
 * Best-effort extract of live site header/footer markup + stylesheets.
 */
async function extractLiveChrome(wpRoot) {
  try {
    const res = await fetch(wpRoot, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(30000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const stylesheets = collectStylesheetHrefs(html, wpRoot);

    const inlineStyles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
      .map((m) => m[1])
      .filter((css) => /dg-header|dg-footer|oxy-header|site-header|header/i.test(css))
      .slice(0, 6)
      .join("\n");

    let header =
      extractElementByClass(html, "dg-header") ||
      html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] ||
      extractElementByClass(html, "oxy-header-wrapper") ||
      extractElementByClass(html, "site-header") ||
      null;

    let footer =
      extractElementByClass(html, "dg-footer") ||
      html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i)?.[0] ||
      extractElementByClass(html, "site-footer") ||
      null;

    // Guard against accidentally capturing huge page chunks
    if (header && header.length > 60000) header = header.slice(0, 60000);
    if (footer && footer.length > 80000) footer = footer.slice(0, 80000);

    if (!header && !footer) {
      return { headerHtml: null, footerHtml: null, stylesheets };
    }

    const wrap = (chunk) => {
      if (!chunk) return null;
      const cleaned = chunk
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
        .replace(/position\s*:\s*fixed/gi, "position:sticky");
      const style = inlineStyles
        ? `<style>${inlineStyles.replace(/position\s*:\s*fixed/gi, "position:sticky")}</style>`
        : "";
      return `${style}\n<div class="wb-chrome-root">${cleaned}</div>`;
    };

    return {
      headerHtml: wrap(header),
      footerHtml: wrap(footer),
      stylesheets,
    };
  } catch (err) {
    console.log(`  ! chrome extract failed: ${err.message}`);
    return null;
  }
}

async function seedFromWordPress(org, brand) {
  const liveChrome = await extractLiveChrome(brand.wpRoot);
  if (liveChrome?.headerHtml || liveChrome?.footerHtml) {
    console.log(
      `  chrome header=${liveChrome.headerHtml ? `${liveChrome.headerHtml.length}c` : "no"} footer=${liveChrome.footerHtml ? `${liveChrome.footerHtml.length}c` : "no"}`,
    );
  } else {
    console.log("  chrome not extracted — using Studio nav/footer components");
  }

  const site = await ensureWebsite(org, brand, liveChrome);
  const items = await fetchWpPages(brand.wpRoot);
  console.log(`  fetched ${items.length} WP pages`);

  if (items.length === 0) {
    console.log("  ! no pages");
    return 0;
  }

  const front =
    items.find((p) => p.slug === "home" || p.slug === "front-page") || items[0];

  const used = new Set();
  const plans = items.map((item, index) => {
    const isFront = item.id === front.id;
    const slug = isFront
      ? uniqueSlug("home", used)
      : uniqueSlug(item.slug || item.title?.rendered || `page-${item.id}`, used);
    const title = stripTags(item.title?.rendered || item.slug || "Page");
    const content = item.content?.rendered || "";
    const excerpt = stripTags(item.excerpt?.rendered || "").slice(0, 160);
    const featured = featuredFromWp(item);
    return {
      slug,
      title,
      intent: intentForSlug(slug, isFront),
      sortOrder: index,
      content,
      excerpt,
      featured,
      isFront,
    };
  });

  const navLinks = plans.slice(0, 8).map((p) => ({
    label: p.title,
    href: p.slug === "home" ? "/" : `/${p.slug}`,
  }));

  await prisma.websitePage.deleteMany({ where: { websiteId: site.id } });

  plans.sort((a, b) => {
    if (a.slug === "home") return -1;
    if (b.slug === "home") return 1;
    return a.sortOrder - b.sortOrder;
  });
  plans.forEach((p, i) => {
    p.sortOrder = i;
  });

  const hasHeaderChrome = Boolean(liveChrome?.headerHtml);
  const hasFooterChrome = Boolean(liveChrome?.footerHtml);

  for (const p of plans) {
    const parts = [];
    if (!hasHeaderChrome) parts.push(navComponent(navLinks));
    if (p.featured) {
      parts.push({
        id: cuidLike(),
        type: "image",
        props: { src: p.featured, alt: p.title },
      });
    }
    if (p.isFront && !hasHeaderChrome) {
      parts.push({
        id: cuidLike(),
        type: "hero",
        props: {
          headline: p.title,
          subheadline: p.excerpt || `${org.name}`,
          ctaLabel: "Get in touch",
          ctaHref: "/contact",
        },
      });
    }
    parts.push(
      htmlComponent(
        prepareWpHtml(p.content, brand.theme.backgroundColor),
        `Imported from ${brand.wpRoot} via WP REST`,
      ),
    );
    if (!hasFooterChrome) parts.push(footerComponent(org.name));

    await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        title: p.title,
        slug: p.slug,
        intent: p.intent,
        status: "draft",
        sortOrder: p.sortOrder,
        seo: {
          title: p.title,
          description: p.excerpt || undefined,
          ogImage: p.featured || undefined,
        },
        components: parts,
      },
    });
    console.log(`  created /${p.slug}`);
  }

  const posts = await fetchWpPosts(brand.wpRoot);
  console.log(`  fetched ${posts.length} posts`);
  let sortBase = plans.length + 10;
  const postCards = [];
  for (const post of posts) {
    const title = stripTags(post.title?.rendered || post.slug || "Post");
    const slug = uniqueSlug(post.slug || title, used);
    const excerpt = stripTags(post.excerpt?.rendered || "").slice(0, 180);
    const image = await featuredImageForPost(post, brand.wpRoot);
    const parts = [];
    if (!hasHeaderChrome) parts.push(navComponent(navLinks));
    parts.push(
      htmlComponent(
        prepareWpHtml(post.content?.rendered || "", brand.theme.backgroundColor),
        `Imported post from ${brand.wpRoot}`,
      ),
    );
    if (!hasFooterChrome) parts.push(footerComponent(org.name));

    await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        title,
        slug,
        intent: "custom",
        status: "draft",
        sortOrder: sortBase++,
        seo: {
          title,
          description: excerpt,
          ogImage: image || undefined,
        },
        components: parts,
      },
    });
    postCards.push({
      title,
      href: `/sites/${site.slug}/${slug}?preview=1`,
      excerpt,
      image: image || "",
      date: (post.date || "").slice(0, 10),
    });
    console.log(`  created /${slug} (post)`);
  }

  if (postCards.length) {
    const existingInsights = await prisma.websitePage.findFirst({
      where: { websiteId: site.id, slug: "insights" },
    });
    if (existingInsights) {
      const prior = Array.isArray(existingInsights.components)
        ? existingInsights.components.filter((c) => c?.type !== "post_grid")
        : [];
      await prisma.websitePage.update({
        where: { id: existingInsights.id },
        data: {
          components: [...prior, postGridComponent(postCards, "Latest articles")],
        },
      });
      console.log(`  updated /insights (grid ${postCards.length})`);
    } else {
      await prisma.websitePage.create({
        data: {
          websiteId: site.id,
          title: "Insights",
          slug: "insights",
          intent: "custom",
          status: "draft",
          sortOrder: 20,
          seo: {
            title: `Insights | ${org.name}`,
            description: `Articles and updates from ${org.name}.`,
          },
          components: [
            htmlComponent(
              prepareWpHtml(
                `<h1>Insights</h1><p>Articles and updates from ${org.name}.</p>`,
                brand.theme.backgroundColor,
              ),
              "Insights intro",
            ),
            postGridComponent(postCards, "Latest articles"),
          ],
        },
      });
      console.log(`  created /insights (grid ${postCards.length})`);
    }
  }

  console.log(`  → Studio /apps/websites/studio/${site.id}`);
  console.log(`  → Preview /sites/${site.slug}?preview=1`);
  return plans.length + posts.length;
}

async function resolveOrg(brand) {
  const orgs = await prisma.organisation.findMany({
    select: { id: true, name: true, slug: true },
  });
  return orgs.find((o) => brand.orgMatch(o)) || null;
}

async function main() {
  const summary = [];

  for (const brand of Object.values(BRANDS)) {
    if (!want(brand.key)) continue;
    console.log(`\n=== ${brand.key.toUpperCase()} ===`);
    const org = await resolveOrg(brand);
    if (!org) {
      console.log("  ! organisation not found");
      summary.push({ brand: brand.key, ok: false, reason: "org missing" });
      continue;
    }
    console.log(`  org ${org.name} (${org.slug})`);
    try {
      const count =
        brand.source === "marketing"
          ? await seedDigitalGate(org)
          : await seedFromWordPress(org, brand);
      summary.push({ brand: brand.key, ok: true, pages: count });
    } catch (err) {
      console.error(`  ERROR`, err.message || err);
      summary.push({ brand: brand.key, ok: false, reason: String(err.message || err) });
    }
  }

  console.log("\n=== SUMMARY ===");
  for (const row of summary) {
    console.log(
      row.ok
        ? `✓ ${row.brand}: ${row.pages} pages`
        : `✗ ${row.brand}: ${row.reason}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
