import { findDomainByHostname, getWebsiteBySlug } from "@dg/platform-core";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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
  const origin = host ? `https://${host}` : "";

  const lines = [
    "User-agent: *",
    site ? "Allow: /" : "Disallow: /",
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
