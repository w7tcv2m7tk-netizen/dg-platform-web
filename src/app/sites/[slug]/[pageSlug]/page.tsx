import { ensureHideawayCircleWebsitePage, getPublicStayUnit, getWebsiteBySlug, resolveFunnelTemplate, resolvePageChromeVisibility, resolveStayUnitSlug } from "@dg/platform-core";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type SiteChrome = {
  headerHtml?: string;
  footerHtml?: string;
  stylesheets?: string[];
  navLinks?: Array<{ label: string; href: string }>;
  businessName?: string;
  tagline?: string;
  overlayHeader?: boolean;
  lightSurface?: boolean;
  headerCta?: { label: string; href: string; backgroundColor?: string };
};

function chromeFromSite(
  metadata: Record<string, unknown> | null | undefined,
): SiteChrome | null {
  if (!metadata || typeof metadata !== "object") return null;
  const chrome = metadata.chrome;
  if (!chrome || typeof chrome !== "object") return null;
  return chrome as SiteChrome;
}

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
  const title = page.seo?.title || `${page.title} | ${site.name}`;
  const description =
    page.seo?.description || site.seo?.description || site.name;
  const ogTitle = page.seo?.ogTitle || site.seo?.ogTitle || title;
  const ogDescription =
    page.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = page.seo?.ogImage || site.seo?.ogImage;
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
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
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
  if (!page && pageSlug === "hideaway-circle" && /currumbin|hideaway/i.test(slug)) {
    const ensured = await ensureHideawayCircleWebsitePage({ siteSlug: slug });
    if (ensured.ok) {
      site = (await getWebsiteBySlug(slug)) || site;
      page = (site.pages ?? []).find((p) => p.slug === pageSlug);
    }
  }
  if (!page) notFound();

  const theme = site.theme ?? {};
  const siteMeta = site.metadata as Record<string, unknown> | null | undefined;
  const chrome = chromeFromSite(siteMeta);
  const funnelTemplate = resolveFunnelTemplate({
    metadata: siteMeta,
    slug,
  });
  const staySlug = resolveStayUnitSlug(page.slug);
  const stayUnit = staySlug
    ? await getPublicStayUnit(site.organisationId, staySlug)
    : null;
  const chromeDefaults = resolvePageChromeVisibility(page.slug, page.seo);
  const showHeader =
    funnelTemplate === "business_audit" ||
    funnelTemplate === "property_report" ||
    page.slug === "hideaway-circle"
      ? false
      : chromeDefaults.showHeader;
  const showFooter =
    funnelTemplate === "business_audit" ||
    funnelTemplate === "property_report" ||
    page.slug === "hideaway-circle"
      ? false
      : chromeDefaults.showFooter;
  const title = page.seo?.title || `${page.title} | ${site.name}`;
  const description =
    page.seo?.description || site.seo?.description || site.name;
  const ogTitle = page.seo?.ogTitle || site.seo?.ogTitle || title;
  const ogDescription =
    page.seo?.ogDescription || site.seo?.ogDescription || description;
  const ogImage = page.seo?.ogImage || site.seo?.ogImage;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}
      {(chrome?.stylesheets ?? []).slice(0, 20).map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
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
    </>
  );
}
