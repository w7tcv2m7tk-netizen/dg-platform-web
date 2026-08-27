import { DIGITALGATE_ORIGIN } from "@/lib/digitalgate-seo-catalog";
import { isDgPublicHost } from "@/lib/dg-legacy-urls";
import { getWebsiteBySlug } from "@dg/platform-core";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isAetherraPublicHost } from "@/lib/aetherra-legacy-urls";
import { isCvhPublicHost } from "@/lib/cvh-legacy-urls";
import { resolvePublicHostSlug } from "@/lib/resolve-public-host-slug";
import { isRoePublicHost } from "@/lib/roe-legacy-urls";

/** AI crawlers allowed to read public marketing content (policy: docs/SEARCH-INDEXING.md). */
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "cohere-ai",
];

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

  const lines: string[] = [];

  if (site) {
    lines.push("User-agent: *", "Allow: /");
    for (const bot of AI_CRAWLERS) {
      lines.push(`User-agent: ${bot}`, "Allow: /");
    }
  } else {
    lines.push("User-agent: *", "Disallow: /");
  }

  lines.push(
    "",
    "# Platform / application routes (never on marketing apex — belt-and-braces)",
    "User-agent: *",
    "Disallow: /dashboard",
    "Disallow: /login",
    "Disallow: /signup",
    "Disallow: /command",
    "Disallow: /api/",
    "Disallow: /apps/",
    "Disallow: /sites/",
    "",
  );

  if (site && isCvh) {
    lines.push(
      "User-agent: *",
      "Disallow: /wc-api/",
      "Disallow: /category/",
      "Disallow: /*kinsta-monitor*",
      "Disallow: /*ao_speedup_cachebuster*",
      "",
    );
  }

  if (site && isDg) {
    lines.push(
      "User-agent: *",
      "Disallow: /wp-admin/",
      "Disallow: /wp-content/",
      "Disallow: /wp-includes/",
      "Disallow: /edd-api/",
      "Disallow: /website/",
      "Disallow: /collection/",
      "Disallow: /__static",
      "Disallow: /card",
      "Disallow: /onboarding",
      "Disallow: /*.php$",
      "",
    );
  }

  if (site && isRoe) {
    lines.push(
      "User-agent: *",
      "Disallow: /cgi-bin",
      "Disallow: /wp-content/themes/",
      "Disallow: /wp-content/plugins/",
      "Disallow: /real-estate-single-page-layout/",
      "Disallow: /property-report",
      "",
    );
  }

  if (site && isAetherra) {
    lines.push(
      "User-agent: *",
      "Disallow: /wp-json",
      "Disallow: /wp-admin/",
      "Disallow: /wp-content/",
      "Disallow: /wp-includes/",
      "Disallow: /*.php$",
      "",
    );
  }

  if (origin) {
    lines.push(`Sitemap: ${origin}/sitemap.xml`);
    if (isDg) {
      lines.push(`# IndexNow key: ${DIGITALGATE_ORIGIN}/indexnow-key.txt`);
    }
  }

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
