/**
 * WordPress → Gen 2 Website importer (v0).
 * Pulls pages via Connector `/site/content` or public WP REST fallback.
 */

import type { Prisma } from "@dg/database";

import { writeAuditLog } from "../audit";
import { resolveOrgWordPressConnector } from "../connectors/wordpress/org-connector";
import { getWebsite } from "./crud";
import { htmlToComponents, stripHtmlJunk, stripTags } from "./html-to-components";
import { component, slugifySiteName } from "./schema";
import type {
  SerializedWebsite,
  WebsiteComponent,
  WebsitePageIntent,
  WebsiteSeo,
} from "./types";

export type WpImportSourceItem = {
  id: number;
  type: string;
  title: string;
  slug: string;
  status?: string;
  link?: string;
  menu_order?: number;
  is_front_page?: boolean;
  is_posts_page?: boolean;
  excerpt?: string;
  content_html?: string;
  featured_image?: string | null;
  seo?: { title?: string; description?: string };
};

export type WpImportFetchResult = {
  ok: true;
  source: "connector_site_content" | "wp_rest_v2";
  siteUrl: string;
  siteName: string;
  pages: WpImportSourceItem[];
  posts: WpImportSourceItem[];
  limitations: string[];
} | {
  ok: false;
  code: string;
  message: string;
};

export type WpImportResult = {
  website: SerializedWebsite;
  imported: {
    pages: number;
    posts: number;
    source: string;
    siteUrl: string;
    limitations: string[];
  };
};

function siteRootFromConnectorBase(baseUrl: string): string {
  try {
    const u = new URL(baseUrl);
    // https://example.com/wp-json/digitalgate/v1 → https://example.com
    const path = u.pathname.replace(/\/wp-json\/.*$/i, "").replace(/\/$/, "");
    return `${u.origin}${path}`;
  } catch {
    return baseUrl.replace(/\/wp-json\/.*$/i, "").replace(/\/$/, "");
  }
}

function intentForSlug(slug: string, isFront: boolean): WebsitePageIntent {
  if (isFront || slug === "home" || slug === "front-page") return "home";
  const s = slug.toLowerCase();
  if (s.includes("about")) return "about";
  if (s.includes("contact")) return "contact";
  if (s.includes("service")) return "services";
  if (s.includes("listing") || s.includes("property")) return "listings";
  if (s.includes("stay") || s.includes("book") || s.includes("accommod")) return "stay";
  return "custom";
}

function uniquePageSlug(base: string, used: Set<string>): string {
  let slug = slugifySiteName(base) || "page";
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

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      json: null,
      text: e instanceof Error ? e.message : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

function mapWpRestItem(raw: Record<string, unknown>, type: string): WpImportSourceItem {
  const titleObj = raw.title as { rendered?: string } | string | undefined;
  const contentObj = raw.content as { rendered?: string } | string | undefined;
  const excerptObj = raw.excerpt as { rendered?: string } | string | undefined;
  const title =
    typeof titleObj === "string"
      ? stripTags(titleObj)
      : stripTags(titleObj?.rendered || "Untitled");
  const content_html =
    typeof contentObj === "string"
      ? contentObj
      : String(contentObj?.rendered || "");
  const excerpt =
    typeof excerptObj === "string"
      ? stripTags(excerptObj)
      : stripTags(excerptObj?.rendered || "");

  let featured: string | null = null;
  const embedded = raw._embedded as
    | { ["wp:featuredmedia"]?: Array<{ source_url?: string }> }
    | undefined;
  const media = embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  if (typeof media === "string") featured = media;

  const yoast = raw.yoast_head_json as
    | { title?: string; description?: string }
    | undefined;

  return {
    id: Number(raw.id) || 0,
    type,
    title,
    slug: String(raw.slug || title || "page"),
    status: String(raw.status || "publish"),
    link: typeof raw.link === "string" ? raw.link : undefined,
    menu_order: typeof raw.menu_order === "number" ? raw.menu_order : 0,
    is_front_page: false,
    excerpt,
    content_html,
    featured_image: featured,
    seo: {
      title: yoast?.title || title,
      description: yoast?.description || excerpt,
    },
  };
}

export async function fetchWordPressContentForOrg(input: {
  organisationId: string;
  includePosts?: boolean;
  perPage?: number;
}): Promise<WpImportFetchResult> {
  const connector = await resolveOrgWordPressConnector(input.organisationId);
  const perPage = Math.min(100, Math.max(1, input.perPage ?? 40));
  const includePosts = Boolean(input.includePosts);
  const limitations = [
    "Content import only — WordPress theme, Elementor/Divi/Oxygen layouts, menus, widgets, and plugins are not converted.",
    "Body HTML is flattened into Gen 2 Studio blocks (heading, paragraph, image, list, CTA, hero, html remnant).",
    "Lazy-load and background images are detected when possible; media stays hotlinked (not re-hosted to DG CDN).",
    "Review and restyle in Studio after import. Keep WordPress live until Gen 2 looks right.",
  ];

  // 1) Prefer authenticated Connector export
  if (connector.apiKey?.trim()) {
    const qs = new URLSearchParams({
      include_posts: includePosts ? "1" : "0",
      per_page: String(perPage),
    });
    const url = `${connector.baseUrl.replace(/\/$/, "")}/site/content?${qs}`;
    const res = await fetchJson(url, {
      headers: { "X-API-Key": connector.apiKey },
    });
    if (res.ok && res.json && typeof res.json === "object") {
      const data = res.json as {
        site?: string;
        name?: string;
        pages?: WpImportSourceItem[];
        posts?: WpImportSourceItem[];
        limitations?: string[];
      };
      const pages = Array.isArray(data.pages) ? data.pages : [];
      if (pages.length > 0 || (Array.isArray(data.posts) && data.posts.length > 0)) {
        return {
          ok: true,
          source: "connector_site_content",
          siteUrl: data.site || siteRootFromConnectorBase(connector.baseUrl),
          siteName: data.name || connector.label,
          pages,
          posts: Array.isArray(data.posts) ? data.posts : [],
          limitations: data.limitations?.length ? data.limitations : limitations,
        };
      }
    }
  }

  // 2) Public WP REST fallback (published content only)
  const root = siteRootFromConnectorBase(connector.baseUrl);
  const pagesUrl = `${root}/wp-json/wp/v2/pages?per_page=${perPage}&_embed=1&orderby=menu_order&order=asc`;
  const pagesRes = await fetchJson(pagesUrl);
  if (!pagesRes.ok || !Array.isArray(pagesRes.json)) {
    const hint = connector.apiKey
      ? "Connector /site/content failed and public WP REST was unavailable. Update DG Platform plugin to 10.70+ for authenticated export, or ensure /wp-json/wp/v2/pages is public."
      : "Add a WordPress Connector API key (DG Platform Dev API) for authenticated /site/content, or ensure public /wp-json/wp/v2/pages is reachable.";
    return {
      ok: false,
      code: "fetch_failed",
      message: `${hint} (${pagesRes.status || "network"}: ${pagesRes.text.slice(0, 180)})`,
    };
  }

  const pages = (pagesRes.json as Array<Record<string, unknown>>).map((p) =>
    mapWpRestItem(p, "page"),
  );

  // Heuristic front page: lowest menu_order or slug home
  if (pages.length) {
    const home = pages.find((p) => p.slug === "home" || p.slug === "front-page");
    if (home) home.is_front_page = true;
    else pages[0].is_front_page = true;
  }

  let posts: WpImportSourceItem[] = [];
  if (includePosts) {
    const postsUrl = `${root}/wp-json/wp/v2/posts?per_page=${Math.min(20, perPage)}&_embed=1`;
    const postsRes = await fetchJson(postsUrl);
    if (postsRes.ok && Array.isArray(postsRes.json)) {
      posts = (postsRes.json as Array<Record<string, unknown>>).map((p) =>
        mapWpRestItem(p, "post"),
      );
    }
  }

  return {
    ok: true,
    source: "wp_rest_v2",
    siteUrl: root,
    siteName: connector.label,
    pages,
    posts,
    limitations: [
      ...limitations,
      "Used public WP REST fallback — drafts/private pages are not included. Install DG Platform 10.70+ for full Connector export.",
    ],
  };
}

function buildPageComponents(item: WpImportSourceItem, nav: WebsiteComponent): WebsiteComponent[] {
  const isFront = Boolean(item.is_front_page);
  const body = htmlToComponents(item.content_html || "", {
    pageTitle: item.title,
    featuredImage: item.featured_image,
    preferHero: isFront,
  });

  // Contact pages get a form if none present
  const intent = intentForSlug(item.slug, isFront);
  const hasForm = body.some((c) => c.type === "contact_form");
  if (intent === "contact" && !hasForm) {
    body.push(
      component("contact_form", {
        headline: "Send a message",
        submitLabel: "Submit",
        successMessage: "Thanks — we’ll be in touch shortly.",
      }),
    );
  }

  return [
    nav,
    ...body,
    component("footer", {
      businessName: null,
      phone: null,
      email: null,
    }),
  ];
}

/**
 * Import WP pages/posts into an existing Gen 2 Website (replaces pages).
 */
export async function importWebsiteFromWordPress(input: {
  organisationId: string;
  websiteId: string;
  actorId?: string;
  includePosts?: boolean;
}): Promise<
  | { ok: true; result: WpImportResult }
  | { ok: false; code: string; message: string }
> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
  });
  if (!existing) {
    return { ok: false, code: "not_found", message: "Website not found" };
  }

  const fetched = await fetchWordPressContentForOrg({
    organisationId: input.organisationId,
    includePosts: input.includePosts,
  });
  if (!fetched.ok) {
    return { ok: false, code: fetched.code, message: fetched.message };
  }

  const items: WpImportSourceItem[] = [
    ...fetched.pages,
    ...(input.includePosts ? fetched.posts : []),
  ];
  if (items.length === 0) {
    return {
      ok: false,
      code: "empty",
      message: "No WordPress pages found to import.",
    };
  }

  // Sort: front page first, then menu order
  items.sort((a, b) => {
    if (a.is_front_page && !b.is_front_page) return -1;
    if (!a.is_front_page && b.is_front_page) return 1;
    return (a.menu_order ?? 0) - (b.menu_order ?? 0);
  });

  const usedSlugs = new Set<string>();
  const pagePlans = items.map((item, index) => {
    const isFront = Boolean(item.is_front_page) || index === 0;
    const slug = isFront
      ? uniquePageSlug("home", usedSlugs)
      : uniquePageSlug(item.slug || item.title || `page-${item.id}`, usedSlugs);
    const intent = intentForSlug(slug, isFront);
    const seo: WebsiteSeo = {
      title: item.seo?.title || item.title,
      description:
        item.seo?.description ||
        item.excerpt ||
        stripTags(stripHtmlJunk(item.content_html || "")).slice(0, 160),
      ogTitle: item.title,
      ogDescription: item.excerpt || undefined,
      ogImage: item.featured_image || undefined,
    };
    return { item, slug, intent, seo, isFront };
  });

  const navLinks = pagePlans.slice(0, 8).map((p) => ({
    label: p.item.title || p.slug,
    href: p.slug === "home" ? "/" : `/${p.slug}`,
  }));
  const nav = component("nav", { links: navLinks });

  const meta = (existing.metadata as Record<string, unknown> | null) ?? {};
  const importedAt = new Date().toISOString();

  await prisma.websitePage.deleteMany({ where: { websiteId: existing.id } });

  await prisma.websitePage.createMany({
    data: pagePlans.map((p, index) => {
      const components = buildPageComponents(
        { ...p.item, is_front_page: p.isFront, slug: p.slug },
        nav,
      );
      // Attach business name on footer from site
      const withFooter = components.map((c) =>
        c.type === "footer"
          ? {
              ...c,
              props: {
                ...c.props,
                businessName: fetched.siteName || existing.name,
              },
            }
          : c,
      );
      return {
        websiteId: existing.id,
        title: p.item.title || p.slug,
        slug: p.slug,
        intent: p.intent,
        status: "draft",
        sortOrder: index,
        seo: p.seo as Prisma.InputJsonValue,
        components: withFooter as unknown as Prisma.InputJsonValue,
      };
    }),
  });

  const pageCount = pagePlans.filter((p) => p.item.type !== "post").length;
  const postCount = pagePlans.filter((p) => p.item.type === "post").length;

  await prisma.website.update({
    where: { id: existing.id },
    data: {
      status: "draft",
      seo: {
        title: fetched.siteName || existing.name,
        description: `Imported from ${fetched.siteUrl}`,
      } as Prisma.InputJsonValue,
      metadata: {
        ...meta,
        wpImport: {
          status: "imported",
          source: fetched.source,
          siteUrl: fetched.siteUrl,
          siteName: fetched.siteName,
          importedAt,
          pageCount,
          postCount,
          limitations: fetched.limitations,
          note: "Content + structure imported. Theme/layout/plugins not converted.",
        },
        generatorSource: "wordpress_import",
      } as Prisma.InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Website",
    entityId: existing.id,
    changes: {
      after: {
        wordpressImport: true,
        source: fetched.source,
        pages: pageCount,
        posts: postCount,
      },
    },
  });

  const website = await getWebsite(input.organisationId, existing.id);
  if (!website) {
    return { ok: false, code: "load_failed", message: "Import saved but reload failed" };
  }

  return {
    ok: true,
    result: {
      website,
      imported: {
        pages: pageCount,
        posts: postCount,
        source: fetched.source,
        siteUrl: fetched.siteUrl,
        limitations: fetched.limitations,
      },
    },
  };
}
