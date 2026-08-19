import { ensureHideawayCircleWebsitePage, getPublicStayUnit, getWebsiteBySlug, resolveFunnelTemplate, resolvePageChromeVisibility, resolveStayUnitSlug } from "@dg/platform-core";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { HideawayCircleCapture } from "@/components/websites/HideawayCircleCapture";
import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";
import { publicOgImageForSlug } from "@/lib/brand";
import {
  chromeFromSiteMetadata,
  decodeHtmlEntities,
  preparePublicChrome,
} from "@/lib/public-chrome";
import {
  isRetiredPublicOnboarding,
  PublicOnboardingRetired,
} from "@/components/founding/PublicOnboardingRetired";

type Props = {
  params: Promise<{ slug: string; pageSlug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const site = await getWebsiteBySlug(slug);
  if (!site) return { title: "Site" };
  const page = (site.pages ?? []).find((p) => p.slug === pageSlug);
  if (!page) return { title: site.name };
  const title = decodeHtmlEntities(
    page.seo?.title || `${page.title} | ${site.name}`,
  );
  const description =
    page.seo?.description || site.seo?.description || site.name;
  const ogTitle = decodeHtmlEntities(
    page.seo?.ogTitle || site.seo?.ogTitle || title,
  );
  const ogDescription =
    page.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = publicOgImageForSlug(
    slug,
    page.seo?.ogImage || site.seo?.ogImage,
  );
  const keywords = page.seo?.keywords?.length
    ? page.seo.keywords
    : site.seo?.keywords;
  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: [{ url: ogImage }],
    },
  };
}

export default async function PublicSitePage({ params, searchParams }: Props) {
  const { slug, pageSlug } = await params;
  const { preview } = await searchParams;
  const allowDraft = preview === "1";

  if (pageSlug === "home") {
    redirect(allowDraft ? `/sites/${slug}?preview=1` : `/sites/${slug}`);
  }

  if (pageSlug === "private-studio") {
    redirect(
      allowDraft
        ? `/sites/${slug}/garden-studio?preview=1`
        : `/sites/${slug}/garden-studio`,
    );
  }

  let site = await getWebsiteBySlug(slug);
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  let page = (site.pages ?? []).find((p) => p.slug === pageSlug);
  if (!page) {
    const aliases: Record<string, string> = {
      "free-property-appraisal": "property-appraisal",
      "property-appraisal-gold-coast": "property-appraisal",
      "free-buyer-consultation": "buyer-consultation",
      "private-studio": "garden-studio",
    };
    const aliased = aliases[pageSlug];
    if (aliased) page = (site.pages ?? []).find((p) => p.slug === aliased);
  }
  if (!page && pageSlug === "hideaway-circle" && slug === "currumbin-valley-hideaway") {
    const ensured = await ensureHideawayCircleWebsitePage({ siteSlug: slug });
    if (ensured.ok) {
      site = (await getWebsiteBySlug(slug)) || site;
      page = (site.pages ?? []).find((p) => p.slug === pageSlug);
    }
  }
  if (!page) notFound();

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
    (page.slug === "hideaway-circle" || slug === "currumbin-valley-hideaway-circle"
      ? "hideaway_circle"
      : null);
  const staySlug = resolveStayUnitSlug(page.slug);
  const stayUnit = staySlug
    ? await getPublicStayUnit(site.organisationId, staySlug)
    : null;
  const chromeDefaults = resolvePageChromeVisibility(page.slug, page.seo);
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
  const title = decodeHtmlEntities(page.seo?.title || `${page.title} | ${site.name}`);
  const description =
    page.seo?.description || site.seo?.description || site.name;
  const ogTitle = decodeHtmlEntities(page.seo?.ogTitle || site.seo?.ogTitle || title);
  const ogDescription =
    page.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = publicOgImageForSlug(
    slug,
    page.seo?.ogImage || site.seo?.ogImage,
  );

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
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
      {funnelTemplate === "hideaway_circle" ? (
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
      ) : isRetiredPublicOnboarding(slug, page.slug) ? (
        <div
          className="wb-root wb-html-page"
          style={{ minHeight: "100dvh", background: "#0A0E17" }}
        >
          <PublicOnboardingRetired />
        </div>
      ) : (
        <WebsitePageRenderer
          components={page.components}
          theme={theme}
          basePath={`/sites/${slug}`}
          siteSlug={slug}
          pageSlug={page.slug}
          chrome={chrome}
          stayUnit={stayUnit}
          showHeader={showHeader}
          showFooter={showFooter}
          funnelTemplate={funnelTemplate}
        />
      )}
    </>
  );
}
