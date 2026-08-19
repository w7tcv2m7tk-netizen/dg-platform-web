import { getWebsiteBySlug } from "@dg/platform-core";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isAetherraPublicHost } from "@/lib/aetherra-legacy-urls";
import { isCvhPublicHost } from "@/lib/cvh-legacy-urls";
import { isDgPublicHost } from "@/lib/dg-legacy-urls";
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

/**
 * Host-aware robots.txt for custom domains (and /sites/seo/robots preview).
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
  const site = slug ? await getWebsiteBySlug(slug, { publishedOnly: true }) : null;
  const originHost =
    isDgPublicHost(host) || isRoePublicHost(host) || isAetherraPublicHost(host)
      ? host.replace(/^www\./, "")
      : host;
  const origin = originHost ? `https://${originHost}` : "";

  const isCvh = isCvhPublicHost(host);
  const isDg = isDgPublicHost(host);
  const isRoe = isRoePublicHost(host);
  const isAetherra = isAetherraPublicHost(host);
  const lines = [
    "User-agent: *",
    site ? "Allow: /" : "Disallow: /",
    "User-agent: Googlebot",
    site ? "Allow: /" : "Disallow: /",
    ...(site && isCvh
      ? [
          "Disallow: /wc-api/",
          "Disallow: /category/",
          "Disallow: /*kinsta-monitor*",
          "Disallow: /*ao_speedup_cachebuster*",
        ]
      : []),
    ...(site && isDg
      ? [
          "Disallow: /wp-admin/",
          "Disallow: /wp-content/",
          "Disallow: /wp-includes/",
          "Disallow: /edd-api/",
          "Disallow: /website/",
          "Disallow: /collection/",
          "Disallow: /__static",
          "Disallow: /*.php$",
        ]
      : []),
    ...(site && isRoe
      ? [
          "Disallow: /cgi-bin",
          "Disallow: /wp-content/themes/",
          "Disallow: /wp-content/plugins/",
          "Disallow: /real-estate-single-page-layout/",
        ]
      : []),
    ...(site && isAetherra
      ? [
          "Disallow: /wp-json",
          "Disallow: /wp-admin/",
          "Disallow: /wp-content/",
          "Disallow: /wp-includes/",
          "Disallow: /*.php$",
        ]
      : []),
    "",
    origin ? `Sitemap: ${origin}/sitemap.xml` : "",
  ].filter((line) => line !== undefined);

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
