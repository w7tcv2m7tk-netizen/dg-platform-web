import type { Metadata } from "next";

import { publicOgImageForSlug } from "@/lib/brand";
import { decodeHtmlEntities } from "@/lib/public-chrome";

const CANONICAL_ORIGIN_BY_SLUG: Record<string, string> = {
  wantd: "https://wantd.co.nz",
};

export function publicSiteCanonical(
  siteSlug: string,
  pageSlug?: string | null,
): string | undefined {
  const origin = CANONICAL_ORIGIN_BY_SLUG[siteSlug];
  if (!origin) return undefined;
  if (!pageSlug || pageSlug === "home") return origin;
  return `${origin}/${pageSlug.replace(/^\/+/, "")}`;
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

export function publicPageMetadata(input: {
  siteSlug: string;
  siteName: string;
  pageSlug?: string | null;
  title?: string | null;
  description?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  keywords?: string[] | null;
}): Metadata {
  const title = decodeHtmlEntities(input.title || input.siteName);
  const description = input.description || input.siteName;
  const ogTitle = decodeHtmlEntities(input.ogTitle || title);
  const ogDescription = input.ogDescription || description;
  const ogImage = publicOgImageForSlug(input.siteSlug, input.ogImage);
  const keywords = input.keywords?.filter(Boolean);
  const canonical = publicSiteCanonical(input.siteSlug, input.pageSlug);

  return {
    title,
    description,
    applicationName: input.siteName,
    ...(keywords?.length ? { keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      locale: input.siteSlug === "wantd" ? "en_NZ" : "en_AU",
      siteName: input.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
  };
}
