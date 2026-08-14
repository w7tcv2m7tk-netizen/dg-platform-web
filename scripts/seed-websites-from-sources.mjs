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
  return `${fontLinks}\n${styleTag}\n<div class="wb-html-island">\n${body}\n</div>`.trim();
}

function htmlComponent(html, note) {
  return {
    id: cuidLike(),
    type: "html",
    props: { html, note },
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

  const metaBase = {
    generatorSource: "seed-websites-from-sources",
    brandKey: brand.key,
    lastSeedAt: new Date().toISOString(),
  };
  if (chrome) metaBase.chrome = chrome;

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
        theme: brand.theme,
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
    site = await prisma.website.update({
      where: { id: site.id },
      data: {
        theme: brand.theme,
        name: site.name || brand.siteName,
        metadata: {
          ...prev,
          ...metaBase,
          chrome: chrome || prev.chrome || undefined,
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
      ? prepareMarketingHtml(readFileSync(headerPath, "utf8"))
      : null,
    footerHtml: existsSync(footerPath)
      ? prepareMarketingHtml(readFileSync(footerPath, "utf8"))
      : null,
  };
  console.log(
    `  chrome header=${chrome.headerHtml ? `${chrome.headerHtml.length}c` : "no"} footer=${chrome.footerHtml ? `${chrome.footerHtml.length}c` : "no"}`,
  );

  const site = await ensureWebsite(org, brand, chrome);

  let n = 0;
  for (const def of DG_PAGES) {
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
    console.log(`  ${action.padEnd(7)} /${def.slug}`);
    n += 1;
  }

  // Blog posts from live WP
  const posts = await fetchWpPosts("https://digitalgate.com.au");
  console.log(`  fetched ${posts.length} posts`);
  const usedSlugs = new Set(DG_PAGES.map((p) => p.slug));
  let sortBase = 100;
  for (const post of posts) {
    const title = stripTags(post.title?.rendered || post.slug || "Post");
    let slug = uniqueSlug(post.slug || title, usedSlugs);
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
        description: stripTags(post.excerpt?.rendered || "").slice(0, 160),
      },
    );
    console.log(`  ${action.padEnd(7)} /${slug} (post)`);
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
.wb-html-island{min-height:60vh;background:${bg};color:#f8fafc;padding:2.5rem clamp(1.25rem,4vw,3rem);font-family:system-ui,sans-serif;line-height:1.6}
.wb-html-island a{color:#93c5fd}
.wb-html-island img{max-width:100%;height:auto;border-radius:0.35rem}
.wb-html-island h1,.wb-html-island h2,.wb-html-island h3{color:#f8fafc;line-height:1.2}
.wb-html-island p,.wb-html-island li{color:#e2e8f0}
</style>`;
  return `${style}\n<div class="wb-html-island">${cleaned || "<p>No content imported.</p>"}</div>`;
}

async function fetchWpPosts(wpRoot) {
  const indexUrl = `${wpRoot}/wp-json/wp/v2/posts?per_page=100&page=1&status=publish&_fields=id,slug,title&orderby=date&order=desc`;
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
 * Best-effort extract of live site header/footer markup (Oxygen/theme).
 * Not perfect — theme CSS rarely travels intact — but better than bare pages.
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

    const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
      .map((m) => m[0])
      .slice(0, 8)
      .join("\n");
    const links = [
      ...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi),
    ]
      .map((m) => m[0])
      .slice(0, 12)
      .join("\n");

    const header =
      html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i)?.[0] ||
      html.match(
        /<div\b[^>]*(?:id|class)=["'][^"']*(?:header|masthead|site-header|dg-header)[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
      )?.[0] ||
      null;
    const footer =
      html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i)?.[0] ||
      html.match(
        /<div\b[^>]*(?:id|class)=["'][^"']*(?:footer|site-footer|dg-footer)[^"']*["'][^>]*>[\s\S]*?<\/div>/i,
      )?.[0] ||
      null;

    if (!header && !footer) return null;

    const wrap = (chunk) => {
      if (!chunk) return null;
      const cleaned = chunk
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
      return `${links}\n${styles}\n<div class="wb-html-island wb-chrome-fragment">${cleaned}</div>`;
    };

    return {
      headerHtml: wrap(header),
      footerHtml: wrap(footer),
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
  for (const post of posts) {
    const title = stripTags(post.title?.rendered || post.slug || "Post");
    const slug = uniqueSlug(post.slug || title, used);
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
          description: stripTags(post.excerpt?.rendered || "").slice(0, 160),
        },
        components: parts,
      },
    });
    console.log(`  created /${slug} (post)`);
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
