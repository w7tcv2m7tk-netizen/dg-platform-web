import { getWebsiteBySlug, resolveFunnelTemplate, resolvePageChromeVisibility } from "@dg/platform-core";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BusinessAuditCapture } from "@/components/websites/BusinessAuditCapture";
import { HideawayCircleCapture } from "@/components/websites/HideawayCircleCapture";
import { PropertyReportCapture } from "@/components/websites/PropertyReportCapture";
import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";
import { publicOgImageForSlug } from "@/lib/brand";
import {
  chromeFromSiteMetadata,
  decodeHtmlEntities,
  preparePublicChrome,
} from "@/lib/public-chrome";
import {
  publicPageMetadata,
  publicSiteJsonLd,
} from "@/lib/public-website-seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

function resolveHome(site: NonNullable<Awaited<ReturnType<typeof getWebsiteBySlug>>>) {
  const pages = site.pages ?? [];
  return pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getWebsiteBySlug(slug);
  if (!site) return { title: "Site" };
  const home = resolveHome(site);
  return publicPageMetadata({
    siteSlug: slug,
    siteName: site.name,
    pageSlug: "home",
    title: home?.seo?.title || site.seo?.title || site.name,
    description: home?.seo?.description || site.seo?.description || site.name,
    ogTitle: home?.seo?.ogTitle || site.seo?.ogTitle,
    ogDescription: home?.seo?.ogDescription || site.seo?.ogDescription,
    ogImage: home?.seo?.ogImage || site.seo?.ogImage,
    iconUrl: (site.theme as { iconUrl?: string } | null | undefined)?.iconUrl,
    keywords: home?.seo?.keywords?.length
      ? home.seo.keywords
      : site.seo?.keywords,
  });
}

export default async function PublicSiteHomePage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const search = await searchParams;
  const allowDraft = search.preview === "1";

  const site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const home = resolveHome(site);
  if (!home) notFound();

  const theme = site.theme ?? {};
  const siteMeta = site.metadata as Record<string, unknown> | null | undefined;
  const preparedChrome = preparePublicChrome(chromeFromSiteMetadata(siteMeta));
  const chromeCss = preparedChrome?.chromeCss;
  const chrome = preparedChrome
    ? { ...preparedChrome, chromeCss: undefined }
    : null;
  const funnelTemplate =
    resolveFunnelTemplate({
      metadata: siteMeta,
      slug,
    }) ||
    (slug === "roe-realty-report" || home.slug === "property-report"
      ? "property_report"
      : slug === "digitalgate-audit" || home.slug === "business-audit"
        ? "business_audit"
        : slug === "currumbin-valley-hideaway-circle" ||
            home.slug === "hideaway-circle"
          ? "hideaway_circle"
          : null);
  const title = decodeHtmlEntities(home.seo?.title || site.seo?.title || site.name);
  const description =
    home.seo?.description || site.seo?.description || site.name;
  const ogTitle = decodeHtmlEntities(home.seo?.ogTitle || site.seo?.ogTitle || title);
  const ogDescription =
    home.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = publicOgImageForSlug(
    slug,
    home.seo?.ogImage || site.seo?.ogImage,
  );
  const chromeDefaults = resolvePageChromeVisibility(home.slug, home.seo);
  const showHeader =
    funnelTemplate === "business_audit" ||
    funnelTemplate === "property_report" ||
    funnelTemplate === "hideaway_circle"
      ? false
      : chromeDefaults.showHeader;
  const showFooter =
    funnelTemplate === "business_audit" ||
    funnelTemplate === "property_report" ||
    funnelTemplate === "hideaway_circle"
      ? false
      : chromeDefaults.showFooter;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {home.seo?.keywords?.length || site.seo?.keywords?.length ? (
        <meta
          name="keywords"
          content={(home.seo?.keywords?.length
            ? home.seo.keywords
            : site.seo?.keywords ?? []
          ).join(", ")}
        />
      ) : null}
      {publicSiteJsonLd(slug) ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(publicSiteJsonLd(slug)),
          }}
        />
      ) : null}
      {(funnelTemplate === "hideaway_circle"
        ? []
        : chrome?.stylesheets ?? []
      )
        .slice(0, 20)
        .map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
      {chromeCss ? (
        <style id="wb-chrome-css" dangerouslySetInnerHTML={{ __html: chromeCss }} />
      ) : null}
      {allowDraft && site.status !== "published" ? (
        <div
          style={{
            background: "#92400e",
            color: "#fff",
            textAlign: "center",
            padding: "0.5rem",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.85rem",
          }}
        >
          Preview · draft — not published
        </div>
      ) : null}
      {funnelTemplate === "property_report" ? (
        <div
          className="wb-root wb-html-page wb-full-bleed wb-product-funnel"
          style={
            {
              ["--wb-primary"]: theme.primaryColor || "#C9A46C",
              ["--wb-accent"]: theme.accentColor || "#1C2B2A",
              ["--wb-bg"]: theme.backgroundColor || "#1C2B2A",
              minHeight: "100dvh",
              width: "100%",
              margin: 0,
              padding: 0,
              background: "#1C2B2A",
            } as CSSProperties
          }
        >
          <PropertyReportCapture
            siteSlug={slug}
            basePath={`/sites/${slug}`}
            variant="funnel"
          />
        </div>
      ) : funnelTemplate === "business_audit" ? (
        <div
          className="wb-root wb-html-page wb-full-bleed wb-product-funnel"
          style={
            {
              ["--wb-primary"]: theme.primaryColor || "#3B82F6",
              ["--wb-accent"]: theme.accentColor || "#10B981",
              ["--wb-bg"]: theme.backgroundColor || "#0A0E17",
              minHeight: "100dvh",
              width: "100%",
              margin: 0,
              padding: 0,
              background: "#0A0E17",
            } as CSSProperties
          }
        >
          <BusinessAuditCapture
            siteSlug={slug}
            basePath={`/sites/${slug}`}
            variant="funnel"
          />
        </div>
      ) : funnelTemplate === "hideaway_circle" ? (
        <div
          className="wb-root wb-html-page wb-full-bleed wb-product-funnel"
          style={
            {
              ["--wb-primary"]: theme.primaryColor || "#B9A48A",
              ["--wb-accent"]: theme.accentColor || "#2C4137",
              ["--wb-bg"]: theme.backgroundColor || "#0c1612",
              minHeight: "100dvh",
              width: "100%",
              margin: 0,
              padding: 0,
              background: "#0c1612",
            } as CSSProperties
          }
        >
          <HideawayCircleCapture
            siteSlug={slug}
            basePath=""
            variant="funnel"
          />
        </div>
      ) : (
        <WebsitePageRenderer
          components={home.components}
          theme={theme}
          basePath={`/sites/${slug}`}
          siteSlug={slug}
          pageSlug={home.slug}
          chrome={chrome}
          showHeader={showHeader}
          showFooter={showFooter}
          funnelTemplate={funnelTemplate}
        />
      )}
    </>
  );
}
