import type { Metadata } from "next";

import {
  DG_ORGANIZATION,
  dgBreadcrumbs,
  dgGrowthProductName,
  dgPageShouldIndex,
  DIGITALGATE_ORIGIN,
  classifyDgPageSlug,
  type DgPageKind,
} from "@/lib/digitalgate-seo-catalog";
import { publicOgImageForSlug, publicSiteIcons } from "@/lib/brand";
import { decodeHtmlEntities } from "@/lib/public-chrome";

const CANONICAL_ORIGIN_BY_SLUG: Record<string, string> = {
  digitalgate: DIGITALGATE_ORIGIN,
  wantd: "https://wantd.co.nz",
};

export type PublicPageSeoInput = {
  siteSlug: string;
  siteName: string;
  pageSlug: string;
  pageTitle?: string | null;
  title?: string | null;
  description?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  iconUrl?: string | null;
  keywords?: string[] | null;
  canonicalHost?: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  schemaType?: string | null;
  authorName?: string | null;
  noindex?: boolean;
};

function normalizeOriginHost(host: string): string {
  return host.replace(/^www\./, "").toLowerCase();
}

export function publicSiteCanonical(
  siteSlug: string,
  pageSlug?: string | null,
  host?: string,
): string | undefined {
  const origin =
    (host ? `https://${normalizeOriginHost(host)}` : undefined) ||
    CANONICAL_ORIGIN_BY_SLUG[siteSlug];
  if (!origin) return undefined;
  if (!pageSlug || pageSlug === "home") return origin;
  return `${origin}/${pageSlug.replace(/^\/+/, "")}`;
}

export function publicPagePath(pageSlug: string, intent?: string | null): string {
  if (!pageSlug || pageSlug === "home" || intent === "home") return "/";
  return `/${pageSlug.replace(/^\/+/, "")}`;
}

function resolveOgType(siteSlug: string, pageSlug: string, schemaType?: string | null) {
  if (schemaType === "article" || classifyDgPageSlug(pageSlug) === "insight") {
    return "article" as const;
  }
  return "website" as const;
}

function resolveIndexable(input: PublicPageSeoInput): boolean {
  if (input.noindex) return false;
  if (input.siteSlug === "digitalgate" && !dgPageShouldIndex(input.pageSlug)) {
    return false;
  }
  return true;
}

export function publicPageMetadata(input: PublicPageSeoInput): Metadata {
  const title = decodeHtmlEntities(input.title || input.siteName);
  const description = input.description || input.siteName;
  const ogTitle = decodeHtmlEntities(input.ogTitle || title);
  const ogDescription = input.ogDescription || description;
  const ogImage = publicOgImageForSlug(input.siteSlug, input.ogImage);
  const icons = publicSiteIcons(input.siteSlug, input.iconUrl);
  const keywords = input.keywords?.filter(Boolean);
  const canonical = publicSiteCanonical(
    input.siteSlug,
    input.pageSlug,
    input.canonicalHost,
  );
  const indexable = resolveIndexable(input);
  const ogType = resolveOgType(input.siteSlug, input.pageSlug, input.schemaType);

  const verification: Metadata["verification"] = {};
  if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()) {
    verification.google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION.trim();
  }
  if (process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim()) {
    verification.other = {
      ...(verification.other ?? {}),
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION.trim(),
    };
  }

  return {
    title,
    description,
    applicationName: input.siteName,
    ...(keywords?.length ? { keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(icons ? { icons } : {}),
    ...(Object.keys(verification).length ? { verification } : {}),
    robots: indexable
      ? { index: true, follow: true, googleBot: { index: true, follow: true } }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: {
      type: ogType,
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
      locale: input.siteSlug === "wantd" ? "en_NZ" : "en_AU",
      siteName: input.siteName,
      ...(ogType === "article" && input.publishedAt
        ? { publishedTime: input.publishedAt }
        : {}),
      ...(ogType === "article" && input.modifiedAt
        ? { modifiedTime: input.modifiedAt }
        : {}),
      ...(ogType === "article" && input.authorName
        ? { authors: [input.authorName] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}

function breadcrumbJsonLd(
  origin: string,
  crumbs: Array<{ name: string; path: string }>,
  pageTitle: string,
  pagePath: string,
) {
  const items = [
    ...crumbs.map((c, i) => ({
      "@type": "ListItem" as const,
      position: i + 1,
      name: c.name,
      item: `${origin}${c.path === "/" ? "/" : c.path}`,
    })),
    {
      "@type": "ListItem" as const,
      position: crumbs.length + 1,
      name: pageTitle,
      item: `${origin}${pagePath}`,
    },
  ];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function articleJsonLd(input: {
  origin: string;
  pagePath: string;
  headline: string;
  description: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  authorName?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    author: {
      "@type": "Person",
      name: input.authorName || "Ben Roe",
      jobTitle: "Founder & Platform Architect",
      worksFor: { "@type": "Organization", name: "DigitalGate" },
    },
    publisher: {
      "@type": "Organization",
      name: "DigitalGate",
      url: DIGITALGATE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: DG_ORGANIZATION.logo,
      },
    },
    ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
    ...(input.modifiedAt ? { dateModified: input.modifiedAt } : {}),
    mainEntityOfPage: `${input.origin}${input.pagePath}`,
    inLanguage: "en-AU",
  };
}

function softwareApplicationJsonLd(input: {
  origin: string;
  pagePath: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: input.description,
    url: `${input.origin}${input.pagePath}`,
    provider: {
      "@type": "Organization",
      name: "DigitalGate",
      url: DIGITALGATE_ORIGIN,
    },
  };
}

export function digitalgateOrganizationJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: DG_ORGANIZATION.name,
    legalName: DG_ORGANIZATION.legalName,
    url: DG_ORGANIZATION.url,
    logo: DG_ORGANIZATION.logo,
    description: DG_ORGANIZATION.description,
    email: DG_ORGANIZATION.email,
    telephone: DG_ORGANIZATION.telephone,
    address: {
      "@type": "PostalAddress",
      addressLocality: DG_ORGANIZATION.address.locality,
      addressRegion: DG_ORGANIZATION.address.region,
      addressCountry: DG_ORGANIZATION.address.country,
    },
    founder: {
      "@type": "Person",
      name: DG_ORGANIZATION.founder,
    },
    sameAs: DG_ORGANIZATION.sameAs,
  };
}

export function digitalgateWebSiteJsonLd(origin: string): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DigitalGate",
    url: origin,
    description: DG_ORGANIZATION.description,
    inLanguage: "en-AU",
    publisher: {
      "@type": "Organization",
      name: "DigitalGate",
      url: DIGITALGATE_ORIGIN,
    },
  };
}

export function publicPageJsonLdGraph(input: {
  siteSlug: string;
  pageSlug: string;
  pageTitle: string;
  description: string;
  canonicalHost: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  authorName?: string | null;
  schemaType?: string | null;
}): object[] {
  if (input.siteSlug !== "digitalgate") {
    const wantd = publicSiteJsonLd("wantd");
    return input.siteSlug === "wantd" && wantd ? [wantd] : [];
  }

  const origin = `https://${normalizeOriginHost(input.canonicalHost)}`;
  const path = publicPagePath(input.pageSlug);
  const kind: DgPageKind = classifyDgPageSlug(input.pageSlug);
  const graph: object[] = [];

  if (input.pageSlug === "home" || !input.pageSlug) {
    graph.push(digitalgateOrganizationJsonLd());
    graph.push(digitalgateWebSiteJsonLd(origin));
  }

  const crumbs = dgBreadcrumbs(input.pageSlug);
  if (kind !== "home" && crumbs.length) {
    graph.push(
      breadcrumbJsonLd(origin, crumbs, input.pageTitle, path),
    );
  }

  if (kind === "insight" || input.schemaType === "article") {
    graph.push(
      articleJsonLd({
        origin,
        pagePath: path,
        headline: input.pageTitle,
        description: input.description,
        publishedAt: input.publishedAt,
        modifiedAt: input.modifiedAt,
        authorName: input.authorName,
      }),
    );
  }

  const productName = dgGrowthProductName(input.pageSlug);
  if (kind === "growth" && productName && input.pageSlug !== "growth") {
    graph.push(
      softwareApplicationJsonLd({
        origin,
        pagePath: path,
        name: productName,
        description: input.description,
      }),
    );
  }

  return graph;
}

export function publicSiteJsonLd(siteSlug: string): object | null {
  if (siteSlug !== "wantd") return null;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Wantd",
        url: "https://wantd.co.nz",
        email: "hello@wantdproperty.com.au",
        description:
          "Demand-first marketplace. Post what you WANT — Wantd matches supply. Property Wants live in New Zealand and Australia.",
        areaServed: ["NZ", "AU"],
        sameAs: ["https://wantdproperty.com.au"],
      },
      {
        "@type": "WebSite",
        name: "Wantd",
        url: "https://wantd.co.nz",
        inLanguage: "en-NZ",
      },
    ],
  };
}

export function jsonLdScriptHtml(graph: object[]): string | null {
  if (!graph.length) return null;
  const payload =
    graph.length === 1
      ? graph[0]
      : { "@context": "https://schema.org", "@graph": graph };
  return JSON.stringify(payload);
}
