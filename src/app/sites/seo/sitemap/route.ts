import { isDgPublicHost } from "@/lib/dg-legacy-urls";
import {
  dgPageShouldIndex,
  dgSitemapChangefreq,
  dgSitemapPriority,
} from "@/lib/digitalgate-seo-catalog";
import { getWebsiteBySlug } from "@dg/platform-core";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isAetherraPublicHost } from "@/lib/aetherra-legacy-urls";
import { resolvePublicHostSlug } from "@/lib/resolve-public-host-slug";
import { isRoePublicHost } from "@/lib/roe-legacy-urls";

async function resolveHostSlug(): Promise<string | null> {
  const hdrs = await headers();
  const host = (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();
  return resolvePublicHostSlug(host);
}

function pagePath(slug: string, intent?: string | null): string {
  if (!slug || slug === "home" || intent === "home") return "/";
  return `/${slug.replace(/^\/+/, "")}`;
}

function parseIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}

/**
 * Host-aware sitemap.xml for custom domains.
 */
export async function GET() {
  const hdrs = await headers();
  const host = (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();

  const slug = await resolveHostSlug();
  const site = slug
    ? (await getWebsiteBySlug(slug, { publishedOnly: true })) ||
      (await getWebsiteBySlug(slug))
    : null;

  if (!host || !site) {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`,
      {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      },
    );
  }

  const originHost =
    isDgPublicHost(host) || isRoePublicHost(host) || isAetherraPublicHost(host)
      ? host.replace(/^www\./, "")
      : host;
  const origin = `https://${originHost}`;
  const isDg = isDgPublicHost(host);
  const isRoe = isRoePublicHost(host);

  const urls = (site.pages ?? [])
    .filter((p) => p.status === "published")
    .filter((p) => (p.intent || "").toLowerCase() !== "redirect")
    .filter((p) => {
      if (isDg && p.slug === "business-audit") return false;
      if (isDg && !dgPageShouldIndex(p.slug)) return false;
      if (isDg && p.seo?.noindex) return false;
      if (isRoe && p.slug === "property-report") return false;
      return true;
    })
    .map((p) => {
      const loc = `${origin}${pagePath(p.slug, p.intent)}`;
      const seo = p.seo ?? {};
      const lastmod =
        parseIsoDate(seo.modifiedAt) ||
        parseIsoDate(seo.publishedAt) ||
        (p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : undefined);
      const priority = isDg
        ? dgSitemapPriority(p.slug, p.intent)
        : pagePath(p.slug, p.intent) === "/"
          ? 1.0
          : 0.7;
      const changefreq = isDg
        ? dgSitemapChangefreq(p.slug, p.intent)
        : pagePath(p.slug, p.intent) === "/"
          ? "weekly"
          : "monthly";
      return { loc, lastmod, priority, changefreq };
    });

  const seen = new Set<string>();
  const unique = urls.filter((u) => {
    if (seen.has(u.loc)) return false;
    seen.add(u.loc);
    return true;
  });

  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...unique.map((u) => {
      const last = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : "";
      const pri = `\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority.toFixed(1)}</priority>`;
      return `  <url>\n    <loc>${u.loc}</loc>${last}${pri}\n  </url>`;
    }),
    `</urlset>`,
    "",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
