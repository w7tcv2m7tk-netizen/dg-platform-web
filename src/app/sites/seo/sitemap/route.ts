import { findDomainByHostname, getWebsiteBySlug } from "@dg/platform-core";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isAetherraPublicHost } from "@/lib/aetherra-legacy-urls";
import { isDgPublicHost } from "@/lib/dg-legacy-urls";
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
  if (!host) return null;

  try {
    const match = await findDomainByHostname(host);
    if (match?.website?.slug) return match.website.slug;
    const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const match2 = await findDomainByHostname(alt);
    return match2?.website?.slug ?? null;
  } catch {
    return null;
  }
}

function pagePath(slug: string, intent?: string | null): string {
  if (!slug || slug === "home" || intent === "home") return "/";
  return `/${slug.replace(/^\/+/, "")}`;
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
        status: 404,
        headers: { "Content-Type": "application/xml; charset=utf-8" },
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
    .filter((p) => p.status !== "archived")
    .filter((p) => (p.intent || "").toLowerCase() !== "redirect")
    .filter((p) => {
      if (isDg) {
        if (p.status !== "published") return false;
        if (p.slug === "business-audit") return false;
        return true;
      }
      if (isRoe && p.slug === "property-report") return false;
      return true;
    })
    .map((p) => {
      const loc = `${origin}${pagePath(p.slug, p.intent)}`;
      const lastmod = p.updatedAt
        ? new Date(p.updatedAt).toISOString().slice(0, 10)
        : undefined;
      return { loc, lastmod };
    });

  // Dedupe home
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
      return `  <url>\n    <loc>${u.loc}</loc>${last}\n  </url>`;
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
