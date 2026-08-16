import { findDomainByHostname, getPublicStayUnit, getWebsiteBySlug, resolveFunnelTemplate, resolvePageChromeVisibility, resolveStayUnitSlug, ensureHideawayCircleWebsitePage } from "@dg/platform-core";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { BusinessAuditCapture } from "@/components/websites/BusinessAuditCapture";
import { PropertyReportCapture } from "@/components/websites/PropertyReportCapture";
import { WebsitePageRenderer } from "@/components/websites/WebsiteRenderer";
import { websiteRendererCss } from "@/components/websites/website-renderer-css";

type SiteChrome = {
  headerHtml?: string;
  footerHtml?: string;
  stylesheets?: string[];
  navLinks?: Array<{ label: string; href: string }>;
  businessName?: string;
  overlayHeader?: boolean;
  headerLayout?: "bar" | "stacked";
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

async function resolveRequestHost(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-dg-custom-host") ||
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    ""
  )
    .split(":")[0]
    .toLowerCase();
}

async function resolveHostSlug(): Promise<string | null> {
  const host = await resolveRequestHost();
  if (!host) return null;

  try {
    const match = await findDomainByHostname(host);
    if (match?.website?.slug) return match.website.slug;

    const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const match2 = await findDomainByHostname(alt);
    return match2?.website?.slug ?? null;
  } catch (err) {
    console.error("[by-host] domain lookup failed", err);
    throw new Error("SITE_DATABASE_UNAVAILABLE");
  }
}

const PAGE_SLUG_ALIASES: Record<string, string> = {
  "free-property-appraisal": "property-appraisal",
  "property-appraisal-gold-coast": "property-appraisal",
  "free-buyer-consultation": "buyer-consultation",
};

function resolvePage(
  site: NonNullable<Awaited<ReturnType<typeof getWebsiteBySlug>>>,
  pageSlug: string | undefined,
) {
  const pages = site.pages ?? [];
  if (!pageSlug) {
    return pages.find((p) => p.intent === "home" || p.slug === "home") || pages[0];
  }
  const aliased = PAGE_SLUG_ALIASES[pageSlug] || pageSlug;
  return (
    pages.find((p) => p.slug === aliased) ||
    pages.find((p) => p.slug === pageSlug) ||
    pages.find((p) => p.slug === pageSlug.replace(/^accommodation\//, "")) ||
    pages.find((p) => {
      const leaf = pageSlug.split("/").filter(Boolean).pop();
      return Boolean(leaf && p.slug === leaf);
    }) ||
    null
  );
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; page?: string }>;
}): Promise<Metadata> {
  try {
    const slug = await resolveHostSlug();
    if (!slug) return { title: "Site" };
    const search = await searchParams;
    const site = await getWebsiteBySlug(slug);
    if (!site) return { title: "Site" };
    const pageSlug = search.page ? decodeURIComponent(search.page) : undefined;
    const page = resolvePage(site, pageSlug);
    const title = page?.seo?.title || site.seo?.title || site.name;
    const description =
      page?.seo?.description || site.seo?.description || site.name;
    const ogTitle = page?.seo?.ogTitle || site.seo?.ogTitle || title;
    const ogDescription =
      page?.seo?.ogDescription || site.seo?.ogDescription || description;
    const ogImage = page?.seo?.ogImage || site.seo?.ogImage;
    const keywords = page?.seo?.keywords?.length
      ? page.seo.keywords
      : site.seo?.keywords;
    return {
      title,
      description,
      applicationName: site.name,
      ...(keywords?.length ? { keywords } : {}),
      openGraph: {
        title: ogTitle,
        description: ogDescription,
        ...(ogImage ? { images: [{ url: ogImage }] } : {}),
      },
    };
  } catch {
    return { title: "Site temporarily unavailable" };
  }
}

/**
 * Custom-hostname entry — middleware rewrites unknown hosts here.
 * Resolves InfrastructureDomain → Website and renders the public site at `/`.
 */
export default async function ByHostSitePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; page?: string }>;
}) {
  try {
    const slug = await resolveHostSlug();
    if (!slug) notFound();
    return await renderSite(slug, await searchParams);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "SITE_DATABASE_UNAVAILABLE" || /Can't reach database|P1001|P1017/i.test(message)) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#0b1220",
            color: "#e2e8f0",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Site temporarily unavailable
            </h1>
            <p style={{ color: "#94a3b8", maxWidth: "28rem", margin: "0 auto" }}>
              We couldn&apos;t reach the website database. Please try again in a minute.
            </p>
          </div>
        </main>
      );
    }
    throw err;
  }
}

async function renderSite(
  slug: string,
  search: { preview?: string; page?: string },
) {
  const allowDraft = search.preview === "1";
  let site: Awaited<ReturnType<typeof getWebsiteBySlug>>;
  try {
    site = await getWebsiteBySlug(slug);
  } catch (err) {
    console.error("[by-host] getWebsiteBySlug failed", err);
    throw new Error("SITE_DATABASE_UNAVAILABLE");
  }
  if (!site) notFound();
  if (!allowDraft && site.status !== "published") notFound();

  const pageSlug = search.page ? decodeURIComponent(search.page) : undefined;
  let page = resolvePage(site, pageSlug);
  if (
    !page &&
    pageSlug === "hideaway-circle" &&
    /currumbin|hideaway/i.test(slug)
  ) {
    const ensured = await ensureHideawayCircleWebsitePage({ siteSlug: slug });
    if (ensured.ok) {
      site = (await getWebsiteBySlug(slug)) || site;
      page = site ? resolvePage(site, pageSlug) : null;
    }
  }
  if (!page) notFound();

  if (pageSlug && page.slug === "home") {
    redirect("/");
  }

  const theme = site.theme ?? {};
  const siteMeta = site.metadata as Record<string, unknown> | null | undefined;
  const chrome = chromeFromSite(siteMeta);
  const hostname = await resolveRequestHost();
  const funnelTemplate =
    resolveFunnelTemplate({
      metadata: siteMeta,
      slug,
      hostname,
    }) ||
    (slug === "roe-realty-report" || page.slug === "property-report"
      ? "property_report"
      : slug === "digitalgate-audit" || page.slug === "business-audit"
        ? "business_audit"
        : null);
  const staySlug = resolveStayUnitSlug(page.slug);
  const stayUnit = staySlug
    ? await getPublicStayUnit(site.organisationId, staySlug)
    : null;
  const chromeDefaults = resolvePageChromeVisibility(page.slug, page.seo);
  const showHeader =
    funnelTemplate === "business_audit" || funnelTemplate === "property_report"
      ? false
      : chromeDefaults.showHeader;
  const showFooter =
    funnelTemplate === "business_audit" || funnelTemplate === "property_report"
      ? false
      : chromeDefaults.showFooter;

  return (
    <>
      {(chrome?.stylesheets ?? []).slice(0, 20).map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: websiteRendererCss }} />
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
            basePath=""
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
            basePath=""
            variant="funnel"
          />
        </div>
      ) : (
        <WebsitePageRenderer
          components={page.components ?? []}
          theme={theme}
          basePath=""
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
